from app.database import engine, Base
from app.models.support_ticket_model import SupportTicket
from app.models.support_message_model import SupportMessage


def run_migrations():
    print("Running migration for support ticketing tables...")
    try:
        Base.metadata.create_all(
            bind=engine,
            tables=[SupportTicket.__table__, SupportMessage.__table__]
        )
        print("[OK] support_tickets table created successfully.")
        print("[OK] support_messages table created successfully.")
    except Exception as e:
        print("[ERROR] Failed to create support tables:", e)


if __name__ == "__main__":
    run_migrations()
