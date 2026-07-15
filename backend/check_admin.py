import asyncio
from prisma import Prisma
from app.core.security import get_password_hash

async def fix_admin():
    db = Prisma()
    await db.connect()
    try:
        user = await db.user.find_unique(where={"email": "admin@contractlens.com"})
        if user:
            print("Admin user found! Resetting password to admin123...")
            await db.user.update(
                where={"email": "admin@contractlens.com"},
                data={"hashed_password": get_password_hash("admin123")}
            )
            print("Password successfully reset.")
        else:
            print("Admin user NOT FOUND! Attempting to recreate it...")
            role = await db.role.find_first(where={"name": "Admin"})
            if not role:
                role = await db.role.create(data={"name": "Admin"})
                print("Created Admin role.")
                
            await db.user.create(data={
                "email": "admin@contractlens.com",
                "hashed_password": get_password_hash("admin123"),
                "role_id": role.id
            })
            print("Admin user successfully created with password admin123.")
    except Exception as e:
        print("Error:", e)
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(fix_admin())
