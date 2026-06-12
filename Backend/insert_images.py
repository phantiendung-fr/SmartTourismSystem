import sys
import uuid
sys.path.append('d:/Tu_duy_tinh_toan/SmartTourismSystem/Backend')
from sqlmodel import Session, select, text
from database import engine

session = Session(engine)
session.exec(text("SELECT setval(pg_get_serial_sequence('locations_image', 'image_id'), coalesce(max(image_id),0) + 1, false) FROM locations_image;"))
session.commit()

loc1 = "daa7c755-3d29-4092-ba43-d70218b84e82"
loc2 = "e8b9607d-cbdc-4933-b5cc-5b1a8111106c"

try:
    session.exec(text("INSERT INTO locations_image (location_id, url, display_order) VALUES (:loc_id, :url, 1)"), params={'loc_id': loc1, 'url': 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Hoan_Kiem_Lake%2C_Hanoi.jpg'})
    session.exec(text("INSERT INTO locations_image (location_id, url, display_order) VALUES (:loc_id, :url, 1)"), params={'loc_id': loc2, 'url': 'https://upload.wikimedia.org/wikipedia/commons/1/1a/B%C3%BAn_ch%E1%BA%A3.jpg'})
    session.commit()
    print("Images inserted!")
except Exception as e:
    print(e)
