from app.database import engine
from sqlalchemy import text

def run_migrations():
    with engine.connect() as conn:
        print("Running migration phase 4...")
        
        # 1. Add rc_front_path
        try:
            conn.execute(text("ALTER TABLE vehicles ADD COLUMN rc_front_path VARCHAR(255) NULL;"))
            print("Added column rc_front_path to vehicles table.")
        except Exception as e:
            print("Could not add rc_front_path:", e)

        # 2. Add rc_back_path
        try:
            conn.execute(text("ALTER TABLE vehicles ADD COLUMN rc_back_path VARCHAR(255) NULL;"))
            print("Added column rc_back_path to vehicles table.")
        except Exception as e:
            print("Could not add rc_back_path:", e)

        # 3. Copy existing rc_document_path values to rc_front_path
        try:
            conn.execute(text("UPDATE vehicles SET rc_front_path = rc_document_path WHERE rc_document_path IS NOT NULL;"))
            print("Copied existing rc_document_path data to rc_front_path.")
        except Exception as e:
            print("Could not copy existing data to rc_front_path:", e)

        # 4. Drop rc_document_path
        try:
            conn.execute(text("ALTER TABLE vehicles DROP COLUMN rc_document_path;"))
            print("Dropped column rc_document_path from vehicles table.")
        except Exception as e:
            print("Could not drop rc_document_path:", e)

        conn.commit()
        print("Migration phase 4 completed successfully.")

if __name__ == "__main__":
    run_migrations()
