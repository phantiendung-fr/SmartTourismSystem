import os
from sqlmodel import Session, select
from database import engine
from models import Locations

def export_locations():
    with Session(engine) as session:
        locations = session.exec(select(Locations.location_name)).all()
        
    out_file = "location_names.txt"
    with open(out_file, "w", encoding="utf-8") as f:
        f.write("DANH SÁCH TÊN ĐỊA ĐIỂM (TỪ SUPABASE)\n")
        f.write("="*40 + "\n")
        for i, name in enumerate(locations, 1):
            f.write(f"{i}. {name}\n")
    print(f"Da xuat {len(locations)} dia diem vao file {out_file}")

if __name__ == "__main__":
    export_locations()
