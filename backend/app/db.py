import hashlib
import json
import os
import secrets
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
DATA = Path(os.getenv("DATA_DIR", str(Path(__file__).resolve().parents[2] / "data"))).resolve()
DATA.mkdir(parents=True, exist_ok=True)


def now():
    return datetime.now(timezone.utc).isoformat()


def uid():
    return secrets.token_hex(12)


def password_hash(password, salt=None):
    salt = salt or secrets.token_hex(16)
    digest = hashlib.scrypt(password.encode(), salt=salt.encode(), n=16384, r=8, p=1).hex()
    return f"{salt}:{digest}"


def password_matches(password, stored):
    return secrets.compare_digest(password_hash(password, stored.split(":")[0]), stored)


@contextmanager
def database():
    conn = sqlite3.connect(DATA / "meridian.db", timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def initialize():
    with database() as c:
        c.executescript("""
        CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
          password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'consultant', verified INTEGER DEFAULT 0);
        CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id), expires REAL);
        CREATE TABLE IF NOT EXISTS auth_tokens(token TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id), kind TEXT, expires REAL);
        CREATE TABLE IF NOT EXISTS customers(id TEXT PRIMARY KEY, name TEXT NOT NULL, industry TEXT, description TEXT,
          contacts TEXT, goals TEXT, created_at TEXT);
        CREATE TABLE IF NOT EXISTS customer_access(customer_id TEXT REFERENCES customers(id), user_id TEXT REFERENCES users(id),
          PRIMARY KEY(customer_id,user_id));
        CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY, customer_id TEXT REFERENCES customers(id), name TEXT NOT NULL,
          description TEXT, objectives TEXT, owner_id TEXT REFERENCES users(id), state TEXT DEFAULT 'Concept',
          start_date TEXT, due_date TEXT, archived INTEGER DEFAULT 0, created_at TEXT);
        CREATE TABLE IF NOT EXISTS members(project_id TEXT REFERENCES projects(id), user_id TEXT REFERENCES users(id),
          PRIMARY KEY(project_id,user_id));
        CREATE TABLE IF NOT EXISTS invitations(id TEXT PRIMARY KEY, project_id TEXT REFERENCES projects(id),
          user_id TEXT REFERENCES users(id), requester_id TEXT REFERENCES users(id), state TEXT DEFAULT 'pending',
          decided_by TEXT REFERENCES users(id), created_at TEXT);
        CREATE TABLE IF NOT EXISTS activity(id TEXT PRIMARY KEY, project_id TEXT REFERENCES projects(id),
          user_id TEXT REFERENCES users(id), action TEXT, details TEXT, created_at TEXT);
        CREATE TABLE IF NOT EXISTS files(id TEXT PRIMARY KEY, project_id TEXT REFERENCES projects(id), parent_id TEXT REFERENCES files(id),
          name TEXT NOT NULL, kind TEXT, version INTEGER DEFAULT 1, deleted INTEGER DEFAULT 0, created_at TEXT);
        CREATE TABLE IF NOT EXISTS versions(file_id TEXT REFERENCES files(id), number INTEGER, blob TEXT,
          user_id TEXT REFERENCES users(id), created_at TEXT, PRIMARY KEY(file_id,number));
        CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY, project_id TEXT REFERENCES projects(id),
          user_id TEXT REFERENCES users(id), body TEXT, created_at TEXT);
        CREATE TABLE IF NOT EXISTS conversations(id TEXT PRIMARY KEY, project_id TEXT REFERENCES projects(id),
          user_id TEXT REFERENCES users(id), title TEXT, shared INTEGER DEFAULT 0, created_at TEXT);
        CREATE TABLE IF NOT EXISTS ai_messages(id TEXT PRIMARY KEY, conversation_id TEXT REFERENCES conversations(id),
          role TEXT, body TEXT, sources TEXT DEFAULT '[]', created_at TEXT);
        CREATE TABLE IF NOT EXISTS agents(id TEXT PRIMARY KEY, project_id TEXT REFERENCES projects(id), name TEXT,
          instructions TEXT, tools TEXT DEFAULT '[]', file_ids TEXT DEFAULT '[]');
        CREATE TABLE IF NOT EXISTS proposals(id TEXT PRIMARY KEY, project_id TEXT REFERENCES projects(id),
          user_id TEXT REFERENCES users(id), file_id TEXT REFERENCES files(id), base_version INTEGER,
          name TEXT, payload TEXT, applied INTEGER DEFAULT 0, created_at TEXT);
        CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT);
        """)
        c.execute(
            "INSERT OR IGNORE INTO settings VALUES('company', ?)",
            (
                json.dumps(
                    {
                        "name": "Meridian Consulting",
                        "primary": "#143e35",
                        "accent": "#b7dd79",
                        "font": "Aptos",
                        "tagline": "Van inzicht naar impact",
                        "folders": FOLDERS,
                    }
                ),
            ),
        )


FOLDERS = [
    "01 Brief en planning",
    "02 Klantinformatie",
    "03 Onderzoek",
    "04 Analyse",
    "05 Opleveringen",
    "06 Vergaderingen",
]
STATES = [
    "Concept",
    "Gepland",
    "In uitvoering",
    "In review",
    "On hold",
    "Afgerond",
    "Geannuleerd",
]


def audit(c, project_id, user_id, action, details=""):
    c.execute(
        "INSERT INTO activity VALUES(?,?,?,?,?,?)",
        (uid(), project_id, user_id, action, details, now()),
    )
