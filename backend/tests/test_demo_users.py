from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.auth import router as auth_router
from app.database import get_db


class FakeUserTable:
    async def find_many(self, where=None, include=None, order=None):
        assert include == {"role": True}
        email_filter = set(where["AND"][0]["email"]["in"])
        role_names = set(where["AND"][1]["role"]["is"]["name"]["in"])
        users = [
            SimpleNamespace(
                id="admin-1",
                email="admin@contractlens.com",
                role=SimpleNamespace(name="Admin"),
            ),
            SimpleNamespace(
                id="advisor-1",
                email="advisor1@contractlens.com",
                role=SimpleNamespace(name="Legal Reviewer"),
            ),
            SimpleNamespace(
                id="advisor-2",
                email="advisor2@contractlens.com",
                role=SimpleNamespace(name="Legal Reviewer"),
            ),
        ]
        return [user for user in users if user.email in email_filter and user.role.name in role_names]


class FakeDatabase:
    def __init__(self):
        self.user = FakeUserTable()


def build_client():
    app = FastAPI()
    database = FakeDatabase()
    app.include_router(auth_router)
    app.dependency_overrides[get_db] = lambda: database
    return TestClient(app)


def test_demo_users_endpoint_lists_admins_and_legal_advisors_without_passwords():
    client = build_client()

    response = client.get("/api/auth/demo-users")

    assert response.status_code == 200
    payload = response.json()
    assert payload == {
        "admins": [
            {
                "id": "admin-1",
                "email": "admin@contractlens.com",
                "role": "Admin",
                "displayName": "Admin",
            }
        ],
        "advisors": [
            {
                "id": "advisor-1",
                "email": "advisor1@contractlens.com",
                "role": "Legal Reviewer",
                "displayName": "Legal Advisor 1",
            },
            {
                "id": "advisor-2",
                "email": "advisor2@contractlens.com",
                "role": "Legal Reviewer",
                "displayName": "Legal Advisor 2",
            },
        ],
    }
    assert "password" not in str(payload).lower()
