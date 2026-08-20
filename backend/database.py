import os

from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker


# ==================================================
# DATABASE CONFIGURATION
# ==================================================

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://postgres:Arafath%402004@localhost:9398/postgres"
)


# ==================================================
# DATABASE ENGINE
# ==================================================

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    echo=False,
)


# ==================================================
# SESSION
# ==================================================

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)


# ==================================================
# BASE MODEL
# ==================================================

Base = declarative_base()


# ==================================================
# DATABASE SESSION
# ==================================================

def get_db():
    """
    Create and return a database session.
    """

    return SessionLocal()


# ==================================================
# DATABASE CONNECTION TEST
# ==================================================

def test_database_connection():
    """
    Test whether PostgreSQL is reachable.
    """

    try:

        with engine.connect() as connection:

            connection.execute(
                text("SELECT 1")
            )

        print(
            "PostgreSQL connection successful!"
        )

        return True

    except Exception as error:

        print(
            "PostgreSQL connection failed:"
        )

        print(error)

        return False


# ==================================================
# INITIALIZE DATABASE
# ==================================================

def init_database():
    """
    Create all registered SQLAlchemy tables.
    """

    # Import models here instead of at the top.
    #
    # This prevents the circular import:
    #
    # database.py → models.py → database.py

    from models import (
        Manuscript,
        Chapter,
        ChapterFacts,
        Canon,
        Conflict,
        Review,
    )

    Base.metadata.create_all(
        bind=engine
    )


# ==================================================
# DIRECT TEST
# ==================================================

if __name__ == "__main__":

    test_database_connection()