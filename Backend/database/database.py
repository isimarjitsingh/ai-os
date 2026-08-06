from dotenv import load_dotenv

import os

from sqlalchemy import create_engine

from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm import DeclarativeBase


load_dotenv()


DATABASE_URL = os.getenv("DATABASE_URL")


engine = create_engine(

    DATABASE_URL,

    echo=True,

    future=True

)


SessionLocal = sessionmaker(

    bind=engine,

    autoflush=False,

    autocommit=False,

    future=True

)


class Base(DeclarativeBase):

    pass


def get_db():

    db = SessionLocal()

    try:

        yield db

    finally:

        db.close()