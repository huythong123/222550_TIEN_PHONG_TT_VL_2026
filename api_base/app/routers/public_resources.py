from fastapi import APIRouter
from app.models.package_store import list_packages

router = APIRouter()


@router.get('/packages')
async def public_list_packages():
    # public endpoint returning available packages for purchase
    return list_packages()
