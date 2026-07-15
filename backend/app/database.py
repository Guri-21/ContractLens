from dotenv import load_dotenv
from prisma import Prisma

load_dotenv(override=True)

db = Prisma()

async def get_db():
    if not db.is_connected():
        await db.connect()
    return db
