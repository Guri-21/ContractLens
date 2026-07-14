from fastapi import APIRouter, Depends
from prisma import Prisma
from app.database import get_db
from app.api.deps import require_role

router = APIRouter(prefix="/api/audit", tags=["audit"])

@router.get("/")
async def list_audit_logs(db: Prisma = Depends(get_db), current_user = Depends(require_role(["Admin", "Compliance Officer"]))):
    return await db.auditlog.find_many(order={"timestamp": "desc"})
