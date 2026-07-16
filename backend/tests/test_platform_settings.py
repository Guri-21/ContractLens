from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.deps import get_current_user
from app.api.settings import router as settings_router


def build_client(tmp_path, monkeypatch):
    monkeypatch.setenv("PLATFORM_SETTINGS_PATH", str(tmp_path / "platform_settings.json"))
    app = FastAPI()
    app.include_router(settings_router)
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(
        id="admin-1",
        role=SimpleNamespace(name="Admin"),
    )
    return TestClient(app)


def test_platform_settings_save_and_reload_cache_time(tmp_path, monkeypatch):
    client = build_client(tmp_path, monkeypatch)

    default_response = client.get("/api/settings/")
    assert default_response.status_code == 200
    assert default_response.json()["cacheTtlSeconds"] == 30

    save_response = client.put(
        "/api/settings/",
        json={
            "indianLawGrounding": True,
            "autoSaveAnalysis": True,
            "showProgressiveResults": True,
            "cacheEnabled": True,
            "cacheTtlSeconds": 75,
            "strictRefusalMode": True,
        },
    )
    assert save_response.status_code == 200
    assert save_response.json()["cacheTtlSeconds"] == 75

    reload_response = client.get("/api/settings/")
    assert reload_response.status_code == 200
    assert reload_response.json()["cacheTtlSeconds"] == 75
