from dotenv import load_dotenv

import os

from sqlalchemy import create_engine

from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm import DeclarativeBase


load_dotenv()


DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. Copy .env.example to .env and point it at "
        "your database (local PostgreSQL for development, a hosted pooler URL "
        "such as Neon for deployment)."
    )

# Echoing every statement was useful while building the schema, but on a hosted
# app platform the SQL log is billed and drowns out real errors, so it is now
# opt-in and off by default.
DB_ECHO = os.getenv("DB_ECHO", "false").strip().lower() in ("1", "true", "yes", "on")

# A connection pooler (Neon's -pooler host, PgBouncer generally) recycles and
# drops idle server connections without telling the client. Handing out one of
# those dead sockets produced "server closed the connection unexpectedly" on the
# first request after a quiet period. pool_pre_ping validates a connection
# before use and pool_recycle replaces them well before the pooler gives up.
engine = create_engine(
    DATABASE_URL,
    echo=DB_ECHO,
    future=True,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=int(os.getenv("DB_POOL_SIZE", "5")),
    max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "5")),
    connect_args={"connect_timeout": 20},
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