"""
Seeds a handful of demo HCPs and materials so the autocomplete fields and
demo video have something realistic to show. Safe to run multiple times.
"""
from app.database import SessionLocal, init_db
from app.models import HCP, Material

DEMO_HCPS = [
    ("Dr. Ananya Sharma", "Oncology", "AIIMS Delhi"),
    ("Dr. Rohan Mehta", "Cardiology", "Fortis Hospital"),
    ("Dr. Priya Nair", "Endocrinology", "Apollo Hospitals"),
    ("Dr. Arjun Verma", "Oncology", "Tata Memorial Hospital"),
    ("Dr. Kavita Rao", "General Medicine", "Max Healthcare"),
]

DEMO_MATERIALS = [
    ("OncoBoost Phase III Results Deck", "pdf"),
    ("OncoBoost Patient Brochure", "brochure"),
    ("CardioPlus Efficacy Summary", "pdf"),
    ("CardioPlus Dosage Card", "brochure"),
    ("EndoBalance Clinical Overview Video", "video"),
]


def run():
    init_db()
    db = SessionLocal()
    try:
        if db.query(HCP).count() == 0:
            for name, spec, inst in DEMO_HCPS:
                db.add(HCP(name=name, specialty=spec, institution=inst))
        if db.query(Material).count() == 0:
            for name, mtype in DEMO_MATERIALS:
                db.add(Material(name=name, type=mtype))
        db.commit()
        print("Seed complete.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
