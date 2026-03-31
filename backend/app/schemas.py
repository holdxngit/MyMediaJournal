from pydantic import BaseModel

class MediaItemBase(BaseModel):
    title: str
    media_type: str

class MediaItemCreate(MediaItemBase):
    pass

class MediaItemUpdate(MediaItemBase):
    pass

class MediaItemResponse(MediaItemBase):
    media_id: int

    class Config:
        from_attributes = True