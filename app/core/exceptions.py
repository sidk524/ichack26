"""Custom exceptions for the application."""


class DisasterCallError(Exception):
    """Base exception for disaster call processing."""

    pass


class ConnectionError(DisasterCallError):
    """WebSocket connection error."""

    pass


class ProcessingError(DisasterCallError):
    """Error during call processing."""

    pass


class LLMError(DisasterCallError):
    """Error from LLM service."""

    pass


class DatabaseError(DisasterCallError):
    """Database operation error."""

    pass
