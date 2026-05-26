"""
Migration Script: Warehouse Integrity Upgrade
=============================================
This script performs:
1. Cleaning of duplicate FASTag vehicle links.
2. Migration of old FASTag status values to new status values.
3. Modification of table schema:
   - Adds `last_assigned_at` column.
   - Sets server default status to 'UNASSIGNED'.
   - Adds unique constraint/index on `assigned_vehicle_id`.
"""
import os
import sys
from datetime import datetime

# Ensure the backend directory is in path
sys.path.insert(0, os.path.dirname(__file__))

from app.database import engine, SessionLocal
from sqlalchemy import text


def run_migration():
    print("=" * 60)
    print("STARTING WAREHOUSE INTEGRITY MIGRATION")
    print("=" * 60)

    db = SessionLocal()
    try:
        # --- 1. Clean up duplicate assignments ---
        print("\nCleaning up duplicate assignments...")
        # Get vehicles with multiple linked tags
        duplicates_query = text(
            "SELECT assigned_vehicle_id, COUNT(*) as cnt "
            "FROM fastag_inventory "
            "WHERE assigned_vehicle_id IS NOT NULL "
            "GROUP BY assigned_vehicle_id "
            "HAVING cnt > 1"
        )
        duplicates = db.execute(duplicates_query).fetchall()

        for dup in duplicates:
            vehicle_id = dup[0]
            print(f"Vehicle ID {vehicle_id} has duplicate FASTag assignments.")
            
            # Fetch all tags for this vehicle
            tags_query = text(
                "SELECT id, status, fastag_id FROM fastag_inventory "
                "WHERE assigned_vehicle_id = :vehicle_id"
            )
            tags = db.execute(tags_query, {"vehicle_id": vehicle_id}).fetchall()
            
            # Determine which tag to keep. 
            # We prefer tags with status ASSIGNED or PENDING_ACTIVATION or ACTIVE.
            # Otherwise we keep the first one.
            tags_sorted = sorted(
                tags, 
                key=lambda t: (0 if t[1] in ('ASSIGNED', 'PENDING_ACTIVATION', 'ACTIVE') else 1, t[0])
            )
            
            keep_tag = tags_sorted[0]
            release_tags = tags_sorted[1:]
            
            print(f"  Keeping tag {keep_tag[2]} (ID: {keep_tag[0]}, Status: {keep_tag[1]})")
            
            for rel in release_tags:
                print(f"  Unlinking tag {rel[2]} (ID: {rel[0]}) and setting status to AVAILABLE")
                update_query = text(
                    "UPDATE fastag_inventory "
                    "SET assigned_vehicle_id = NULL, status = 'AVAILABLE' "
                    "WHERE id = :tag_id"
                )
                db.execute(update_query, {"tag_id": rel[0]})
        
        # Also clean up tags that are AVAILABLE but still have assigned_vehicle_id set
        print("Cleaning up available/inactive tags with non-null vehicle links...")
        cleanup_links_query = text(
            "UPDATE fastag_inventory "
            "SET assigned_vehicle_id = NULL "
            "WHERE status IN ('AVAILABLE', 'INACTIVE', 'BLACKLISTED', 'DAMAGED') "
            "AND assigned_vehicle_id IS NOT NULL"
        )
        result = db.execute(cleanup_links_query)
        print(f"  Cleared links for {result.rowcount} tags.")
        db.commit()

        # --- 2. Add columns and constraints ---
        with engine.connect() as conn:
            # Add last_assigned_at column
            print("\nChecking and adding 'last_assigned_at' column...")
            try:
                conn.execute(text(
                    "ALTER TABLE fastag_inventory ADD COLUMN last_assigned_at DATETIME NULL;"
                ))
                print("  [OK] Added 'last_assigned_at' column")
            except Exception as e:
                if "Duplicate column name" in str(e):
                    print("  [SKIP] 'last_assigned_at' column already exists.")
                else:
                    print(f"  [ERROR] {e}")

            # Populate last_assigned_at for already assigned tags
            print("Populating initial 'last_assigned_at' values...")
            conn.execute(text(
                "UPDATE fastag_inventory "
                "SET last_assigned_at = COALESCE(activated_at, issued_at, created_at, NOW()) "
                "WHERE assigned_vehicle_id IS NOT NULL AND last_assigned_at IS NULL;"
            ))

            # Modify status column type and default
            print("Updating 'status' column default value...")
            try:
                conn.execute(text(
                    "ALTER TABLE fastag_inventory MODIFY COLUMN status VARCHAR(30) NOT NULL DEFAULT 'UNASSIGNED';"
                ))
                print("  [OK] Updated status default value to 'UNASSIGNED'")
            except Exception as e:
                print(f"  [ERROR] {e}")

            # Migrate status values
            print("Migrating status values...")
            conn.execute(text("UPDATE fastag_inventory SET status = 'UNASSIGNED' WHERE status = 'AVAILABLE';"))
            conn.execute(text("UPDATE fastag_inventory SET status = 'DISABLED' WHERE status = 'INACTIVE';"))
            conn.execute(text("UPDATE fastag_inventory SET status = 'ASSIGNED' WHERE status = 'PENDING_ACTIVATION';"))
            print("  [OK] Status values migrated.")

            # Add UNIQUE constraint on assigned_vehicle_id
            print("Checking and adding UNIQUE index uq_assigned_vehicle_id...")
            try:
                conn.execute(text(
                    "ALTER TABLE fastag_inventory ADD UNIQUE INDEX uq_assigned_vehicle_id (assigned_vehicle_id);"
                ))
                print("  [OK] Created UNIQUE index uq_assigned_vehicle_id")
            except Exception as e:
                if "Duplicate key name" in str(e) or "already exists" in str(e).lower():
                    print("  [SKIP] UNIQUE index uq_assigned_vehicle_id already exists.")
                else:
                    print(f"  [ERROR] {e}")

            conn.commit()

        print("\nMigration completed successfully!")
    except Exception as e:
        print(f"\nMigration failed: {e}")
        db.rollback()
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    run_migration()
