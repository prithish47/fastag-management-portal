from jose import jwt
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY environment variable is missing. The application cannot start safely.")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

def create_access_token(data: dict):

    to_encode = data.copy()

    expire = datetime.utcnow() + timedelta(hours=24)

    to_encode.update({
        "exp": expire
    })

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

def create_reset_token(email: str, password_hash: str):
    # Token expires exactly 15 minutes from creation
    expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode = {"sub": email, "type": "reset", "exp": expire}
    
    # We mix the user's current password hash into the secret.
    # This guarantees that once the password is changed, the token instantly becomes invalid!
    dynamic_secret = SECRET_KEY + password_hash
    return jwt.encode(to_encode, dynamic_secret, algorithm=ALGORITHM)

def get_email_from_unverified_token(token: str):
    try:
        # Decode without verifying signature to extract the email
        payload = jwt.get_unverified_claims(token)
        return payload.get("sub")
    except Exception:
        return None

def verify_reset_token(token: str, password_hash: str):
    try:
        dynamic_secret = SECRET_KEY + password_hash
        payload = jwt.decode(token, dynamic_secret, algorithms=[ALGORITHM])
        return payload
    except Exception:
        return None

def verify_access_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except Exception:
        return None