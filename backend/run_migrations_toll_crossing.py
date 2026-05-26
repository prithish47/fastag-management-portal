from app.database import engine, Base
from sqlalchemy import text
from app.models.vehicle_model import Vehicle
from app.models.transaction_model import Transaction
from app.models.toll_crossing_model import TollCrossing


def run_migrations():
    print("Running migration for toll crossing simulation...")
    
    # 1. Alter transactions table to add failure_reason
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE transactions ADD COLUMN failure_reason VARCHAR(255) NULL;"))
            print("[OK] Added failure_reason column to transactions table.")
        except Exception as e:
            print("[INFO] Could not add failure_reason column to transactions (it may already exist):", e)
        conn.commit()

    # 2. Create toll_crossings table
    try:
        Base.metadata.create_all(
            bind=engine,
            tables=[TollCrossing.__table__]
        )
        print("[OK] toll_crossings table created successfully.")
    except Exception as e:
        print("[ERROR] Failed to create toll_crossings table:", e)


if __name__ == "__main__":
    run_migrations()
