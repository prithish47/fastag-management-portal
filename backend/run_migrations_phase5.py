from app.database import engine
from sqlalchemy import text

def run_migrations():
    with engine.connect() as conn:
        print("Running migration phase 5...")
        
        # 1. Add low_balance_alert_enabled
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN low_balance_alert_enabled BOOLEAN DEFAULT FALSE;"))
            print("Added column low_balance_alert_enabled to users table.")
        except Exception as e:
            print("Could not add low_balance_alert_enabled (it may already exist):", e)

        # 2. Add low_balance_threshold
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN low_balance_threshold DECIMAL(10, 2) DEFAULT 100.00;"))
            print("Added column low_balance_threshold to users table.")
        except Exception as e:
            print("Could not add low_balance_threshold (it may already exist):", e)

        # 3. Add password_reset_token
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN password_reset_token VARCHAR(255) NULL;"))
            print("Added column password_reset_token to users table.")
        except Exception as e:
            print("Could not add password_reset_token (it may already exist):", e)

        # 4. Add password_reset_expires
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN password_reset_expires DATETIME NULL;"))
            print("Added column password_reset_expires to users table.")
        except Exception as e:
            print("Could not add password_reset_expires (it may already exist):", e)

        # 5. Create index on password_reset_token
        try:
            conn.execute(text("CREATE INDEX idx_password_reset_token ON users (password_reset_token);"))
            print("Created index idx_password_reset_token on users table.")
        except Exception as e:
            print("Could not create index idx_password_reset_token:", e)

        conn.commit()
        print("Migration phase 5 completed successfully.")

if __name__ == "__main__":
    run_migrations()
