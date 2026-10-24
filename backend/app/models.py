import re
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field, field_validator

# Auth Models
class RegisterRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=1, max_length=100)
    grade: str = Field(default="School", max_length=50)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v):
            raise ValueError("Invalid email format.")
        return v

class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1, max_length=128)

class UserProfile(BaseModel):
    id: str
    email: str
    name: str
    grade: str
    created_at: str

class AuthResponse(BaseModel):
    token: str
    user: UserProfile

# Streak & Progress Models
class StreakResponse(BaseModel):
    streak_count: int
    last_active_date: Optional[str]
    is_active_today: bool

# Materials Models
class NotesRequest(BaseModel):
    language: str = Field(default="english", max_length=30)
    topic: Optional[str] = Field(default=None, max_length=200)

class ExplanationRequest(BaseModel):
    question: str = Field(min_length=2, max_length=600)
    language: str = Field(default="english", max_length=30)

# Quiz Models
class QuizRequest(BaseModel):
    kind: Literal["diagnostic", "weak-topic", "follow-up"] = "diagnostic"
    question_count: int = Field(default=5, ge=1, le=15)
    topics: List[str] = Field(default_factory=list, max_length=15)

class QuizSubmission(BaseModel):
    answers: Dict[str, int]
    confidence: int = Field(default=3, ge=1, le=5)

# Chat Models
class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str

class ChatRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000)
    history: List[ChatMessage] = Field(default_factory=list)
    language: str = Field(default="en", max_length=30)
    material_id: Optional[str] = Field(default=None)
