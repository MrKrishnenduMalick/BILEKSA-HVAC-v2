"""Per-client configuration file (client/client.toml): one place for a client's business data.

Each paying client gets their own deployment (own repository copy, database, Vapi account).
The application code is identical for every client; only this file, the logo and the
environment variables (secrets) differ. `python -m app.cli apply-client-config` loads the file
into the database through the same validated functions the admin panel uses, so the file and
the admin panel can never disagree about what is valid.

Rules:
- Business data only. Secrets (API keys, database URLs, passwords) are refused: they belong in
  environment variables.
- Idempotent: applying the same file twice changes nothing the second time.
- Only the sections present in the file are touched. A section that is present is the source of
  truth for that section (services, ZIP codes, FAQs, holidays not listed are removed).
- Package assignment, activation, payments and owner invitations stay password-confirmed admin
  actions in the admin panel; they are deliberately NOT in this file.
"""

import os
import re
import tomllib
from datetime import date, time
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field, ValidationError, field_validator
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Business, Faq, HolidayClosure, Service, ServiceArea
from app.services import client_config, emergency, provisioning
from app.services.audit import audit
from app.validation import clean_text, normalize_zip

DEFAULT_PATH = Path(
    os.environ.get("CLIENT_CONFIG_PATH")
    or Path(__file__).resolve().parents[3] / "client" / "client.toml"
)
DAYS = ("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday")
SECRET_HINTS = re.compile(
    r"(sk_live|sk_test|eyJhbGci|-----BEGIN|postgres(ql)?(\+asyncpg)?://|service_role|"
    r"password\s*=|api[_-]?key)",
    re.IGNORECASE,
)
SECRET_KEYS = {"password", "secret", "token", "api_key", "apikey", "private_key", "database_url"}


class ProfileError(ValueError):
    pass


# ---------- schema (friendly validation; the admin-panel validators run again on apply) ------


class Branding(BaseModel):
    product_name: str = Field(default="BILEKSA", max_length=60)
    company_name: str | None = Field(default=None, max_length=120)
    tagline: str | None = Field(default=None, max_length=160)
    logo: str | None = Field(default=None, max_length=200)
    accent: str = Field(default="#2dd4bf", pattern=r"^#[0-9a-fA-F]{6}$")
    support_email: str | None = Field(default=None, max_length=254)
    support_phone: str | None = Field(default=None, max_length=30)
    public_site: str = Field(default="login", pattern="^(marketing|login)$")


class BusinessSection(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    contact_email: str | None = None
    contact_phone: str | None = None
    notification_email: str | None = None
    address: str | None = Field(default=None, max_length=300)
    website: str | None = Field(default=None, max_length=300)
    timezone: str = "America/Chicago"


class RoutingSection(BaseModel):
    transfer_number: str | None = None
    fallback_number: str | None = None
    emergency_number: str | None = None
    transfer_mode: str = Field(default="blind", pattern="^(blind|warm)$")
    transfer_in_hours: bool = True
    transfer_after_hours: bool = False
    transfer_emergencies_after_hours: bool = True
    emergency_preference: str = Field(
        default="transfer_then_callback", pattern="^(transfer_then_callback|callback_only)$"
    )
    after_hours_message: str | None = Field(default=None, max_length=300)
    unavailable_message: str | None = Field(default=None, max_length=300)


class AssistantSection(BaseModel):
    instructions: str | None = Field(default=None, max_length=1500)
    appointment_policy: str | None = Field(default=None, max_length=500)


class ServiceItem(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=500)
    segment: str | None = Field(default=None, pattern="^(residential|commercial|industrial)$")
    price_min: float | None = Field(default=None, ge=0, le=100_000)
    price_max: float | None = Field(default=None, ge=0, le=100_000)
    price_note: str | None = Field(default=None, max_length=200)
    available: bool = True


class FaqItem(BaseModel):
    question: str = Field(min_length=3, max_length=300)
    answer: str = Field(min_length=1, max_length=1000)


class HolidayItem(BaseModel):
    date: date
    label: str = Field(min_length=1, max_length=100)
    hours: str = "closed"


class AreaSection(BaseModel):
    zip_codes: list[str] = Field(default_factory=list, max_length=500)
    label: str | None = Field(default=None, max_length=60)

    @field_validator("zip_codes")
    @classmethod
    def _zips(cls, v: list[str]) -> list[str]:
        out = []
        for z in v:
            n = normalize_zip(z)
            if n is None:
                raise ValueError(f"'{z}' is not a 5-digit US ZIP code")
            if n not in out:
                out.append(n)
        return out


class EmergencyItem(BaseModel):
    key: str = Field(min_length=2, max_length=40)
    label: str | None = Field(default=None, max_length=60)
    transfer: bool = True
    instructions: str = Field(default="", max_length=600)


class Profile(BaseModel):
    branding: Branding = Field(default_factory=Branding)
    business: BusinessSection
    routing: RoutingSection | None = None
    assistant: AssistantSection | None = None
    hours: dict[str, str] | None = None
    holidays: list[HolidayItem] | None = None
    service_area: AreaSection | None = None
    services: list[ServiceItem] | None = None
    faqs: list[FaqItem] | None = None
    policies: list[FaqItem] | None = None
    emergency_rules: list[EmergencyItem] | None = None


# ---------- loading ----------


def _hunt_secrets(node: Any, path: str = "") -> None:
    if isinstance(node, dict):
        for k, v in node.items():
            if str(k).lower() in SECRET_KEYS:
                raise ProfileError(
                    f"'{path}{k}' looks like a secret. Secrets go in environment variables, "
                    "never in client.toml."
                )
            _hunt_secrets(v, f"{path}{k}.")
    elif isinstance(node, list):
        for i, v in enumerate(node):
            _hunt_secrets(v, f"{path}{i}.")
    elif isinstance(node, str) and SECRET_HINTS.search(node):
        raise ProfileError(
            f"'{path.rstrip('.')}' contains something that looks like a secret or connection "
            "string. Keep secrets in environment variables."
        )


def parse_hours(text: str) -> tuple[time, time] | None:
    """'07:00-19:00' -> (07:00, 19:00); 'closed' -> None."""
    t = text.strip().lower()
    if t in ("closed", ""):
        return None
    m = re.fullmatch(r"(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})", t)
    if not m:
        raise ProfileError(f"Hours '{text}' must look like 07:00-19:00 or closed")
    h1, m1, h2, m2 = (int(x) for x in m.groups())
    if h2 == 24 and m2 == 0:
        h2, m2 = 23, 59
    try:
        start, end = time(h1, m1), time(h2, m2)
    except ValueError as exc:
        raise ProfileError(f"Hours '{text}': {exc}") from exc
    if end <= start:
        raise ProfileError(f"Hours '{text}': closing time must be after opening time")
    return start, end


def load(path: str | Path | None = None) -> Profile:
    p = Path(path) if path else DEFAULT_PATH
    if not p.exists():
        raise ProfileError(f"{p} not found. See CLIENT-CONFIGURATION-GUIDE.md.")
    try:
        raw = tomllib.loads(p.read_text(encoding="utf-8"))
    except tomllib.TOMLDecodeError as exc:
        raise ProfileError(f"{p.name} is not valid TOML: {exc}") from exc
    _hunt_secrets(raw)
    try:
        profile = Profile.model_validate(raw)
    except ValidationError as exc:
        lines = [f"- {'.'.join(str(x) for x in e['loc'])}: {e['msg']}" for e in exc.errors()[:20]]
        raise ProfileError("client.toml has problems:\n" + "\n".join(lines)) from exc
    if profile.hours is not None:
        unknown = set(profile.hours) - set(DAYS)
        if unknown:
            raise ProfileError(f"[hours] unknown day(s): {', '.join(sorted(unknown))}")
        for v in profile.hours.values():
            parse_hours(v)
    for h in profile.holidays or []:
        parse_hours(h.hours)
    if profile.services is not None:
        names = [s.name.strip().lower() for s in profile.services]
        if len(set(names)) != len(names):
            raise ProfileError("[[services]] names must be unique")
        for s in profile.services:
            if s.price_min is not None and s.price_max is not None and s.price_max < s.price_min:
                raise ProfileError(f"Service '{s.name}': price_max is below price_min")
    return profile


def _cents(v: float | None) -> int | None:
    return None if v is None else int(round(v * 100))


# ---------- applying ----------


async def _target_business(session: AsyncSession, name: str) -> Business | None:
    rows = (await session.execute(select(Business).order_by(Business.created_at))).scalars().all()
    if not rows:
        return None
    if len(rows) == 1:
        return rows[0]
    match = [b for b in rows if b.name.strip().lower() == name.strip().lower()]
    if len(match) == 1:
        return match[0]
    raise ProfileError(
        f"This database has {len(rows)} clients and none (or several) is named '{name}'. "
        "A client deployment holds one business; use the admin panel on shared databases."
    )


async def apply(session: AsyncSession, profile: Profile, actor: str = "config:client.toml") -> dict:
    report: dict[str, Any] = {"business": None, "changed": []}
    b = await _target_business(session, profile.business.name)
    if b is None:
        b = await client_config.create_business(
            session,
            client_config.BusinessCreate(
                name=profile.business.name,
                contact_email=profile.business.contact_email,
                contact_phone=profile.business.contact_phone,
                address=profile.business.address,
                website=profile.business.website,
                timezone=profile.business.timezone,
            ),
            actor,
        )
        report["changed"].append("business created")
    bid = b.id
    report["business"] = {"id": str(bid), "name": profile.business.name}

    update: dict[str, Any] = profile.business.model_dump()
    if profile.routing is not None:
        update.update(profile.routing.model_dump())
    if profile.assistant is not None:
        update["assistant_instructions"] = profile.assistant.instructions
        update["appointment_policy"] = profile.assistant.appointment_policy
    if profile.emergency_rules is not None:
        rules = []
        for r in profile.emergency_rules:
            label = r.label or emergency.BUILTIN.get(r.key)
            if not label:
                raise ProfileError(f"Emergency rule '{r.key}' needs a label")
            rules.append(
                emergency.EmergencyRule(
                    key=r.key, label=label, transfer=r.transfer, instructions=r.instructions
                )
            )
        update["emergency_rules"] = rules
    try:
        await client_config.update_business(
            session, bid, client_config.BusinessUpdate(**update), actor
        )
    except client_config.ConfigError as exc:
        raise ProfileError(str(exc)) from exc
    report["changed"].append("business profile and routing")

    if profile.hours is not None:
        rows = []
        for i, day in enumerate(DAYS):
            parsed = parse_hours(profile.hours.get(day, "closed"))
            if parsed:
                rows.append(
                    client_config.HoursRow(weekday=i, open_time=parsed[0], close_time=parsed[1])
                )
        await client_config.put_hours(session, bid, rows, actor)
        report["changed"].append(f"hours ({len(rows)} open days)")

    if profile.holidays is not None:
        await session.execute(delete(HolidayClosure).where(HolidayClosure.business_id == bid))
        for h in profile.holidays:
            parsed = parse_hours(h.hours)
            session.add(
                HolidayClosure(
                    business_id=bid,
                    date=h.date,
                    label=clean_text(h.label, 100),
                    closed=parsed is None,
                    open_time=parsed[0] if parsed else None,
                    close_time=parsed[1] if parsed else None,
                )
            )
        await session.commit()
        report["changed"].append(f"holidays ({len(profile.holidays)})")

    if profile.service_area is not None:
        wanted = set(profile.service_area.zip_codes)
        existing = {
            a.zip_code: a
            for a in (
                await session.execute(select(ServiceArea).where(ServiceArea.business_id == bid))
            ).scalars()
        }
        for z, row in existing.items():
            if z not in wanted:
                await session.delete(row)
        for z in profile.service_area.zip_codes:
            if z not in existing:
                session.add(
                    ServiceArea(business_id=bid, zip_code=z, label=profile.service_area.label)
                )
            elif profile.service_area.label is not None:
                existing[z].label = profile.service_area.label
        await session.commit()
        report["changed"].append(f"service area ({len(wanted)} ZIP codes)")

    if profile.services is not None:
        existing_s = {
            s.name.strip().lower(): s
            for s in (
                await session.execute(select(Service).where(Service.business_id == bid))
            ).scalars()
        }
        keep = set()
        for item in profile.services:
            key = item.name.strip().lower()
            keep.add(key)
            values = {
                "name": clean_text(item.name, 120),
                "description": clean_text(item.description, 500),
                "segment": item.segment,
                "price_min_cents": _cents(item.price_min),
                "price_max_cents": _cents(item.price_max),
                "price_note": clean_text(item.price_note, 200),
                "available": item.available,
            }
            row = existing_s.get(key)
            if row is None:
                session.add(Service(business_id=bid, **values))
            else:
                for k, v in values.items():
                    setattr(row, k, v)
        for key, row in existing_s.items():
            if key not in keep:
                await session.delete(row)
        await session.commit()
        report["changed"].append(f"services ({len(profile.services)})")

    for section, category in (("faqs", "faq"), ("policies", "policy")):
        items = getattr(profile, section)
        if items is None:
            continue
        await session.execute(delete(Faq).where(Faq.business_id == bid, Faq.category == category))
        for f in items:
            session.add(
                Faq(
                    business_id=bid,
                    category=category,
                    question=clean_text(f.question, 300),
                    answer=clean_text(f.answer, 1000),
                    active=True,
                )
            )
        await session.commit()
        report["changed"].append(f"{section} ({len(items)})")

    await provisioning.mark_needs_update(session, bid)
    await audit(
        session, actor=actor, action="client_config_applied", business_id=bid, detail=report
    )
    await session.commit()
    return report


async def summary(session: AsyncSession) -> dict:
    """What a deployment currently holds (for check-config)."""
    n = (await session.execute(select(func.count()).select_from(Business))).scalar() or 0
    return {"businesses": n}
