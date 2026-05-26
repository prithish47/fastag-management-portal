from sqlalchemy import text
from app.database import engine

def run_migrations():
    print("Running migration to add attachment support to support_messages...")
    with engine.connect() as conn:
        try:
            # Add attachment_path
            conn.execute(text("ALTER TABLE support_messages ADD COLUMN attachment_path VARCHAR(255) NULL;"))
            print("[OK] Added attachment_path column to support_messages.")
        except Exception as e:
            print("[INFO] attachment_path column might already exist or error:", e)

        try:
            # Add attachment_name
            conn.execute(text("ALTER TABLE support_messages ADD COLUMN attachment_name VARCHAR(255) NULL;"))
            print("[OK] Added attachment_name column to support_messages.")
        except Exception as e:
            print("[INFO] attachment_name column might already exist or error:", e)
        
        conn.commit()
    print("Migration complete.")

if __name__ == "__main__":
    run_migrations()
