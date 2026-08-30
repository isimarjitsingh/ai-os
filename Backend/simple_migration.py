"""
Simple PostgreSQL migration script to add user_id column to projects table
Run this from the backend directory with: python simple_migration.py
"""

import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def add_user_id_column():
    """Add user_id column to projects table if it doesn't exist"""
    
    # Get database connection details from environment
    db_url = os.getenv("DATABASE_URL")

    if not db_url:
        print("ERROR: DATABASE_URL not found in environment variables")
        return
    
    try:
        # Parse DATABASE_URL (format: postgresql://user:password@host:port/database)
        # For simplicity, we'll extract from the URL
        if db_url.startswith("postgresql://"):
            db_url = db_url.replace("postgresql://", "")
        
        parts = db_url.split("@")
        if len(parts) == 2:
            user_pass = parts[0]
            host_db = parts[1]
            
            user, password = user_pass.split(":")
            host_port, database = host_db.split("/")
            
            if ":" in host_port:
                host, port = host_port.split(":")
            else:
                host = host_port
                port = "5432"
        else:
            print("ERROR: Invalid DATABASE_URL format")
            return
        
        # Connect to database
        conn = psycopg2.connect(
            host=host,
            port=port,
            database=database,
            user=user,
            password=password
        )
        
        cursor = conn.cursor()
        
        # Check if column already exists
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'projects' 
            AND column_name = 'user_id'
        """)
        
        if cursor.fetchone():
            print("OK: user_id column already exists in projects table")
            conn.close()
            return

        # Add the column
        cursor.execute("""
            ALTER TABLE projects
            ADD COLUMN user_id INTEGER REFERENCES users(id)
        """)

        conn.commit()
        print("OK: Successfully added user_id column to projects table")

        # Create index on user_id for better performance
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS ix_projects_user_id
            ON projects(user_id)
        """)

        conn.commit()
        print("OK: Successfully created index on user_id column")

        # Set existing projects to belong to a default user (user_id=1 if exists)
        cursor.execute("SELECT id FROM users LIMIT 1")
        default_user = cursor.fetchone()

        if default_user:
            default_user_id = default_user[0]
            cursor.execute(f"""
                UPDATE projects
                SET user_id = {default_user_id}
                WHERE user_id IS NULL
            """)
            conn.commit()
            print(f"OK: Updated existing projects to belong to user {default_user_id}")

        conn.close()
        print("OK: Migration completed successfully")
        
    except Exception as e:
        print(f"ERROR: Error during migration: {e}")
        if 'conn' in locals():
            conn.close()
        raise

if __name__ == "__main__":
    add_user_id_column()