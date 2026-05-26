from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import SessionLocal

router = APIRouter(prefix="/info", tags=["Information"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/db-status")
def check_db_status(db: Session = Depends(get_db)):
    try:
        # Check if we can execute a simple query
        db.execute(text("SELECT 1"))
        # Check if the users table exists (which is required for registration)
        db.execute(text("SELECT 1 FROM users LIMIT 1"))
        return {"status": "ok", "message": "Database is connected and ready."}
    except Exception as e:
        # If it fails, we return an error status
        return {"status": "error", "message": str(e)}

@router.get("/about-fastag")
def get_about_fastag():
    return {
        "title": "About NETC FASTag",
        "description": "FASTag is a device that employs Radio Frequency Identification (RFID) technology for making toll payments directly while the vehicle is in motion. FASTag (RFID Tag) is affixed on the windscreen of the vehicle and enables a customer to make toll payments directly from the account which is linked to FASTag.",
        "benefits": [
            {
                "title": "Saves Fuel and Time",
                "content": "FASTag is read by the tag reader at the plaza and the toll amount is deducted automatically, when the vehicle approaches the toll plaza. The vehicle with FASTag doesn't need to stop at the toll plaza for the cash transaction."
            },
            {
                "title": "SMS alerts for transactions",
                "content": "Customer will receive SMS alerts on his registered mobile numbers for all the transactions done in his tag account."
            },
            {
                "title": "Online Recharge",
                "content": "Customer can recharge his tag account online through Credit Card / Debit Card / NEFT / RTGS or Net Banking."
            },
            {
                "title": "No need to carry cash",
                "content": "Customer doesn't need to worry about carrying cash for the toll payments."
            },
            {
                "title": "Web portal for customers",
                "content": "Customers can access their statements by logging on the FASTag customer portal."
            }
        ],
        "how_it_works": [
            "Whenever the vehicle passes through the ETC lane of the Toll Plaza, the Toll Plaza system captures the FASTag details like (Tag ID, TID, Vehicle class, etc.) and sends it to the Acquiring bank for processing.",
            "The Acquiring bank sends a request to the NETC Mapper to validate the tag details.",
            "Once the Tag ID is validated, the NETC Mapper responds with details like Vehicle class, VRN, Tag Status etc. If the Tag ID is absent in NETC Mapper, it will respond that the Tag ID is not registered.",
            "After successful validation, the acquirer host calculates the appropriate toll fare and initiates a debit request to NETC system.",
            "NETC System switches the debit request to the respective Issuer bank for debiting the account of the customer."
        ]
    }
