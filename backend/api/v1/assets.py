"""
Asset Inventory API - CRUD for managed targets
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from database import get_db
from models.asset import Asset
from datetime import datetime

router = APIRouter()


class AssetCreate(BaseModel):
    name: str
    target: str
    description: Optional[str] = None
    tags: Optional[List[str]] = []


class AssetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    is_active: Optional[bool] = None


def asset_to_dict(a: Asset) -> dict:
    return {
        "id": a.id,
        "name": a.name,
        "target": a.target,
        "description": a.description,
        "tags": a.tags or [],
        "is_active": a.is_active,
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "last_scanned_at": a.last_scanned_at.isoformat() if a.last_scanned_at else None,
    }


@router.get("", summary="List all assets")
def list_assets(db: Session = Depends(get_db)):
    assets = db.query(Asset).order_by(Asset.created_at.desc()).all()
    return [asset_to_dict(a) for a in assets]


@router.post("", summary="Create an asset")
def create_asset(payload: AssetCreate, db: Session = Depends(get_db)):
    existing = db.query(Asset).filter(Asset.target == payload.target).first()
    if existing:
        raise HTTPException(status_code=409, detail="Asset with this target already exists")
    asset = Asset(
        name=payload.name,
        target=payload.target,
        description=payload.description,
        tags=payload.tags or [],
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset_to_dict(asset)


@router.get("/{asset_id}", summary="Get a single asset")
def get_asset(asset_id: int, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset_to_dict(asset)


@router.put("/{asset_id}", summary="Update an asset")
def update_asset(asset_id: int, payload: AssetUpdate, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    if payload.name is not None:
        asset.name = payload.name
    if payload.description is not None:
        asset.description = payload.description
    if payload.tags is not None:
        asset.tags = payload.tags
    if payload.is_active is not None:
        asset.is_active = payload.is_active
    db.commit()
    db.refresh(asset)
    return asset_to_dict(asset)


@router.delete("/{asset_id}", summary="Delete an asset")
def delete_asset(asset_id: int, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    db.delete(asset)
    db.commit()
    return {"status": "deleted", "id": asset_id}


@router.post("/{asset_id}/scan", summary="Launch Nuclei scan on this asset")
async def scan_asset(asset_id: int, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    from services.nuclei_scanner import nuclei_scanner
    scan_id = await nuclei_scanner.start_scan(target=asset.target)
    # Update last_scanned_at
    asset.last_scanned_at = datetime.utcnow()
    db.commit()
    return {"status": "started", "scan_id": scan_id, "target": asset.target}
