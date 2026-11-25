"""Operator commands (run from backend/ with the deployment's environment variables set).

uv run python -m app.cli check-config [path]          check env vars + client/client.toml
uv run python -m app.cli apply-client-config [path]   load client/client.toml into the database
uv run python -m app.cli apply-client-config --dry-run [path]   validate only
uv run python -m app.cli setup-vapi-tools   create or update the standard Vapi tools (by
                                            name) and store their ids; every assistant is
                                            then re-synced by the sweep
uv run python -m app.cli sweep              run the recovery sweep once (provisions the AI
                                            assistant, syncs phone routing, sends emails)
uv run python -m app.cli add-admin <user-uuid> [email]
"""

import asyncio
import json
import sys
import uuid
from urllib.parse import urlparse

from app.config import get_settings
from app.db import sessionmaker
from app.models import AdminUser
from app.services import client_profile
from app.services.catalog import ensure_defaults
from app.services.sweep import run_sweep
from app.vapi.template import sync_tools


async def setup_tools() -> None:
    async with sessionmaker()() as session:
        await ensure_defaults(session)
    result = await sync_tools()
    for name, tool_id in result["tool_ids"].items():
        state = "created" if name in result["created"] else "updated"
        print(f"{state} {name}: {tool_id}")
    print("\nTool ids stored in platform settings; assistants will be re-synced by the sweep.")


async def add_admin(user_id: str, email: str | None) -> None:
    async with sessionmaker()() as session:
        session.add(AdminUser(user_id=uuid.UUID(user_id), email=email))
        await session.commit()
    print("admin added")


async def apply_config(path: str | None, dry_run: bool) -> int:
    try:
        profile = client_profile.load(path)
    except client_profile.ProfileError as exc:
        print(f"ERROR: {exc}")
        return 1
    if dry_run:
        print(f"OK: {profile.business.name} — configuration is valid (nothing written).")
        return 0
    async with sessionmaker()() as session:
        await ensure_defaults(session)
        try:
            report = await client_profile.apply(session, profile)
        except client_profile.ProfileError as exc:
            await session.rollback()
            print(f"ERROR: {exc}")
            return 1
    print(f"Applied client configuration for {report['business']['name']}:")
    for item in report["changed"]:
        print(f"  - {item}")
    print(
        "\nThe AI assistant is marked for re-sync; run `python -m app.cli sweep` (or wait for "
        "the scheduled sweep) to push it to Vapi."
    )
    return 0


def check_config(path: str | None) -> int:
    """Check the environment for this deployment's mode, and the client file. Prints only
    whether each value is set, never the value."""
    s = get_settings()
    problems: list[str] = []
    warnings: list[str] = []
    mode = "demo" if s.demo_mode else "production"
    print(f"Deployment mode: {mode.upper()} (DEMO_MODE={'true' if s.demo_mode else 'false'})")
    print(f"ENVIRONMENT={s.environment}")
    required = {
        "DATABASE_URL": s.database_url,
        "PUBLIC_API_URL": s.public_api_url,
        "FRONTEND_URL": s.frontend_url,
        "CORS_ORIGINS": s.cors_origins,
        "SUPABASE_URL": s.supabase_url,
        "SUPABASE_ANON_KEY": s.supabase_anon_key,
        "SUPABASE_SERVICE_ROLE_KEY": s.supabase_service_role_key,
        "VAPI_PRIVATE_KEY": s.vapi_private_key,
        "VAPI_WEBHOOK_SECRET": s.vapi_webhook_secret,
        "INTERNAL_SWEEP_SECRET": s.internal_sweep_secret,
    }
    if mode == "production":
        required["VAPI_CREDENTIAL_ID"] = s.vapi_credential_id
    else:
        required["DEMO_OWNER_PASSWORD"] = s.demo_owner_password
        required["DEMO_ADMIN_PASSWORD"] = s.demo_admin_password
    for name, value in required.items():
        ok = bool(str(value or "").strip())
        print(f"  [{'ok' if ok else 'MISSING'}] {name}")
        if not ok:
            problems.append(f"{name} is not set")
    if s.environment == "production":
        for name, url in (("PUBLIC_API_URL", s.public_api_url), ("FRONTEND_URL", s.frontend_url)):
            if url and urlparse(url).scheme != "https":
                problems.append(f"{name} must use https in production")
        if "localhost" in s.database_url:
            problems.append("DATABASE_URL points at localhost")
    if mode == "production":
        if not s.require_admin_mfa:
            problems.append("REQUIRE_ADMIN_MFA must be true for a client deployment")
        if s.vapi_public_key:
            warnings.append("VAPI_PUBLIC_KEY is only used by the public demo; leave it empty")
    else:
        if not s.vapi_public_key:
            warnings.append("VAPI_PUBLIC_KEY not set: the demo will offer simulated calls only")
    if len(s.internal_sweep_secret or "") < 24:
        problems.append("INTERNAL_SWEEP_SECRET should be a long random value (24+ characters)")
    if len(s.vapi_webhook_secret or "") < 24:
        problems.append("VAPI_WEBHOOK_SECRET should be a long random value (24+ characters)")

    if mode == "production":
        try:
            profile = client_profile.load(path)
            print(f"  [ok] client.toml: {profile.business.name}")
        except client_profile.ProfileError as exc:
            problems.append(str(exc))
    for w in warnings:
        print(f"WARNING: {w}")
    if problems:
        print("\nNOT READY:")
        for p in problems:
            print(f"  - {p}")
        return 1
    print("\nREADY: configuration looks complete.")
    return 0


def main() -> None:
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return
    cmd, rest = args[0], args[1:]
    if cmd == "setup-vapi-tools":
        asyncio.run(setup_tools())
    elif cmd == "sweep":
        print(json.dumps(asyncio.run(run_sweep()), indent=2, default=str))
    elif cmd == "add-admin" and rest:
        asyncio.run(add_admin(rest[0], rest[1] if len(rest) > 1 else None))
    elif cmd == "apply-client-config":
        dry = "--dry-run" in rest
        paths = [a for a in rest if a != "--dry-run"]
        sys.exit(asyncio.run(apply_config(paths[0] if paths else None, dry)))
    elif cmd == "check-config":
        sys.exit(check_config(rest[0] if rest else None))
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
