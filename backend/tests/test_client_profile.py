"""Per-client configuration file, analytics, call detail, customers and the new profile fields."""

import uuid
from pathlib import Path

import pytest
from sqlalchemy import func, select

from app import db
from app.models import Business, Faq, HolidayClosure, Service, ServiceArea
from app.services import client_profile
from app.vapi import template
from tests.conftest import VAPI_HEADERS, admin_headers, auth
from tests.helpers import call_tool, end_report, ready_business

MASTER = Path(__file__).resolve().parents[2] / "client" / "client.toml"


def _write(tmp_path, text: str) -> Path:
    p = tmp_path / "client.toml"
    p.write_text(text)
    return p


MINIMAL = """
[business]
name = "Acme Air"
timezone = "America/Chicago"

[hours]
monday = "08:00-17:00"
saturday = "closed"

[service_area]
zip_codes = ["77002", "77003-1234"]

[[services]]
name = "AC repair"
segment = "residential"
price_min = 89
price_max = 450

[[services]]
name = "Rooftop unit service"
segment = "commercial"

[[faqs]]
question = "Do you offer financing?"
answer = "Yes."
"""


def test_master_client_file_is_valid():
    profile = client_profile.load(MASTER)
    assert profile.business.name == "Houston Comfort HVAC"
    assert {s.segment for s in profile.services} >= {"residential", "commercial", "industrial"}
    assert profile.branding.public_site == "marketing"


@pytest.mark.parametrize(
    "bad,message",
    [
        ('[business]\nname = "A"\n', "business.name"),
        ('[business]\nname = "Acme"\npassword = "x"\n', "looks like a secret"),
        (
            '[business]\nname = "Acme"\naddress = "postgresql://u:p@db.supabase.co/x"\n',
            "connection string",
        ),
        ('[business]\nname = "Acme"\n[hours]\nmonday = "9 to 5"\n', "07:00-19:00"),
        ('[business]\nname = "Acme"\n[hours]\nfunday = "09:00-17:00"\n', "unknown day"),
        ('[business]\nname = "Acme"\n[service_area]\nzip_codes = ["7700"]\n', "5-digit"),
        (
            '[business]\nname = "Acme"\n[[services]]\nname = "X"\nprice_min = 5\nprice_max = 1\n',
            "price_max",
        ),
        (
            '[business]\nname = "Acme"\n[[services]]\nname = "X"\n[[services]]\nname = "x"\n',
            "unique",
        ),
        ('[business\nname = "Acme"\n', "not valid TOML"),
    ],
)
def test_invalid_files_are_explained(tmp_path, bad, message):
    with pytest.raises(client_profile.ProfileError) as exc:
        client_profile.load(_write(tmp_path, bad))
    assert message in str(exc.value)


async def _count(model) -> int:
    async with db.sessionmaker()() as s:
        return (await s.execute(select(func.count()).select_from(model))).scalar()


async def test_apply_creates_then_updates_idempotently(tmp_path, fake_vapi):
    profile = client_profile.load(_write(tmp_path, MINIMAL))
    async with db.sessionmaker()() as s:
        report = await client_profile.apply(s, profile)
    assert "business created" in report["changed"]
    assert await _count(Business) == 1 and await _count(Service) == 2
    assert await _count(ServiceArea) == 2 and await _count(Faq) == 1
    # the same file again: nothing duplicated
    async with db.sessionmaker()() as s:
        report = await client_profile.apply(s, profile)
    assert "business created" not in report["changed"]
    assert await _count(Business) == 1 and await _count(Service) == 2 and await _count(Faq) == 1
    # the file is the source of truth for the sections it contains
    changed = MINIMAL.replace(
        '[[services]]\nname = "Rooftop unit service"\nsegment = "commercial"\n', ""
    ).replace('"77003-1234"', '"77019"')
    async with db.sessionmaker()() as s:
        await client_profile.apply(s, client_profile.load(_write(tmp_path, changed)))
        names = (await s.execute(select(Service.name))).scalars().all()
        zips = sorted((await s.execute(select(ServiceArea.zip_code))).scalars().all())
        svc = (await s.execute(select(Service))).scalar_one()
    assert names == ["AC repair"] and zips == ["77002", "77019"]
    assert svc.segment == "residential" and (svc.price_min_cents, svc.price_max_cents) == (
        8900,
        45000,
    )


async def test_apply_master_file_end_to_end(fake_vapi):
    async with db.sessionmaker()() as s:
        await client_profile.apply(s, client_profile.load(MASTER))
        b = (await s.execute(select(Business))).scalar_one()
        holidays = (await s.execute(select(HolidayClosure))).scalars().all()
        policies = (await s.execute(select(Faq).where(Faq.category == "policy"))).scalars().all()
    assert (
        b.transfer_number == "+17135550123" and b.emergency_preference == "transfer_then_callback"
    )
    assert "24/7 emergency service" in b.assistant_instructions
    assert b.appointment_policy.startswith("Visits are booked")
    keys = [r["key"] for r in b.emergency_rules]
    assert "flooding_near_furnace" in keys and "refrigeration_failure" in keys
    assert len(holidays) == 1 and holidays[0].closed and len(policies) == 2


async def test_apply_refuses_ambiguous_shared_database(tmp_path, client, fake_vapi):
    await ready_business(client, fake_vapi, name="One")
    await ready_business(client, fake_vapi, name="Two")
    with pytest.raises(client_profile.ProfileError, match="has 2 clients"):
        async with db.sessionmaker()() as s:
            await client_profile.apply(s, client_profile.load(_write(tmp_path, MINIMAL)))


async def test_service_segments_and_company_instructions(client, fake_vapi):
    _, bid, aid = await ready_business(client, fake_vapi)
    h = admin_headers()
    r = await client.post(
        f"/admin/api/clients/{bid}/services",
        json={"name": "Rooftop unit service", "segment": "commercial"},
        headers=h,
    )
    assert r.status_code in (200, 201), r.text
    assert r.json()["segment"] == "commercial"
    bad = await client.post(
        f"/admin/api/clients/{bid}/services", json={"name": "X", "segment": "space"}, headers=h
    )
    assert bad.status_code == 422
    _, res = await call_tool(
        client,
        "get_business_information",
        {"topic": "services", "segment": "commercial"},
        aid,
        "sg",
    )
    names = [x["service"] for x in res["services"]]
    assert "Rooftop unit service" in names and "AC Repair" in names  # unsegmented = everyone
    _, res = await call_tool(
        client,
        "get_business_information",
        {"topic": "services", "segment": "residential"},
        aid,
        "sg",
    )
    assert "Rooftop unit service" not in [x["service"] for x in res["services"]]
    r = await client.patch(
        f"/admin/api/clients/{bid}",
        json={
            "assistant_instructions": "Always mention our 24/7 service.",
            "appointment_policy": "2-hour windows.",
        },
        headers=h,
    )
    assert r.status_code == 200, r.text
    detail = (await client.get(f"/admin/api/clients/{bid}", headers=h)).json()
    assert detail["business"]["appointment_policy"] == "2-hour windows."
    assert detail["business"]["assistant_instructions"] == "Always mention our 24/7 service."
    _, res = await call_tool(client, "request_appointment", {}, aid, "ap")
    assert res["appointment_policy"] == "2-hour windows."
    body = template.build_assistant("X", str(uuid.uuid4()), "k", 1, None, None, "Be brief.")
    assert "COMPANY-SPECIFIC INSTRUCTIONS" in body["model"]["messages"][0]["content"]
    assert "Be brief." in body["model"]["messages"][0]["content"]


async def test_analytics_call_detail_and_customers(client, fake_vapi):
    uid, bid, aid = await ready_business(client, fake_vapi)
    h = auth(uid)
    await call_tool(
        client,
        "save_customer_lead",
        {"name": "Ann", "callback_number": "7135550101", "number_confirmed": True,
         "service_type": "ac_repair"},
        aid,
        "a1",
    )  # fmt: skip
    await client.post(
        "/vapi/events", json=end_report(aid, "a1", duration=120), headers=VAPI_HEADERS
    )
    await call_tool(client, "check_emergency_routing", {"emergency_type": "gas"}, aid, "a2")
    await client.post("/vapi/events", json=end_report(aid, "a2", duration=60), headers=VAPI_HEADERS)

    r = (await client.get("/api/analytics?days=7", headers=h)).json()
    assert len(r["series"]) == 7 and r["totals"]["calls"] == 2
    assert sum(p["calls"] for p in r["series"]) == 2
    assert r["totals"]["urgent"] == 1 and r["totals"]["leads"] == 2
    assert sum(x["count"] for x in r["by_hour"]) == 2
    assert {x["key"] for x in r["by_emergency"]} == {"gas"}
    assert (await client.get("/api/analytics?days=3", headers=h)).status_code == 422

    calls = (await client.get("/api/calls", headers=h)).json()["items"]
    cid = next(c["id"] for c in calls if c["reference"] == "a2")
    d = (await client.get(f"/api/calls/{cid}", headers=h)).json()
    assert d["urgent"] and d["lead"]["urgency"] == "emergency"
    assert any(e["kind"] == "emergency" for e in d["timeline"])

    people = (await client.get("/api/customers", headers=h)).json()
    ann = next(p for p in people if p["name"] == "Ann")
    assert ann["phone"] == "+17135550101" and ann["requests"] == 1 and ann["calls"] == 1

    # another client can't read this client's call
    other_uid, _, _ = await ready_business(client, fake_vapi, name="Other Co")
    assert (await client.get(f"/api/calls/{cid}", headers=auth(other_uid))).status_code == 404
    # admin analytics covers every client
    a = (await client.get("/admin/api/analytics?days=7", headers=admin_headers())).json()
    assert {c["name"] for c in a["clients"]} >= {"ABC Heating & Cooling", "Other Co"}
    assert (await client.get("/admin/api/analytics", headers=h)).status_code == 403
