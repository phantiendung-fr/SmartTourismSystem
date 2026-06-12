import sys
sys.path.append('d:/Tu_duy_tinh_toan/SmartTourismSystem/Backend')
from sqlmodel import Session, text
from database import engine

session = Session(engine)
res = session.exec(text("SELECT column_name FROM information_schema.columns WHERE table_name='locations'")).all()
print([r[0] for r in res])
