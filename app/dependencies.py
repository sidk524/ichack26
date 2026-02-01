"""Dependency injection for FastAPI."""

from app.core.call_processor import CallProcessor
from app.core.connection_manager import ConnectionManager
from app.db.mongodb import MongoDB
from app.db.repositories.person import PersonRepository
from app.db.repositories.summary import SummaryRepository
from app.services.llm.client import ClaudeClient


class AppState:
    """Application state container."""

    def __init__(self):
        self.connection_manager: ConnectionManager | None = None
        self.call_processor: CallProcessor | None = None
        self.llm_client: ClaudeClient | None = None

    async def initialize(self) -> None:
        """Initialize all components."""
        # Initialize database
        await MongoDB.connect()
        db = MongoDB.get_database()

        # Initialize repositories
        person_repo = PersonRepository(db)
        summary_repo = SummaryRepository(db)

        # Initialize LLM client
        self.llm_client = ClaudeClient()

        # Initialize connection manager
        self.connection_manager = ConnectionManager()

        # Initialize call processor
        self.call_processor = CallProcessor(
            connection_manager=self.connection_manager,
            person_repo=person_repo,
            summary_repo=summary_repo,
            llm_client=self.llm_client,
        )

    async def cleanup(self) -> None:
        """Cleanup resources."""
        await MongoDB.disconnect()
