"""
Script to fix NULL user_id values in existing projects
"""

import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def fix_null_user_ids():
    """Update projects with NULL user_id to belong to the first available user"""

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

        # Check for projects with NULL user_id
        cursor.execute("""
            SELECT COUNT(*)
            FROM projects
            WHERE user_id IS NULL
        """)

        null_count = cursor.fetchone()[0]

        if null_count == 0:
            print("OK: No projects with NULL user_id found")
            conn.close()
            return

        print(f"Found {null_count} projects with NULL user_id")

        # Get the first available user
        cursor.execute("""
            SELECT id, name, email
            FROM users
            ORDER BY id
            LIMIT 1
        """)

        user = cursor.fetchone()

        if not user:
            print("ERROR: No users found in database. Cannot assign projects.")
            conn.close()
            return

        user_id, user_name, user_email = user
        print(f"Assigning projects to user: {user_name} ({user_email}) - ID: {user_id}")

        # Update all projects with NULL user_id
        cursor.execute(f"""
            UPDATE projects
            SET user_id = {user_id}
            WHERE user_id IS NULL
        """)

        conn.commit()

        print(f"OK: Successfully updated {null_count} projects")

        # Verify the update
        cursor.execute("""
            SELECT COUNT(*)
            FROM projects
            WHERE user_id IS NULL
        """)

        remaining_null = cursor.fetchone()[0]

        if remaining_null == 0:
            print("OK: All projects now have valid user_id")
        else:
            print(f"WARNING: {remaining_null} projects still have NULL user_id")

        conn.close()

    except Exception as e:
        print(f"ERROR: {e}")
        if 'conn' in locals():
            conn.close()
        raise

if __name__ == "__main__":
    fix_null_user_ids()