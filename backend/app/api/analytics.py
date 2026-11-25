"""Analytics for the dashboards: daily series and breakdowns, call detail and customers.

Owner endpoints run under the caller's RLS role AND filter by business_id (same model as
dashboard.py). Every number is a count or sum of real rows; nothing is estimated. Days are
bucketed in the business's own time zone."""

import uuid
from datetime import UTC, date, datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dashboard import call_out, lead_out
from app.db import get_session
from app.models import Business, Call, Lead, LeadEvent
from app.security.auth import CurrentUser, current_admin
from app.security.rls import rls_read_session
from app.security.shared import rate_limit_dashboard

router = APIRouter(tags=["analytics"], dependencies=[Depends(rate_limit_dashboard)])

ANSWERED = ("answered", "lead_captured", "callback_requested", "appointment_requested", "transfer")


def _days(n: int, tz: ZoneInfo) -> list[date]:
    today = datetime.now(tz).date()
    return [today - timedelta(days=i) for i in range(n - 1, -1, -1)]


async def _series(session: AsyncSession, where, tz_name: str, start: datetime) -> dict[str, dict]:
    """Per local day: calls, AI-answered, urgent, minutes."""
    day = func.date(func.timezone(tz_name, Call.started_at))
    rows = (
        await session.execute(
            select(
                day.label("d"),
                func.count().label("calls"),
                func.count().filter(Call.outcome.in_(ANSWERED)).label("answered"),
                func.count().filter(Call.urgent.is_(True)).label("urgent"),
                func.coalesce(func.sum(Call.billable_seconds), 0).label("seconds"),
            )
            .where(where, Call.started_at >= start)
            .group_by(day)
        )
    ).all()
    return {
        r.d.isoformat(): {
            "calls": r.calls,
            "answered": r.answered,
            "urgent": r.urgent,
            "minutes": round(int(r.seconds) / 60, 1),
        }
        for r in rows
    }


async def _breakdown(session: AsyncSession, column, where, start: datetime, model=Call) -> list:
    rows = (
        await session.execute(
            select(column.label("k"), func.count().label("n"))
            .where(where, model.created_at >= start if model is Lead else Call.started_at >= start)
            .group_by(column)
            .order_by(func.count().desc())
        )
    ).all()
    return [{"key": r.k or "unknown", "count": r.n} for r in rows]


@router.get("/api/analytics")
async def analytics(ctx=Depends(rls_read_session), days: int = Query(30, ge=7, le=90)):
    session, m = ctx
    bid = m.business_id
    business = (await session.execute(select(Business).where(Business.id == bid))).scalar_one()
    tz = ZoneInfo(business.timezone)
    day_list = _days(days, tz)
    start = datetime.combine(day_list[0], datetime.min.time(), tz).astimezone(UTC)
    prev_start = start - timedelta(days=days)
    in_biz = Call.business_id == bid

    series = await _series(session, in_biz, business.timezone, start)
    lead_day = func.date(func.timezone(business.timezone, Lead.created_at))
    lead_rows = (
        await session.execute(
            select(lead_day.label("d"), func.count().label("n"))
            .where(Lead.business_id == bid, Lead.created_at >= start)
            .group_by(lead_day)
        )
    ).all()
    leads_by_day = {r.d.isoformat(): r.n for r in lead_rows}
    points = [
        {
            "date": d.isoformat(),
            **series.get(d.isoformat(), {"calls": 0, "answered": 0, "urgent": 0, "minutes": 0}),
            "leads": leads_by_day.get(d.isoformat(), 0),
        }
        for d in day_list
    ]

    async def totals(since: datetime, until: datetime | None) -> dict:
        cw = and_(in_biz, Call.started_at >= since, *([Call.started_at < until] if until else []))
        lw = and_(
            Lead.business_id == bid,
            Lead.created_at >= since,
            *([Lead.created_at < until] if until else []),
        )
        c = (
            await session.execute(
                select(
                    func.count(),
                    func.count().filter(Call.outcome.in_(ANSWERED)),
                    func.count().filter(Call.urgent.is_(True)),
                    func.coalesce(func.sum(Call.billable_seconds), 0),
                    func.coalesce(func.avg(Call.duration_seconds), 0),
                ).where(cw)
            )
        ).one()
        lc = (
            await session.execute(
                select(
                    func.count(),
                    func.count().filter(Lead.appointment_status != "none"),
                    func.count().filter(Lead.callback_status != "none"),
                ).where(lw)
            )
        ).one()
        return {
            "calls": c[0],
            "answered": c[1],
            "urgent": c[2],
            "minutes": round(int(c[3]) / 60, 1),
            "avg_call_seconds": int(round(float(c[4]))),
            "leads": lc[0],
            "appointments": lc[1],
            "callbacks": lc[2],
            "answer_rate": round(c[1] / c[0] * 100) if c[0] else None,
        }

    hour = func.extract("hour", func.timezone(business.timezone, Call.started_at))
    hour_rows = (
        await session.execute(
            select(hour.label("h"), func.count().label("n"))
            .where(in_biz, Call.started_at >= start)
            .group_by(hour)
        )
    ).all()
    by_hour = {int(r.h): r.n for r in hour_rows}
    return {
        "days": days,
        "timezone": business.timezone,
        "series": points,
        "totals": await totals(start, None),
        "previous": await totals(prev_start, start),
        "by_outcome": await _breakdown(session, Call.outcome, in_biz, start),
        "by_service": await _breakdown(
            session, Lead.service_type, Lead.business_id == bid, start, Lead
        ),
        "by_urgency": await _breakdown(session, Lead.urgency, Lead.business_id == bid, start, Lead),
        "by_emergency": await _breakdown(
            session, Call.emergency_type, and_(in_biz, Call.urgent.is_(True)), start
        ),
        "by_hour": [{"hour": h, "count": by_hour.get(h, 0)} for h in range(24)],
    }


@router.get("/api/calls/{call_id}")
async def call_detail(call_id: uuid.UUID, ctx=Depends(rls_read_session)):
    session, m = ctx
    call = (
        await session.execute(
            select(Call).where(Call.id == call_id, Call.business_id == m.business_id)
        )
    ).scalar_one_or_none()
    if call is None:
        raise HTTPException(404, "Not found")
    lead = None
    timeline: list[dict] = []
    if call.lead_id:
        lead = (
            await session.execute(
                select(Lead).where(Lead.id == call.lead_id, Lead.business_id == m.business_id)
            )
        ).scalar_one_or_none()
    if lead is not None:
        events = (
            await session.execute(
                select(LeadEvent)
                .where(LeadEvent.lead_id == lead.id, LeadEvent.business_id == m.business_id)
                .order_by(LeadEvent.created_at)
            )
        ).scalars()
        timeline = [
            {"kind": e.kind, "detail": e.detail, "actor": e.actor, "at": e.created_at.isoformat()}
            for e in events
        ]
    return {
        **call_out(call, lead),
        "ended_at": call.ended_at.isoformat() if call.ended_at else None,
        "ended_reason": call.ended_reason,
        "transfer_destination": call.transfer_destination,
        "lead": lead_out(lead) if lead else None,
        "timeline": timeline,
    }


@router.get("/api/customers")
async def customers(ctx=Depends(rls_read_session), limit: int = Query(200, ge=1, le=500)):
    """People who called, grouped by callback number (leads without a number are listed on
    their own). Built from leads; nothing is stored twice."""
    session, m = ctx
    leads = (
        (
            await session.execute(
                select(Lead)
                .where(Lead.business_id == m.business_id)
                .order_by(Lead.updated_at.desc())
                .limit(2000)
            )
        )
        .scalars()
        .all()
    )
    calls_per_lead = dict(
        (
            await session.execute(
                select(Call.lead_id, func.count())
                .where(Call.business_id == m.business_id, Call.lead_id.is_not(None))
                .group_by(Call.lead_id)
            )
        ).all()
    )
    people: dict[str, dict] = {}
    for lead in leads:
        key = lead.callback_number or f"lead:{lead.id}"
        p = people.get(key)
        if p is None:
            p = people[key] = {
                "key": key,
                "name": lead.customer_name,
                "phone": lead.callback_number,
                "address": lead.address,
                "zip_code": lead.zip_code,
                "customer_type": lead.customer_type,
                "requests": 0,
                "calls": 0,
                "emergencies": 0,
                "open_requests": 0,
                "last_contact": lead.updated_at.isoformat(),
                "first_contact": lead.created_at.isoformat(),
                "latest_lead_id": str(lead.id),
                "latest_issue": lead.issue_summary,
                "services": [],
            }
        p["requests"] += 1
        p["calls"] += calls_per_lead.get(lead.id, 0)
        p["emergencies"] += 1 if lead.urgency == "emergency" else 0
        p["open_requests"] += 1 if lead.status in ("new", "contacted", "in_progress") else 0
        p["first_contact"] = min(p["first_contact"], lead.created_at.isoformat())
        for k in ("name", "address", "zip_code", "customer_type"):
            p[k] = p[k] or getattr(lead, "customer_name" if k == "name" else k)
        if lead.service_type and lead.service_type not in p["services"]:
            p["services"].append(lead.service_type)
    return list(people.values())[:limit]


@router.get("/admin/api/analytics")
async def admin_analytics(
    admin: CurrentUser = Depends(current_admin),
    session: AsyncSession = Depends(get_session),
    days: int = Query(30, ge=7, le=90),
):
    """All clients on this deployment: daily calls/minutes and per-client totals."""
    tz_name = "America/Chicago"
    tz = ZoneInfo(tz_name)
    day_list = _days(days, tz)
    start = datetime.combine(day_list[0], datetime.min.time(), tz).astimezone(UTC)
    series = await _series(session, Call.id.is_not(None), tz_name, start)
    per_client = (
        await session.execute(
            select(
                Business.id,
                Business.name,
                Business.account_status,
                func.count(Call.id),
                func.coalesce(func.sum(Call.billable_seconds), 0),
                func.count(Call.id).filter(Call.urgent.is_(True)),
            )
            .outerjoin(Call, and_(Call.business_id == Business.id, Call.started_at >= start))
            .group_by(Business.id)
            .order_by(func.count(Call.id).desc())
        )
    ).all()
    return {
        "days": days,
        "series": [
            {
                "date": d.isoformat(),
                **series.get(d.isoformat(), {"calls": 0, "answered": 0, "urgent": 0, "minutes": 0}),
            }
            for d in day_list
        ],
        "clients": [
            {
                "id": str(r[0]),
                "name": r[1],
                "status": r[2],
                "calls": r[3],
                "minutes": round(int(r[4]) / 60, 1),
                "urgent": r[5],
            }
            for r in per_client
        ],
    }
