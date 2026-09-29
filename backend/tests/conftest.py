import os
import tempfile

import pytest

# Isolate the entire test process from working demo data and real API credentials.
TEST_DIR = tempfile.TemporaryDirectory(prefix="meridian-tests-")
os.environ["DATA_DIR"] = TEST_DIR.name
os.environ["DEMO_MODE"] = "true"
os.environ["AI_PROVIDER"] = "demo"
os.environ["SEED_DEMO"] = "true"
os.environ.pop("OPENAI_API_KEY", None)

from fastapi.testclient import TestClient
from app.main import app, attempts


@pytest.fixture
def clients():
    attempts.clear()
    with TestClient(app):
        result = {}
        for role in ("admin", "eigenaar", "consultant", "nieuw"):
            client = TestClient(app)
            response = client.post(
                "/api/auth/login",
                json={
                    "email": f"{role}@meridian.demo",
                    "password": "MeridianDemo!2026",
                },
            )
            assert response.status_code == 200
            result[role] = client
        yield result
        for client in result.values():
            client.close()
