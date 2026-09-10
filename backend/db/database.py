import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger("presentmate.db")

# For Phase 1 MVP, we can use a local default if not found
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")

# Tuned connection pool for high concurrency and low latency
client = AsyncIOMotorClient(
    MONGO_URI,
    maxPoolSize=50,
    minPoolSize=10,
    maxIdleTimeMS=45000,
    connectTimeoutMS=5000,
    serverSelectionTimeoutMS=5000,
)

# Database Name
db = client.presentmate

async def get_db():
    return db

async def init_db_indexes():
    """Ensure database indexes exist for hot query paths."""
    try:
        # Users index on email
        await db.users.create_index("email", unique=True)
        # Presentations index on user_id
        await db.presentations.create_index("user_id")
        # Sessions indexes for rapid lookup by user, presentation, and status
        await db.sessions.create_index("user_id")
        await db.sessions.create_index("presentation_id")
        await db.sessions.create_index([("presentation_id", 1), ("status", 1)])
        logger.info("MongoDB indexes verified/created successfully.")
    except Exception as e:
        logger.warning(f"Could not verify/create MongoDB indexes: {e}")

async def close_db():
    """Gracefully close MongoDB client connection pool."""
    client.close()

