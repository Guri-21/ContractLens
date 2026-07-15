import asyncio
from prisma import Prisma

async def reset_database():
    db = Prisma()
    await db.connect()
    
    try:
        # Delete dependent tables first
        print("Deleting RiskFindings...")
        await db.riskfinding.delete_many()
        
        print("Deleting Clauses...")
        await db.clause.delete_many()
        
        print("Deleting Documents...")
        await db.document.delete_many()
        
        print("Deleting AuditLogs...")
        await db.auditlog.delete_many()
        
        print("Deleting Users (except admin)...")
        # Keep admin user
        await db.user.delete_many(
            where={
                "email": {
                    "not": "admin@contractlens.com"
                }
            }
        )
        
        print("Database reset complete! All data cleared except admin user.")
    except Exception as e:
        print(f"Error resetting database: {e}")
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(reset_database())
