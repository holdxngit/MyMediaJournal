from datetime import date
from typing import Optional
from pydantic import BaseModel


class MediaItemResponse(BaseModel):
    media_id: int
    title: str
    media_type: str
    genres: list[str] = []


class ConsumptionLogCreate(BaseModel):
    user_id: int = 1
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
