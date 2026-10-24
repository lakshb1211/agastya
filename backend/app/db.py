import json
import sqlite3
from contextlib import contextmanager
from typing import Any, Generator
from .config import DB_PATH

@contextmanager
def get_db() -> Generator[sqlite3.Connection, None, None]:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH, check_same_thread=False)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA journal_mode = WAL;")
    connection.execute("PRAGMA synchronous = NORMAL;")
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()

def init_db() -> None:
    with get_db() as conn:
        conn.executescript(
            """
            PRAGMA foreign_keys = ON;

            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name TEXT NOT NULL,
                grade TEXT DEFAULT 'School',
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS streaks (
                user_id TEXT PRIMARY KEY,
                streak_count INTEGER NOT NULL DEFAULT 0,
                last_active_date TEXT,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS materials (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                title TEXT NOT NULL,
                sections_json TEXT NOT NULL,
                topics_json TEXT NOT NULL,
                plan_json TEXT,
                notes_json TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS quizzes (
                id TEXT PRIMARY KEY,
                material_id TEXT NOT NULL,
                kind TEXT NOT NULL,
                questions_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS attempts (
                id TEXT PRIMARY KEY,
                quiz_id TEXT NOT NULL,
                user_id TEXT,
                answers_json TEXT NOT NULL,
                score INTEGER NOT NULL,
                total INTEGER NOT NULL,
                confidence INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS chats (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                query TEXT NOT NULL,
                reply TEXT NOT NULL,
                language TEXT DEFAULT 'en',
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            );

            CREATE INDEX IF NOT EXISTS idx_materials_user ON materials(user_id);
            CREATE INDEX IF NOT EXISTS idx_quizzes_material ON quizzes(material_id);
            CREATE INDEX IF NOT EXISTS idx_attempts_quiz ON attempts(quiz_id);
            CREATE INDEX IF NOT EXISTS idx_attempts_user ON attempts(user_id);
            CREATE INDEX IF NOT EXISTS idx_chats_user ON chats(user_id);
            """
        )
