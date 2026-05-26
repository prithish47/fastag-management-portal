from app.database import engine
from sqlalchemy import text

def run_migrations():
    with engine.connect() as conn:
        try:
            # Change rc_file_path to rc_document_path
            conn.execute(text("ALTER TABLE vehicles CHANGE rc_file_path rc_document_path VARCHAR(255) NULL;"))
            print("Renamed rc_file_path to rc_document_path")
        except Exception as e:
            print("Could not rename rc_file_path:", e)

        try:
            # Change verification_status to rc_verification_status
            conn.execute(text("ALTER TABLE vehicles CHANGE verification_status rc_verification_status VARCHAR(30) DEFAULT 'PENDING';"))
            print("Renamed verification_status to rc_verification_status")
        except Exception as e:
            print("Could not rename verification_status:", e)

        try:
            # Add rc_uploaded_at
            conn.execute(text("ALTER TABLE vehicles ADD COLUMN rc_uploaded_at DATETIME NULL;"))
            print("Added rc_uploaded_at column")
        except Exception as e:
            print("Could not add rc_uploaded_at:", e)
            
        conn.commit()

if __name__ == "__main__":
    run_migrations()
