from typing import Literal, Optional

from pydantic import BaseModel


class UserCreate(BaseModel):
    username: str
    email: Optional[str] = None
    password: str
    role: Literal['user', 'admin'] = 'user'


class UserOut(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    role: Literal['user', 'admin'] = 'user'
    email_verified: bool = False


class UserDB(UserOut):
    hashed_password: str


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[Literal['user', 'admin']] = None
    email_verified: Optional[bool] = None
