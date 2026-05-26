from app.database import engine, Base
from sqlalchemy import text
from app.models.notification_model import Notification
from app.models.transaction_model import Transaction

def run_migrations():
    print("Creating new tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created.")

    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE transactions ADD COLUMN payment_method VARCHAR(50) NULL;"))
            print("Added payment_method to transactions")
        except Exception as e:
            print("Could not add payment_method:", e)
        
        conn.commit()

if __name__ == "__main__":
    run_migrations()
