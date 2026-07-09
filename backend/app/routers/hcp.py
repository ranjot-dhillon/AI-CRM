from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import HCP, Material

router = APIRouter(prefix="/api", tags=["lookups"])


@router.get("/hcps")
def search_hcps(q: str = Query("", alias="search"), db: Session = Depends(get_db)):
    query = db.query(HCP)
    if q:
        query = query.filter(HCP.name.ilike(f"%{q}%"))
    rows = query.limit(10).all()
    return [{"id": r.id, "name": r.name, "specialty": r.specialty, "institution": r.institution} for r in rows]


@router.get("/materials")
def search_materials(q: str = Query("", alias="search"), db: Session = Depends(get_db)):
    query = db.query(Material)
    if q:
        query = query.filter(Material.name.ilike(f"%{q}%"))
    rows = query.limit(10).all()
    return [{"id": r.id, "name": r.name, "type": r.type} for r in rows]
