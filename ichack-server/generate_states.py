#!/usr/bin/env python3
from __future__ import annotations

from typing import Any, Dict, List

from news_client import current_news_data
from phone_client import current_phone_data, current_phone_location
from anthropic import Anthropic


client = Anthropic()  
message = client.messages.create(
    model="claude-sonnet-4-5",
    messages=[{"role": "user", "content": "Hello, Claude"}]
)

def generate_new_states() -> Dict[str, Any]:
    """Generate a snapshot of current in-memory data."""
    return {
        "phone": dict(current_phone_data),
        "phone_location": dict(current_phone_location),
        "news": list(current_news_data),
    }
