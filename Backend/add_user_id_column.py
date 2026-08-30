"""
Migration script to add user_id column to projects table
Run this from the backend directory with: python add_user_id_column.py
"""

import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database.database import engine
from sqlalchemy import text

def add_user_id_column():
    """Add user_id column to projects table if it doesn't exist"""
    
    try:
        with engine.connect() as conn:
            # Check if column already exists
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'projects' 
                AND column_name = 'user_id'
            """))
            
            if result.fetchone():
                print("✅ user_id column already exists in projects table")
                return
            
            # Add the column
            conn.execute(text("""
                ALTER TABLE projects 
                ADD COLUMN user_id INTEGER REFERENCES users(id)
            """))
            
            conn.commit()
            print("✅ Successfully added user_id column to projects table")
            
            # Create index on user_id for better performance
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_projects_user_id 
                ON projects(user_id)
            """))
            
            conn.commit()
            print("✅ Successfully created index on user_id column")
            
    except Exception as e:
        print(f"❌ Error adding user_id column: {e}")
        raise

if __name__ == "__main__":
    add_user_id_column()