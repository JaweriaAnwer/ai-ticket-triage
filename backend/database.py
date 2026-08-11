from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker

# Since we are using our local Docker PostgreSQL from docker-compose.yml
# user: nova_user, password: nova_password, db: nova_db
SQLALCHEMY_DATABASE_URL = "postgresql://nova_user:nova_password@localhost:5432/nova_db"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
