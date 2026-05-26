from app.database import engine
from sqlalchemy import text

def run_migrations():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE vehicles ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;"))
            print("Added updated_at to vehicles")
        except Exception as e:
            print("Could not add updated_at to vehicles:", e)

        try:
            conn.execute(text("ALTER TABLE vehicle_activity_logs ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;"))
            print("Added updated_at to vehicle_activity_logs")
        except Exception as e:
            print("Could not add updated_at to vehicle_activity_logs:", e)
            
        try:
            conn.execute(text("ALTER TABLE transactions ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;"))
            print("Added updated_at to transactions")
        except Exception as e:
            print("Could not add updated_at to transactions:", e)
            
        try:
            conn.execute(text("ALTER TABLE transactions ADD COLUMN reference_number VARCHAR(100) UNIQUE NULL;"))
            print("Added reference_number to transactions")
        except Exception as e:
            print("Could not add reference_number to transactions:", e)
            
        try:
            conn.execute(text("ALTER TABLE transactions ADD COLUMN balance_before DECIMAL(10,2) NULL;"))
            print("Added balance_before to transactions")
        except Exception as e:
            print("Could not add balance_before to transactions:", e)

        try:
            conn.execute(text("ALTER TABLE transactions ADD COLUMN balance_after DECIMAL(10,2) NULL;"))
            print("Added balance_after to transactions")
        except Exception as e:
            print("Could not add balance_after to transactions:", e)

        conn.commit()

if __name__ == "__main__":
    run_migrations()
