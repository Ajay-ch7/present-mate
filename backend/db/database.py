import os
from motor.motor_asyncio import AsyncIOMotorClient

# For Phase 1 MVP, we can use a local default if not found
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URI)

# Database Name
db = client.presentmate
#main 
async def get_db():
    return db
