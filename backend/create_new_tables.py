from app.database import engine, Base
from app.models.transaction_model import Transaction
from app.models.activity_log_model import VehicleActivityLog

def create_tables():
    print("Creating missing tables in database...")
    Base.metadata.create_all(bind=engine)
    print("Done!")

if __name__ == "__main__":
    create_tables()
