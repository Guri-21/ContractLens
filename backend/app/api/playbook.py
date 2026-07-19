from fastapi import APIRouter, Depends
from prisma import Prisma
from app.database import get_db
from app.api.deps import require_role
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/playbook", tags=["playbook"])

class PlaybookCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=2000)
    is_active: bool = True

@router.get("/")
async def get_playbook(db: Prisma = Depends(get_db), current_user = Depends(require_role(["Admin", "Legal Reviewer", "Compliance Officer"]))):
    return await db.playbookrule.find_many()

@router.post("/")
async def create_playbook_rule(rule: PlaybookCreate, db: Prisma = Depends(get_db), current_user = Depends(require_role(["Admin"]))):
    return await db.playbookrule.create(data=rule.dict())
