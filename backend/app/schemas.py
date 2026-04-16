from datetime import date
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class UserResponse(BaseModel):
    user_id: int
    name: Optional[str] = None
    email: EmailStr


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
