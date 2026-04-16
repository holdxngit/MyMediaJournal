import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_connection():
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        return result.scalar()


def ensure_auth_schema():
    """Keep local dev databases compatible when migrations were not run."""
    with engine.begin() as conn:
        conn.execute(text('ALTER TABLE "user" ADD COLUMN IF NOT EXISTS name VARCHAR'))
        conn.execute(text('ALTER TABLE "user" ADD COLUMN IF NOT EXISTS password_hash VARCHAR'))
        conn.execute(
            text(
                'ALTER TABLE "user" '
                "ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE "
                "NOT NULL DEFAULT NOW()"
            )
        )
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS user_session (
                    session_id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES "user"(user_id),
                    token_hash VARCHAR NOT NULL,
                    expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
                    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
                )
                """
            )
        )
        conn.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS "
                "ix_user_session_token_hash ON user_session (token_hash)"
            )
        )


def ensure_journal_schema():
    """Repair legacy local journal tables enough for the current app code."""
    with engine.begin() as conn:
        conn.execute(
            text(
                "ALTER TABLE consumption_log "
                "ADD COLUMN IF NOT EXISTS media_id INTEGER"
            )
        )
        conn.execute(
            text(
                "ALTER TABLE consumption_log "
                "ADD COLUMN IF NOT EXISTS date_consumed DATE NOT NULL DEFAULT CURRENT_DATE"
            )
        )
        conn.execute(
            text(
                "ALTER TABLE consumption_log "
                "ADD COLUMN IF NOT EXISTS time_consumed INTEGER NOT NULL DEFAULT 0"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS "
                "ix_consumption_log_user_id ON consumption_log (user_id)"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS "
                "ix_consumption_log_media_id ON consumption_log (media_id)"
            )
        )
        conn.execute(
            text(
                """
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_name = 'consumption_log'
                          AND column_name = 'calendar'
                    ) THEN
                        ALTER TABLE consumption_log
                        ALTER COLUMN calendar DROP NOT NULL;
                    END IF;
                END $$;
                """
            )
        )


def ensure_dev_schema():
    ensure_auth_schema()
    ensure_journal_schema()
