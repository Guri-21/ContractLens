from fastapi import APIRouter, Depends
from prisma import Prisma
from app.database import get_db
from app.api.deps import require_role
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/country-rules", tags=["country_rules"])

class CountryRuleCreate(BaseModel):
    country_code: str = Field(..., min_length=2, max_length=10)
    rule_title: str = Field(..., min_length=1, max_length=200)
    rule_description: str = Field(..., min_length=1, max_length=2000)
    is_active: bool = True

@router.get("/")
async def get_country_rules(db: Prisma = Depends(get_db), current_user = Depends(require_role(["Admin", "Legal Reviewer", "Compliance Officer"]))):
    return await db.countrycompliancerule.find_many()

@router.post("/")
async def create_country_rule(rule: CountryRuleCreate, db: Prisma = Depends(get_db), current_user = Depends(require_role(["Admin", "Compliance Officer"]))):
    return await db.countrycompliancerule.create(data=rule.dict())
