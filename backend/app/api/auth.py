from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from prisma import Prisma
from app.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
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
DEMO_USER_PASSWORDS = {
    DEMO_ADMIN_EMAIL: "12345",
    **{email: str(index) for index, email in enumerate(DEMO_ADVISOR_EMAILS, start=1)},
}
ADMIN_ROLE_NAMES = {"Admin"}
ADVISOR_ROLE_NAMES = {"Legal Reviewer", "Legal Advisor", "Compliance Officer"}
SEEDED_ADVISOR_ROLE = "Legal Reviewer"


def demo_display_name(email: str, role: str) -> str:
    if role == "Admin":
        return "Admin"
    local_part = email.split("@", 1)[0]
    if local_part.startswith(DEMO_ADVISOR_PREFIX):
        suffix = local_part.removeprefix(DEMO_ADVISOR_PREFIX)
        if suffix.isdigit():
            return f"Legal Advisor {suffix}"
    return email.split("@", 1)[0].replace(".", " ").replace("_", " ").title()


async def ensure_seeded_access_users(db: Prisma) -> None:
    """Keep the hackathon access accounts available after DB resets/env switches."""
    admin_role = await ensure_role(db, "Admin")
    advisor_role = await ensure_role(db, SEEDED_ADVISOR_ROLE)

    await upsert_seeded_user(db, DEMO_ADMIN_EMAIL, DEMO_USER_PASSWORDS[DEMO_ADMIN_EMAIL], admin_role.id)
    for email in DEMO_ADVISOR_EMAILS:
        await upsert_seeded_user(db, email, DEMO_USER_PASSWORDS[email], advisor_role.id)


async def ensure_role(db: Prisma, role_name: str):
    role = await db.role.find_unique(where={"name": role_name})
    if role:
        return role
    return await db.role.create(data={"name": role_name})


async def upsert_seeded_user(db: Prisma, email: str, password: str, role_id: str) -> None:
    user = await db.user.find_unique(where={"email": email})
    user_needs_password = True
    if user:
        try:
            user_needs_password = not verify_password(password, user.hashed_password)
        except (TypeError, ValueError):
            user_needs_password = True

        update_data = {}
        if user.role_id != role_id:
            update_data["role_id"] = role_id
        if user_needs_password:
            update_data["hashed_password"] = get_password_hash(password)
        if update_data:
            await db.user.update(where={"email": email}, data=update_data)
        return

    await db.user.create(
        data={
            "email": email,
            "hashed_password": get_password_hash(password),
            "role_id": role_id,
        }
    )

@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Prisma = Depends(get_db)):
    if form_data.username in DEMO_USER_PASSWORDS:
        await ensure_seeded_access_users(db)

    user = await db.user.find_unique(where={"email": form_data.username}, include={"role": True})
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.id})
    await db.auditlog.create(
        data={
            "user_id": user.id,
            "action": "LOGIN_SUCCESS",
            "target_type": "User",
            "target_id": user.id,
        }
    )
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "email": user.email,
        "role": user.role.name if user.role else "Legal Reviewer"
    }


@router.get("/available-users")
@router.get("/demo-users", include_in_schema=False)
async def list_demo_users(db: Prisma = Depends(get_db)):
    await ensure_seeded_access_users(db)

    users = await db.user.find_many(
        where={
            "AND": [
                {"email": {"in": DEMO_USER_EMAILS}},
                {
                    "role": {
                        "is": {
                            "name": {
                            "in": [*ADMIN_ROLE_NAMES, *ADVISOR_ROLE_NAMES],
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
        "admins": [user for user in serialized if user["role"] in ADMIN_ROLE_NAMES],
        "advisors": [user for user in serialized if user["role"] in ADVISOR_ROLE_NAMES],
    }
