from database import engine
from sqlmodel import SQLModel
from sqlalchemy import text
import models  # This ensures all models are loaded into SQLModel.metadata

def migrate():
    with engine.connect() as conn:
        print("Migrating user_profiles...")
        try:
            conn.execute(text("ALTER TABLE user_profiles ADD COLUMN level INTEGER DEFAULT 1"))
            print("Added column 'level'")
        except Exception as e:
            print("Column 'level' might already exist or error:", e)
            conn.rollback() # Rollback the failed transaction block so we can continue

        try:
            conn.execute(text("ALTER TABLE user_profiles ADD COLUMN current_exp INTEGER DEFAULT 0"))
            print("Added column 'current_exp'")
        except Exception as e:
            print("Column 'current_exp' might already exist or error:", e)
            conn.rollback()
            
        conn.commit()
    
    print("Creating new tables if they don't exist...")
    # This will create user_achievements, user_inventories, enterprise_quests, user_explored_areas
    SQLModel.metadata.create_all(engine)
    print("Migration completed successfully.")

if __name__ == "__main__":
    migrate()
