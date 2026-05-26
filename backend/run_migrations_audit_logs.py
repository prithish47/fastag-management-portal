from app.database import engine, Base
from app.models.audit_log_model import AuditLog

def run_migrations():
    print("Running migration for audit logs table...")
    try:
        # Create audit_logs table using SQLAlchemy
        Base.metadata.create_all(bind=engine, tables=[AuditLog.__table__])
        print("[OK] audit_logs table created successfully.")
    except Exception as e:
        print("[ERROR] Failed to create audit_logs table:", e)

if __name__ == "__main__":
    run_migrations()
