from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from prisma import Prisma
from app.database import get_db
from app.core.security import verify_password, create_access_token
from pydantic import BaseModel

router = APIRouter(prefix="/api/auth", tags=["auth"])

class Token(BaseModel):
    access_token: str
    token_type: str
    email: str
    role: str


DEMO_ADMIN_EMAIL = "admin@contractlens.com"
DEMO_ADVISOR_PREFIX = "advisor"
DEMO_ADVISOR_EMAILS = [f"advisor{i}@contractlens.com" for i in range(1, 6)]
DEMO_USER_EMAILS = [DEMO_ADMIN_EMAIL, *DEMO_ADVISOR_EMAILS]


def demo_display_name(email: str, role: str) -> str:
    if role == "Admin":
        return "Admin"
    local_part = email.split("@", 1)[0]
    if local_part.startswith(DEMO_ADVISOR_PREFIX):
        suffix = local_part.removeprefix(DEMO_ADVISOR_PREFIX)
        if suffix.isdigit():
            return f"Legal Advisor {suffix}"
    return email.split("@", 1)[0].replace(".", " ").replace("_", " ").title()

@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Prisma = Depends(get_db)):
    user = await db.user.find_unique(where={"email": form_data.username}, include={"role": True})
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.id})
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "email": user.email,
        "role": user.role.name if user.role else "Legal Reviewer"
    }


@router.get("/demo-users")
async def list_demo_users(db: Prisma = Depends(get_db)):
    users = await db.user.find_many(
        where={
            "AND": [
                {"email": {"in": DEMO_USER_EMAILS}},
                {
                    "role": {
                        "is": {
                            "name": {
                                "in": ["Admin", "Legal Reviewer"],
                            }
                        }
                    }
                },
            ]
        },
        include={"role": True},
        order={"email": "asc"},
    )

    serialized = [
        {
            "id": user.id,
            "email": user.email,
            "role": user.role.name,
            "displayName": demo_display_name(user.email, user.role.name),
        }
        for user in users
        if user.role
    ]

    return {
        "admins": [user for user in serialized if user["role"] == "Admin"],
        "advisors": [user for user in serialized if user["role"] == "Legal Reviewer"],
    }
