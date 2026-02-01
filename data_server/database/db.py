import json
import os
import uuid
from dataclasses import dataclass, field, asdict
from typing import Literal, Optional, List, Union
from pathlib import Path


DATA_ROOT = Path(__file__).parent.parent / "data"


@dataclass
class LocationPoint:
    lat: float
    lon: float
    timestamp: float
    accuracy: float


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
    status: str = "normal"  # civilian: normal, needs_help, help_coming, at_incident, in_transport, at_hospital
                           # responder: roaming, docked, en_route_to_civ, on_scene, en_route_to_hospital
    location_history: List[LocationPoint] = field(default_factory=list)
    calls: List[Call] = field(default_factory=list)


@dataclass
class NewsArticle:
    article_id: str
    link: str
    title: str
    pub_date: str
    disaster: bool
    location_name: str
    received_at: float
    lat: Optional[float] = None
    lon: Optional[float] = None


@dataclass
class SensorReading:
    reading_id: str
    status: int
    temperature: float
    humidity: float
    accel_x: float
    accel_y: float
    accel_z: float
    gyro_x: float
    gyro_y: float
    gyro_z: float
    mic_amplitude: float
    mic_frequency: float
    received_at: float


@dataclass
class DangerZone:
    zone_id: str
    category: Literal["natural", "people", "infrastructure"]
    disaster_type: str  # flood, fire, shooting, etc.
    severity: int  # 1-5 scale
    lat: float
    lon: float
    radius: float  # meters
    is_active: bool
    detected_at: float
    expires_at: Optional[float] = None
    description: str = ""
    recommended_action: str = ""  # evacuate, shelter_in_place, avoid_area


@dataclass
class Hospital:
    hospital_id: str
    name: str
    lat: float
    lon: float
    total_beds: int
    available_beds: int
    icu_beds: int
    available_icu: int
    er_beds: int
    available_er: int
    pediatric_beds: int
    available_pediatric: int
    contact_phone: str = ""
    last_updated: float = 0.0


@dataclass
class ExtractedEntity:
    entity_id: str
    source_type: Literal["call", "news", "sensor"]
    source_id: str  # call_id, article_id, or reading_id
    entity_type: Literal["person_status", "movement", "danger_zone", "medical"]
    urgency: int  # 1-5 scale
    status: str  # extracted status (needs_help, safe, etc.)
    needs: List[str] = field(default_factory=list)  # medical, evacuation, translation, shelter
    location_mentioned: str = ""
    medical_keywords: List[str] = field(default_factory=list)
    extracted_at: float = 0.0


class DB:
    def __init__(self, run_id: Optional[str] = None):
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

    def get_user(self, user_id: str) -> Optional[User]:
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

    def list_users(self) -> List[User]:
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

    def get_news(self, article_id: str) -> Optional[NewsArticle]:
        path = self.news_dir / f"{article_id}.json"
        if not path.exists():
            return None
        data = json.loads(path.read_text())
        return NewsArticle(**data)

    def list_news(self) -> List[NewsArticle]:
        articles = []
        for path in self.news_dir.glob("*.json"):
            article = self.get_news(path.stem)
            if article:
                articles.append(article)
        return sorted(articles, key=lambda a: a.received_at)
