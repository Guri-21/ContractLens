from fastapi import APIRouter, Depends
from prisma import Prisma
from app.database import get_db
from app.api.deps import require_role
from pydantic import BaseModel

router = APIRouter(prefix="/api/playbook", tags=["playbook"])

class PlaybookCreate(BaseModel):
    title: str
    description: str
    is_active: bool = True

@router.get("/")
async def get_playbook(db: Prisma = Depends(get_db), current_user = Depends(require_role(["Admin", "Legal Reviewer", "Compliance Officer"]))):
    return await db.playbookrule.find_many()

@router.post("/")
async def create_playbook_rule(rule: PlaybookCreate, db: Prisma = Depends(get_db), current_user = Depends(require_role(["Admin", "Legal Reviewer"]))):
    return await db.playbookrule.create(data=rule.dict())

@router.put("/{id}")
async def update_playbook_rule(id: str, rule: PlaybookCreate, db: Prisma = Depends(get_db), current_user = Depends(require_role(["Admin", "Legal Reviewer"]))):
    return await db.playbookrule.update(
        where={"id": id},
        data=rule.dict()
    )

@router.delete("/{id}")
async def delete_playbook_rule(id: str, db: Prisma = Depends(get_db), current_user = Depends(require_role(["Admin", "Legal Reviewer"]))):
    await db.playbookrule.delete(where={"id": id})
    return {"status": "success"}

