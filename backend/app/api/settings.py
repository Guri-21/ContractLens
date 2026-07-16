import json
import os
from pathlib import Path

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.api.deps import require_role

router = APIRouter(prefix="/api/settings", tags=["settings"])


class PlatformSettings(BaseModel):
    indianLawGrounding: bool = True
    autoSaveAnalysis: bool = True
    showProgressiveResults: bool = True
    cacheEnabled: bool = True
    cacheTtlSeconds: int = Field(default=30, ge=5, le=300)
    strictRefusalMode: bool = True


def _settings_path() -> Path:
    configured_path = os.getenv("PLATFORM_SETTINGS_PATH")
    if configured_path:
        return Path(configured_path)
    return Path("runtime") / "platform_settings.json"


def _read_settings() -> PlatformSettings:
    path = _settings_path()
    if not path.exists():
        return PlatformSettings()
    try:
        return PlatformSettings.model_validate(json.loads(path.read_text(encoding="utf-8")))
    except (OSError, json.JSONDecodeError, ValueError):
        return PlatformSettings()


def _write_settings(settings: PlatformSettings) -> None:
    path = _settings_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(settings.model_dump_json(indent=2), encoding="utf-8")


@router.get("/", response_model=PlatformSettings)
async def get_platform_settings(current_user=Depends(require_role(["Admin"]))):
    return _read_settings()


@router.put("/", response_model=PlatformSettings)
async def update_platform_settings(
    settings: PlatformSettings,
    current_user=Depends(require_role(["Admin"])),
):
    _write_settings(settings)
    return settings
