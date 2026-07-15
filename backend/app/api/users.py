from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.security import get_password_hash
from prisma import Prisma
from app.database import get_db
from app.api.deps import require_role

router = APIRouter(prefix="/api/users", tags=["users"])

@router.get("/")
async def list_users(db: Prisma = Depends(get_db), current_user = Depends(require_role(["Admin"]))):
    users = await db.user.find_many(include={"role": True, "assigned_docs": True})
    result = []
    for u in users:
        docs = [{"id": d.id, "name": d.name, "status": d.status} for d in u.assigned_docs] if u.assigned_docs else []
        result.append({"id": u.id, "email": u.email, "role": u.role.name, "assigned_docs": docs})
    return result

class UserCreate(BaseModel):
    email: str

@router.post("/")
async def create_advisor(request: UserCreate, db: Prisma = Depends(get_db), current_user = Depends(require_role(["Admin"]))):
    existing = await db.user.find_unique(where={"email": request.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    role = await db.role.find_unique(where={"name": "Legal Reviewer"})
    if not role:
        raise HTTPException(status_code=500, detail="Role 'Legal Reviewer' not found")
        
    user = await db.user.create(
        data={
            "email": request.email,
            "hashed_password": get_password_hash("abc123"),
            "role_id": role.id
        }
    )
    return {"id": user.id, "email": user.email, "role": "Legal Reviewer"}

@router.delete("/{user_id}")
async def delete_advisor(user_id: str, db: Prisma = Depends(get_db), current_user = Depends(require_role(["Admin"]))):
    user = await db.user.find_unique(where={"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
        
    role = await db.role.find_unique(where={"id": user.role_id})
    if role and role.name == "Admin":
        raise HTTPException(status_code=403, detail="Cannot delete other admins")
        
    await db.user.delete(where={"id": user_id})
    return {"status": "success", "deleted_id": user_id}
