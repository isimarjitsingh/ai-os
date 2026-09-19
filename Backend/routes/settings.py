from fastapi import APIRouter, Depends, HTTPException

from pydantic import BaseModel

from database.database import SessionLocal
from database import crud
from auth.dependencies import get_current_user


router = APIRouter(prefix="/settings", tags=["Settings"])


class ApiKeySaveRequest(BaseModel):
    provider: str
    api_key: str


class ApiKeyResponse(BaseModel):
    provider: str
    api_key: str
    created_at: str
    updated_at: str


def _key_to_response(key) -> ApiKeyResponse:
    return ApiKeyResponse(
        provider=key.provider,
        api_key=key.api_key,
        created_at=key.created_at.isoformat() if key.created_at else None,
        updated_at=key.updated_at.isoformat() if key.updated_at else None,
    )


@router.get("/keys/{provider}", response_model=ApiKeyResponse)
def get_api_key(provider: str, current_user=Depends(get_current_user)):
    """Get a specific provider's API key."""
    db = SessionLocal()
    try:
        key = crud.get_api_key(db, provider)
        if not key:
            raise HTTPException(status_code=404, detail="API key not found")
        return _key_to_response(key)
    finally:
        db.close()


@router.get("/keys", response_model=list[ApiKeyResponse])
def list_api_keys(current_user=Depends(get_current_user)):
    """Return all stored API keys (provider + masked key)."""
    db = SessionLocal()
    try:
        keys = crud.get_all_api_keys(db)
        return [_key_to_response(k) for k in keys]
    finally:
        db.close()


@router.post("/keys", response_model=ApiKeyResponse)
def save_api_key(
    payload: ApiKeySaveRequest,
    current_user=Depends(get_current_user),
):
    """Save or update an API key for a provider."""
    if not payload.provider or not payload.api_key:
        raise HTTPException(status_code=400, detail="provider and api_key are required")

    db = SessionLocal()
    try:
        key = crud.save_api_key(db, payload.provider, payload.api_key)
        return _key_to_response(key)
    finally:
        db.close()


@router.delete("/keys/{provider}")
def delete_api_key(provider: str, current_user=Depends(get_current_user)):
    """Delete an API key for a provider."""
    db = SessionLocal()
    try:
        key = crud.delete_api_key(db, provider)
        if not key:
            raise HTTPException(status_code=404, detail="API key not found")
        return {"success": True, "message": f"API key for {provider} deleted"}
    finally:
        db.close()