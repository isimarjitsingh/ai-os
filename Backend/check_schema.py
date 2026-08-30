"""
Script to check the actual schema of the projects table
"""

import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def check_projects_schema():
    """Check the schema of the projects table"""

    # Get database connection details from environment
    db_url = os.getenv("DATABASE_URL")

    if not db_url:
        print("ERROR: DATABASE_URL not found in environment variables")
        return

    try:
        # Parse DATABASE_URL
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

        # Get all columns in projects table
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'projects'
            ORDER BY ordinal_position
        """)

        columns = cursor.fetchall()

        print("Current schema of projects table:")
        print("-" * 50)
        for col in columns:
            print(f"  {col[0]}: {col[1]} (nullable: {col[2]})")

        print("-" * 50)

        # Check specifically for user_id
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'projects'
            AND column_name = 'user_id'
        """)

        user_id_exists = cursor.fetchone()

        if user_id_exists:
            print("OK: user_id column EXISTS in projects table")
        else:
            print("ERROR: user_id column DOES NOT EXIST in projects table")

        # Check foreign key constraints
        cursor.execute("""
            SELECT
                tc.constraint_name,
                tc.constraint_type,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            LEFT JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE tc.table_name = 'projects'
            AND tc.constraint_type = 'FOREIGN KEY'
        """)

        foreign_keys = cursor.fetchall()

        print("\nForeign key constraints:")
        print("-" * 50)
        if foreign_keys:
            for fk in foreign_keys:
                print(f"  {fk[0]}: {fk[2]} -> {fk[3]}.{fk[4]}")
        else:
            print("  No foreign key constraints found")

        conn.close()

    except Exception as e:
        print(f"ERROR: {e}")
        if 'conn' in locals():
            conn.close()
        raise

if __name__ == "__main__":
    check_projects_schema()