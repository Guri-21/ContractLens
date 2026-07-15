from fastapi import APIRouter, Depends, HTTPException
from prisma import Prisma
from app.database import get_db
from app.api.deps import require_role
from pydantic import BaseModel
from app.core.security import get_password_hash

router = APIRouter(prefix="/api/users", tags=["users"])

class UserCreate(BaseModel):
    email: str
    password: str = "password123"
    role: str

class UserUpdate(BaseModel):
    email: str
    role: str

@router.get("/")
async def list_users(db: Prisma = Depends(get_db), current_user = Depends(require_role(["Admin"]))):
    users = await db.user.find_many(include={"role": True})
    return [{"id": u.id, "email": u.email, "role": u.role.name if u.role else "Legal Reviewer"} for u in users]

@router.post("/")
async def create_user(user: UserCreate, db: Prisma = Depends(get_db), current_user = Depends(require_role(["Admin"]))):
    db_role = await db.role.find_unique(where={"name": user.role})
    if not db_role:
        db_role = await db.role.create(data={"name": user.role})
    
    hashed = get_password_hash(user.password)
    new_user = await db.user.create(
        data={
            "email": user.email,
            "hashed_password": hashed,
            "role_id": db_role.id
        }
    )
    return {"id": new_user.id, "email": new_user.email, "role": user.role}

@router.put("/{id}")
async def update_user(id: str, user: UserUpdate, db: Prisma = Depends(get_db), current_user = Depends(require_role(["Admin"]))):
    db_role = await db.role.find_unique(where={"name": user.role})
    if not db_role:
        db_role = await db.role.create(data={"name": user.role})
        
    updated = await db.user.update(
        where={"id": id},
        data={
            "email": user.email,
            "role_id": db_role.id
        }
    )
    return {"id": updated.id, "email": updated.email, "role": user.role}

@router.delete("/{id}")
async def delete_user(id: str, db: Prisma = Depends(get_db), current_user = Depends(require_role(["Admin"]))):
    await db.user.delete(where={"id": id})
    return {"status": "success"}

