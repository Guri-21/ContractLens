from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.auth import router as auth_router
from app.core.security import get_password_hash
from app.database import get_db


class FakeRoleTable:
    def __init__(self):
        self.roles = {
            "Admin": SimpleNamespace(id="role-admin", name="Admin"),
            "Legal Reviewer": SimpleNamespace(id="role-reviewer", name="Legal Reviewer"),
        }

    async def find_unique(self, where=None):
        return self.roles.get(where["name"])

    async def create(self, data=None):
        role = SimpleNamespace(id=f"role-{data['name'].lower().replace(' ', '-')}", name=data["name"])
        self.roles[data["name"]] = role
        return role


class FakeUserTable:
    def __init__(self, role_table):
        self.role_table = role_table
        self.users = [
            self._user("admin-1", "admin@contractlens.com", "Admin", "old-password"),
            self._user("advisor-1", "advisor1@contractlens.com", "Legal Reviewer", "old-password"),
            self._user("advisor-2", "advisor2@contractlens.com", "Legal Reviewer", "old-password"),
        ]

    def _user(self, user_id, email, role_name, password):
        role = self.role_table.roles[role_name]
        return SimpleNamespace(
            id=user_id,
            email=email,
            hashed_password=get_password_hash(password),
            role_id=role.id,
            role=SimpleNamespace(name=role.name),
        )

    async def find_unique(self, where=None, include=None):
        email = where.get("email")
        return next((user for user in self.users if user.email == email), None)

    async def update(self, where=None, data=None):
        user = await self.find_unique(where=where)
        for key, value in (data or {}).items():
            setattr(user, key, value)
            if key == "role_id":
                role = next(role for role in self.role_table.roles.values() if role.id == value)
                user.role = SimpleNamespace(name=role.name)
        return user

    async def create(self, data=None):
        role = next(role for role in self.role_table.roles.values() if role.id == data["role_id"])
        user = SimpleNamespace(
            id=f"user-{len(self.users) + 1}",
            email=data["email"],
            hashed_password=data["hashed_password"],
            role_id=data["role_id"],
            role=SimpleNamespace(name=role.name),
        )
        self.users.append(user)
        return user

    async def find_many(self, where=None, include=None, order=None):
        assert include == {"role": True}
        role_names = set(where["role"]["is"]["name"]["in"])
        return [user for user in self.users if user.role.name in role_names]


class FakeDatabase:
    def __init__(self):
        self.role = FakeRoleTable()
        self.user = FakeUserTable(self.role)


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
            {
                "id": "user-4",
                "email": "advisor3@contractlens.com",
                "role": "Legal Reviewer",
                "displayName": "Legal Advisor 3",
            },
            {
                "id": "user-5",
                "email": "advisor4@contractlens.com",
                "role": "Legal Reviewer",
                "displayName": "Legal Advisor 4",
            },
            {
                "id": "user-6",
                "email": "advisor5@contractlens.com",
                "role": "Legal Reviewer",
                "displayName": "Legal Advisor 5",
            },
        ],
    }
    assert "password" not in str(payload).lower()
