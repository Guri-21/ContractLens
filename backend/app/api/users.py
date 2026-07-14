from fastapi import APIRouter, Depends
from prisma import Prisma
from app.database import get_db
from app.api.deps import require_role

router = APIRouter(prefix="/api/users", tags=["users"])

@router.get("/")
async def list_users(db: Prisma = Depends(get_db), current_user = Depends(require_role(["Admin"]))):
    users = await db.user.find_many(include={"role": True})
    return [{"id": u.id, "email": u.email, "role": u.role.name} for u in users]
