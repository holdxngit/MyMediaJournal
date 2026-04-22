from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class UserResponse(BaseModel):
    user_id: int
    name: Optional[str] = None
    email: EmailStr
    friend_code: Optional[str] = None
    created_at: Optional[datetime] = None


class SignupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class MediaItemResponse(BaseModel):
    media_id: int
    title: str
    media_type: str
    genres: list[str] = []


class ConsumptionLogCreate(BaseModel):
    media_id: int
    date_consumed: date
    time_consumed: int


class ConsumptionLogUpdate(BaseModel):
    date_consumed: date
    time_consumed: int


class ConsumptionLogResponse(BaseModel):
    log_id: int
    user_id: int
    media_id: int
    title: str
    media_type: str
    date_consumed: date
    time_consumed: int


class PaginatedLogsResponse(BaseModel):
    items: list[ConsumptionLogResponse]
    total: int
    page: int
    page_size: int


class LogStatsResponse(BaseModel):
    total_entries: int
    total_minutes: int
    top_media_type: str | None


class TopItemResponse(BaseModel):
    title: str
    media_type: str
    minutes: int


class TypeBreakdownItem(BaseModel):
    media_type: str
    count: int
    minutes: int


class ActivityDay(BaseModel):
    date: str  # YYYY-MM-DD
    count: int


class WrappedResponse(BaseModel):
    total_entries: int
    total_minutes: int
    top_media_type: str | None
    top_item: TopItemResponse | None
    longest_session_minutes: int
    type_breakdown: list[TypeBreakdownItem]
    activity_by_day: list[ActivityDay]
