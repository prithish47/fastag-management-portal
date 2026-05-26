"""
Warehouse Integrity Service
===========================
Provides read-only scanning and mutation-based resolving of operational 
anomalies across vehicles and FASTag inventory.
"""
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.fastag_inventory_model import FastagInventory
from app.models.vehicle_model import Vehicle
from app.models.activity_log_model import VehicleActivityLog
from app.models.notification_model import Notification


class IntegrityService:
    @staticmethod
    def check_integrity(db: Session) -> list:
        anomalies = []

        # 1. Orphaned Active/Assigned/Disabled tags
        # (Tags in ASSIGNED, ACTIVE, or DISABLED state but assigned_vehicle_id is NULL)
        orphaned_tags = db.query(FastagInventory).filter(
            FastagInventory.status.in_(["ASSIGNED", "ACTIVE", "DISABLED"]),
            FastagInventory.assigned_vehicle_id.is_(None)
        ).all()
        for tag in orphaned_tags:
            anomalies.append({
                "type": "orphaned_tag",
                "severity": "high",
                "message": f"FASTag {tag.fastag_id} is '{tag.status}' but has no assigned vehicle.",
                "meta": {
                    "tag_id": tag.id,
                    "fastag_id": tag.fastag_id,
                    "status": tag.status
                }
            })

        # 2. Linked Unassigned/Blacklisted/Damaged/Replaced tags
        # (Tags linked to a vehicle but status is UNASSIGNED, BLACKLISTED, REPLACED, DAMAGED)
        linked_invalid_tags = db.query(FastagInventory).filter(
            FastagInventory.status.in_(["UNASSIGNED", "BLACKLISTED", "REPLACED", "DAMAGED"]),
            FastagInventory.assigned_vehicle_id.isnot(None)
        ).all()
        for tag in linked_invalid_tags:
            vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == tag.assigned_vehicle_id).first()
            vehicle_number = vehicle.vehicle_number if vehicle else f"ID {tag.assigned_vehicle_id}"
            anomalies.append({
                "type": "linked_invalid_tag",
                "severity": "high",
                "message": f"FASTag {tag.fastag_id} is '{tag.status}' but remains linked to vehicle {vehicle_number}.",
                "meta": {
                    "tag_id": tag.id,
                    "fastag_id": tag.fastag_id,
                    "status": tag.status,
                    "vehicle_id": tag.assigned_vehicle_id,
                    "vehicle_number": vehicle_number
                }
            })

        # 3. Active/Verified Vehicles Missing Tags
        # (Active/Verified vehicles with no active/assigned tag linked)
        # First find all active tags
        assigned_vids = [t[0] for t in db.query(FastagInventory.assigned_vehicle_id).filter(
            FastagInventory.assigned_vehicle_id.isnot(None),
            FastagInventory.status.in_(["ASSIGNED", "ACTIVE"])
        ).all()]
        
        missing_tag_vehicles = db.query(Vehicle).filter(
            Vehicle.rc_verification_status == "VERIFIED",
            Vehicle.fastag_status == "ACTIVE",
            ~Vehicle.vehicle_id.in_(assigned_vids)
        ).all()
        
        for vehicle in missing_tag_vehicles:
            anomalies.append({
                "type": "missing_tag",
                "severity": "medium",
                "message": f"Vehicle {vehicle.vehicle_number} is ACTIVE and VERIFIED but has no active FASTag linked.",
                "meta": {
                    "vehicle_id": vehicle.vehicle_id,
                    "vehicle_number": vehicle.vehicle_number
                }
            })

        # 4. Status Inconsistencies between Vehicle and Tag
        # (e.g. tag is ACTIVE but vehicle status is INACTIVE/DISABLED, or vice versa)
        active_tags = db.query(FastagInventory).filter(
            FastagInventory.assigned_vehicle_id.isnot(None),
            FastagInventory.status.in_(["ASSIGNED", "ACTIVE", "DISABLED"])
        ).all()
        for tag in active_tags:
            vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == tag.assigned_vehicle_id).first()
            if vehicle:
                # If vehicle is ACTIVE but tag is DISABLED
                if vehicle.fastag_status == "ACTIVE" and tag.status == "DISABLED":
                    anomalies.append({
                        "type": "status_mismatch",
                        "severity": "medium",
                        "message": f"FASTag {tag.fastag_id} is DISABLED, but linked vehicle {vehicle.vehicle_number} is ACTIVE.",
                        "meta": {
                            "tag_id": tag.id,
                            "fastag_id": tag.fastag_id,
                            "tag_status": tag.status,
                            "vehicle_id": vehicle.vehicle_id,
                            "vehicle_number": vehicle.vehicle_number,
                            "vehicle_status": vehicle.fastag_status
                        }
                    })
                # If vehicle is DISABLED and tag is ACTIVE/ASSIGNED
                elif vehicle.fastag_status in ("DISABLED", "INACTIVE") and tag.status in ("ACTIVE", "ASSIGNED"):
                    anomalies.append({
                        "type": "status_mismatch",
                        "severity": "medium",
                        "message": f"FASTag {tag.fastag_id} is '{tag.status}', but linked vehicle {vehicle.vehicle_number} is '{vehicle.fastag_status}'.",
                        "meta": {
                            "tag_id": tag.id,
                            "fastag_id": tag.fastag_id,
                            "tag_status": tag.status,
                            "vehicle_id": vehicle.vehicle_id,
                            "vehicle_number": vehicle.vehicle_number,
                            "vehicle_status": vehicle.fastag_status
                        }
                    })

        return anomalies

    @staticmethod
    def resolve_integrity(db: Session) -> list:
        resolved_actions = []

        # 1. Unlink invalid tags (UNASSIGNED, BLACKLISTED, REPLACED, DAMAGED) that are linked to vehicles
        linked_invalid_tags = db.query(FastagInventory).filter(
            FastagInventory.status.in_(["UNASSIGNED", "BLACKLISTED", "REPLACED", "DAMAGED"]),
            FastagInventory.assigned_vehicle_id.isnot(None)
        ).all()
        
        for tag in linked_invalid_tags:
            vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == tag.assigned_vehicle_id).first()
            v_num = vehicle.vehicle_number if vehicle else f"ID {tag.assigned_vehicle_id}"
            
            # Record action
            resolved_actions.append(
                f"Unlinked {tag.status} FASTag {tag.fastag_id} from vehicle {v_num}"
            )
            
            # Log vehicle activity
            if vehicle:
                log = VehicleActivityLog(
                    vehicle_id=vehicle.vehicle_id,
                    activity_type="FASTAG_UNLINKED",
                    activity_message=f"Inconsistent FASTag {tag.fastag_id} ({tag.status}) unlinked during auto-resolution."
                )
                db.add(log)
                
                # Check if vehicle has NO other tag and is active, transition its state to PENDING
                # We don't disable it, we change it to FASTAG_PENDING to keep it safe
                vehicle.fastag_status = "FASTAG_PENDING"
                vehicle.updated_at = datetime.now()

            tag.assigned_vehicle_id = None
            db.commit()

        # 2. Fix orphaned active/assigned/disabled tags (set to UNASSIGNED if they have no vehicle)
        orphaned_tags = db.query(FastagInventory).filter(
            FastagInventory.status.in_(["ASSIGNED", "ACTIVE", "DISABLED"]),
            FastagInventory.assigned_vehicle_id.is_(None)
        ).all()
        for tag in orphaned_tags:
            resolved_actions.append(
                f"Set status of orphaned {tag.status} FASTag {tag.fastag_id} to UNASSIGNED"
            )
            tag.status = "UNASSIGNED"
            db.commit()

        # 3. Handle Vehicles missing tags: change their state from ACTIVE to FASTAG_PENDING (do NOT disable)
        assigned_vids = [t[0] for t in db.query(FastagInventory.assigned_vehicle_id).filter(
            FastagInventory.assigned_vehicle_id.isnot(None),
            FastagInventory.status.in_(["ASSIGNED", "ACTIVE"])
        ).all()]
        
        missing_tag_vehicles = db.query(Vehicle).filter(
            Vehicle.rc_verification_status == "VERIFIED",
            Vehicle.fastag_status == "ACTIVE",
            ~Vehicle.vehicle_id.in_(assigned_vids)
        ).all()
        
        for vehicle in missing_tag_vehicles:
            resolved_actions.append(
                f"Flagged vehicle {vehicle.vehicle_number} as FASTAG_PENDING (awaiting tag assignment)"
            )
            vehicle.fastag_status = "FASTAG_PENDING"
            vehicle.updated_at = datetime.now()
            
            log = VehicleActivityLog(
                vehicle_id=vehicle.vehicle_id,
                activity_type="FASTAG_STATUS_UPDATED",
                activity_message="Vehicle status changed to FASTAG_PENDING due to missing active FASTag assignment."
            )
            db.add(log)
            db.commit()

        # 4. Resolve status inconsistencies
        active_tags = db.query(FastagInventory).filter(
            FastagInventory.assigned_vehicle_id.isnot(None),
            FastagInventory.status.in_(["ASSIGNED", "ACTIVE", "DISABLED"])
        ).all()
        for tag in active_tags:
            vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == tag.assigned_vehicle_id).first()
            if vehicle:
                # If vehicle is ACTIVE but tag is DISABLED
                if vehicle.fastag_status == "ACTIVE" and tag.status == "DISABLED":
                    resolved_actions.append(
                        f"Corrected ACTIVE status for FASTag {tag.fastag_id} (linked to active vehicle {vehicle.vehicle_number})"
                    )
                    tag.status = "ACTIVE"
                    tag.last_assigned_at = datetime.now()
                    db.commit()
                # If vehicle is DISABLED / INACTIVE and tag is ACTIVE / ASSIGNED
                elif vehicle.fastag_status in ("DISABLED", "INACTIVE") and tag.status in ("ACTIVE", "ASSIGNED"):
                    resolved_actions.append(
                        f"Corrected DISABLED status for FASTag {tag.fastag_id} (linked to disabled vehicle {vehicle.vehicle_number})"
                    )
                    tag.status = "DISABLED"
                    db.commit()
                # If vehicle is active and tag status is ASSIGNED, update tag status to ACTIVE for operational realism
                elif vehicle.fastag_status == "ACTIVE" and tag.status == "ASSIGNED":
                    resolved_actions.append(
                        f"Activated tag {tag.fastag_id} for active/verified vehicle {vehicle.vehicle_number}"
                    )
                    tag.status = "ACTIVE"
                    if not tag.last_assigned_at:
                        tag.last_assigned_at = datetime.now()
                    db.commit()

        return resolved_actions
