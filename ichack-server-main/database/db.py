import json
import os
import uuid
from dataclasses import dataclass, field, asdict
from typing import Literal
from pathlib import Path


DATA_ROOT = Path(__file__).parent.parent / "data"


@dataclass
class LocationPoint:
    lat: float
    lon: float
    timestamp: float


@dataclass
class Call:
    call_id: str
    transcript: str
    start_time: float
    end_time: float


@dataclass
class User:
    user_id: str
    role: Literal["civilian", "first_responder"]
    location_history: list[LocationPoint] = field(default_factory=list)
    calls: list[Call] = field(default_factory=list)


@dataclass
class NewsArticle:
    article_id: str
    link: str
    title: str
    description: str
    received_at: float
    lat: float | None = None
    lon: float | None = None


class DB:
    def __init__(self, run_id: str | None = None):
        self.run_id = run_id or uuid.uuid4().hex[:12]
        self.run_dir = DATA_ROOT / self.run_id
        self.users_dir = self.run_dir / "users"
        self.news_dir = self.run_dir / "news"

        self.users_dir.mkdir(parents=True, exist_ok=True)
        self.news_dir.mkdir(parents=True, exist_ok=True)

    # --- Users ---

    def save_user(self, user: User) -> None:
        path = self.users_dir / f"{user.user_id}.json"
        path.write_text(json.dumps(asdict(user), indent=2))

    def get_user(self, user_id: str) -> User | None:
        path = self.users_dir / f"{user_id}.json"
        if not path.exists():
            return None
        data = json.loads(path.read_text())
        return User(
            user_id=data["user_id"],
            role=data["role"],
            location_history=[LocationPoint(**lp) for lp in data["location_history"]],
            calls=[Call(**c) for c in data["calls"]],
        )

    def list_users(self) -> list[User]:
        users = []
        for path in self.users_dir.glob("*.json"):
            user = self.get_user(path.stem)
            if user:
                users.append(user)
        return users

    # --- News ---

    def save_news(self, article: NewsArticle) -> None:
        path = self.news_dir / f"{article.article_id}.json"
        path.write_text(json.dumps(asdict(article), indent=2))

    def get_news(self, article_id: str) -> NewsArticle | None:
        path = self.news_dir / f"{article_id}.json"
        if not path.exists():
            return None
        data = json.loads(path.read_text())
        return NewsArticle(**data)

    def list_news(self) -> list[NewsArticle]:
        articles = []
        for path in self.news_dir.glob("*.json"):
            article = self.get_news(path.stem)
            if article:
                articles.append(article)
        return sorted(articles, key=lambda a: a.received_at)
