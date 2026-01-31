"""MongoDB connection management using Motor async driver."""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import get_settings
from app.utils.logging import get_logger

logger = get_logger(__name__)


class MongoDB:
    """MongoDB connection manager."""

    _client: AsyncIOMotorClient | None = None
    _database: AsyncIOMotorDatabase | None = None

    @classmethod
    async def connect(cls) -> None:
        """Establish connection to MongoDB."""
        settings = get_settings()
        logger.info(
            "Connecting to MongoDB",
            extra={"event": "mongodb_connect", "uri": settings.mongodb_uri[:20] + "..."},
        )
        cls._client = AsyncIOMotorClient(settings.mongodb_uri)
        cls._database = cls._client[settings.mongodb_database]

        # Verify connection
        await cls._client.admin.command("ping")
        logger.info(
            "MongoDB connection established",
            extra={"event": "mongodb_connected", "database": settings.mongodb_database},
        )

        # Create indexes
        await cls._create_indexes()

    @classmethod
    async def disconnect(cls) -> None:
        """Close MongoDB connection."""
        if cls._client:
            logger.info("Disconnecting from MongoDB", extra={"event": "mongodb_disconnect"})
            cls._client.close()
            cls._client = None
            cls._database = None

    @classmethod
    def get_database(cls) -> AsyncIOMotorDatabase:
        """Get the database instance."""
        if cls._database is None:
            raise RuntimeError("MongoDB not connected. Call connect() first.")
        return cls._database

    @classmethod
    async def _create_indexes(cls) -> None:
        """Create necessary indexes."""
        db = cls.get_database()

        # Person records indexes
        persons = db.persons
        await persons.create_index("person_id", unique=True)
        await persons.create_index("is_active")
        await persons.create_index("call_started_at")
        await persons.create_index([("is_active", 1), ("updated_at", -1)])

        # Summary index
        summaries = db.summaries
        await summaries.create_index("summary_id", unique=True)

        logger.info("MongoDB indexes created", extra={"event": "indexes_created"})


async def get_database() -> AsyncIOMotorDatabase:
    """Dependency for getting the database."""
    return MongoDB.get_database()
