"""
Admin Operations Portal — Database Migration & Seed Script
============================================================
Run once to:
  1. Add 'role' and 'account_status' columns to users table
  2. Create 'fastag_inventory' table
  3. Seed an initial admin user
  4. Seed 45 simulated FASTag inventory records
"""
import os
import sys
import random
from datetime import datetime, timedelta

# Ensure the backend directory is on the path
sys.path.insert(0, os.path.dirname(__file__))

from app.database import engine, Base
from app.models.user_model import User
from app.models.vehicle_model import Vehicle
from app.models.fastag_inventory_model import FastagInventory
from app.auth.password_handler import hash_password
from sqlalchemy import text
from sqlalchemy.orm import Session


# ─── FASTag ID Generator ──────────────────────────────────────────────────────
def generate_fastag_id():
    """Generate a realistic 12-digit FASTag ID starting with '31'."""
    suffix = ''.join([str(random.randint(0, 9)) for _ in range(10)])
    return f"31{suffix}"


def generate_serial_number():
    """Generate a tag serial number like NETC-FT-XXXXXXXX."""
    chars = ''.join([str(random.randint(0, 9)) for _ in range(8)])
    return f"NETC-FT-{chars}"


# ─── Migration ─────────────────────────────────────────────────────────────────
def run_migrations():
    print("=" * 60)
    print("ADMIN PORTAL MIGRATION")
    print("=" * 60)

    with engine.connect() as conn:
        # 1. Add role column
        try:
            conn.execute(text(
                "ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'USER';"
            ))
            print("[OK] Added 'role' column to users table")
        except Exception as e:
            print(f"[SKIP] role column: {e}")

        # 2. Add account_status column
        try:
            conn.execute(text(
                "ALTER TABLE users ADD COLUMN account_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';"
            ))
            print("[OK] Added 'account_status' column to users table")
        except Exception as e:
            print(f"[SKIP] account_status column: {e}")

        conn.commit()

    # 3. Create fastag_inventory table via SQLAlchemy metadata
    print("\nCreating fastag_inventory table...")
    Base.metadata.create_all(bind=engine, tables=[FastagInventory.__table__])
    print("[OK] fastag_inventory table created")


# ─── Seed Admin User ──────────────────────────────────────────────────────────
def seed_admin_user():
    print("\n" + "=" * 60)
    print("SEEDING ADMIN USER")
    print("=" * 60)

    from app.database import SessionLocal
    db = SessionLocal()

    try:
        existing = db.query(User).filter(User.email == "admin@gitechnology.in").first()
        if existing:
            # Update to admin if not already
            existing.role = "ADMIN"
            existing.account_status = "ACTIVE"
            db.commit()
            print(f"[OK] Existing user updated to ADMIN: admin@gitechnology.in")
        else:
            admin = User(
                full_name="System Administrator",
                email="admin@gitechnology.in",
                mobile_number="9000000001",
                password_hash=hash_password("Admin@2026"),
                address="GI Technology HQ, Bengaluru",
                wallet_balance=0.00,
                role="ADMIN",
                account_status="ACTIVE"
            )
            db.add(admin)
            db.commit()
            print(f"[OK] Admin user created")

        print()
        print("  +-------------------------------------------+")
        print("  |  ADMIN CREDENTIALS                        |")
        print("  |                                           |")
        print("  |  Email:    admin@gitechnology.in          |")
        print("  |  Password: Admin@2026                     |")
        print("  |  Role:     ADMIN                          |")
        print("  |                                           |")
        print("  +-------------------------------------------+")
    finally:
        db.close()


# ─── Seed FASTag Inventory ─────────────────────────────────────────────────────
def seed_fastag_inventory():
    print("\n" + "=" * 60)
    print("SEEDING FASTAG INVENTORY (45 TAGS)")
    print("=" * 60)

    from app.database import SessionLocal
    db = SessionLocal()

    try:
        existing_count = db.query(FastagInventory).count()
        if existing_count > 0:
            print(f"[SKIP] FASTag inventory already has {existing_count} records")
            return

        vehicle_classes = ["VC4", "VC5", "VC6", "VC7", "VC12", "VC16"]

        # Get existing vehicles to assign some tags
        vehicles = db.query(Vehicle).all()
        assigned_vehicle_ids = []

        # Status distribution: 20 unassigned, 10 assigned, 8 blacklisted, 5 damaged, 2 disabled
        status_distribution = (
            ["UNASSIGNED"] * 20 +
            ["ASSIGNED"] * 10 +
            ["BLACKLISTED"] * 8 +
            ["DAMAGED"] * 5 +
            ["DISABLED"] * 2
        )
        random.shuffle(status_distribution)

        used_fastag_ids = set()
        used_serials = set()
        tags_created = 0
        assigned_count = 0

        for i in range(45):
            # Generate unique FASTag ID
            fastag_id = generate_fastag_id()
            while fastag_id in used_fastag_ids:
                fastag_id = generate_fastag_id()
            used_fastag_ids.add(fastag_id)

            # Generate unique serial
            serial = generate_serial_number()
            while serial in used_serials:
                serial = generate_serial_number()
            used_serials.add(serial)

            vc = random.choice(vehicle_classes)
            status = status_distribution[i]

            # Randomize dates
            days_ago = random.randint(1, 365)
            created_at = datetime.now() - timedelta(days=days_ago)
            issued_at = created_at + timedelta(hours=random.randint(1, 48))

            assigned_vid = None
            activated_at = None
            last_assigned_at = None
            is_blacklisted = False

            if status == "ASSIGNED" and vehicles and assigned_count < len(vehicles):
                # Assign to a real vehicle
                v = vehicles[assigned_count]
                assigned_vid = v.vehicle_id
                activated_at = issued_at + timedelta(hours=random.randint(1, 24))
                last_assigned_at = activated_at
                assigned_count += 1
            elif status == "BLACKLISTED":
                is_blacklisted = True

            tag = FastagInventory(
                fastag_id=fastag_id,
                tag_serial_number=serial,
                vehicle_class=vc,
                status=status,
                is_blacklisted=is_blacklisted,
                assigned_vehicle_id=assigned_vid,
                issued_at=issued_at,
                activated_at=activated_at,
                last_assigned_at=last_assigned_at,
                created_at=created_at
            )
            db.add(tag)
            tags_created += 1

        db.commit()

        # Print summary
        print(f"[OK] Created {tags_created} FASTag inventory records")
        print()

        # Count by status
        for status in ["UNASSIGNED", "ASSIGNED", "ACTIVE", "DISABLED", "BLACKLISTED", "REPLACED", "DAMAGED"]:
            count = db.query(FastagInventory).filter(FastagInventory.status == status).count()
            print(f"  {status:20s} : {count}")

        print()
        # Count by vehicle class
        for vc in vehicle_classes:
            count = db.query(FastagInventory).filter(FastagInventory.vehicle_class == vc).count()
            print(f"  {vc:20s} : {count}")

    finally:
        db.close()


# ─── Main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    run_migrations()
    seed_admin_user()
    seed_fastag_inventory()
    print("\n" + "=" * 60)
    print("MIGRATION COMPLETE")
    print("=" * 60)
