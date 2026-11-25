# Client configuration guide

Every BILEKSA deployment runs the same code. What makes a deployment "Lone Star Air" instead
of "Houston Comfort HVAC" is two things, kept apart on purpose:

| What | Where | Committed to git? |
| --- | --- | --- |
| Business facts and branding: name, logo, colour, phones, hours, ZIP codes, services and prices, FAQs, policies, emergency rules, company instructions, appointment policy | `client/client.toml` and `client/branding/` | Yes (it contains no secrets) |
| Credentials and URLs: database, Supabase keys, Vapi keys, webhook and sweep secrets, SMTP | Environment variables on the backend host and Cloudflare Pages | **Never** |

You change `client/client.toml`, never the code. The loader **refuses** any key or value that
looks like a credential (`password`, `secret`, `token`, `api_key`, `sk-…`, connection strings,
long random strings), so a key pasted into the wrong place stops the apply instead of leaking.

A complete worked example for a paying client is in
[`client/examples/client.example.toml`](client/examples/client.example.toml). The master copy
[`client/client.toml`](client/client.toml) describes the fictional demo company.

---

## 1. How the file is used

**Backend (database).** The receptionist reads its facts live from the client's database on
every call. The file is loaded into that database with one command:

```bash
cd backend
uv run python -m app.cli apply-client-config --dry-run   # validate only, writes nothing
uv run python -m app.cli apply-client-config             # write to the database
uv run python -m app.cli check-config                    # env vars + file, prints no values
```

- Run it with the client's environment variables set (it uses `DATABASE_URL`).
- It is **idempotent**: running it twice changes nothing the second time.
- A section that is **present** in the file is the source of truth: services, FAQs, ZIP codes,
  hours, holidays and emergency rules in the database are made to match it exactly (added,
  updated, removed). A section you **leave out** is not touched, so you can manage it in the
  admin panel instead.
- The deployment is one client, so the command updates the single business in the database
  (or creates it on a fresh database). If the database somehow holds several businesses and
  none has the file's `business.name`, it stops instead of guessing.
- Afterwards the AI assistant is marked for re-sync; the next sweep (every 10–15 minutes, or
  `uv run python -m app.cli sweep`) pushes the new instructions to Vapi and verifies them.
- The command is **not** run automatically on deploy, so changes made in the admin panel are
  never silently overwritten by a redeploy. Run it whenever you change the file.

**Frontend (branding).** `npm run dev` and `npm run build` first run
`frontend/scripts/sync-client.mjs`, which reads `[branding]`, writes
`src/config/brand.generated.json` and copies the logo to `public/brand/`. No secrets are read
or written. To build from another file: `CLIENT_CONFIG_PATH=/path/to/client.toml npm run build`.

**Admin panel.** Everything in the file can also be edited by BILEKSA staff in
**Admin → client → Business / Services / FAQs / Emergency rules**. Use whichever you prefer;
the file is better for setting up a new client and for keeping a reviewed record in git.
Business owners see all of it read-only in their dashboard (Business profile, Services &
pricing, Emergency rules, AI receptionist).

---

## 2. Section by section

Times are 24-hour `HH:MM`. Phone numbers are US numbers in any common format
(`+17135550100`, `(713) 555-0100`); they are stored as E.164. Prices are in **dollars**.

### `[branding]`

| Key | Meaning |
| --- | --- |
| `product_name` | Platform name, shown as "AI receptionist by …". Normally `BILEKSA`. |
| `company_name` | Name in the dashboard header and page titles. Defaults to `business.name`. |
| `tagline` | Short description used in page metadata. |
| `logo` | Path inside `client/` to an SVG or PNG, square works best. Replace `client/branding/logo.svg`. |
| `accent` | Brand colour `#RRGGBB`, used for highlights, active navigation and buttons. Pick one readable on a dark background. |
| `support_email`, `support_phone` | Shown to the owner under Settings → Changes and support. |
| `public_site` | `"marketing"` shows the BILEKSA sales page at `/` (master and demo only). **`"login"` for every paying client**: `/` goes straight to sign-in. |

### `[business]`

`name` (what the receptionist answers with), `contact_email`, `contact_phone`,
`notification_email` (where emergency alerts and call summaries go), `address`, `website`,
`timezone` (IANA name, e.g. `America/Chicago`; hours are interpreted in it).

### `[routing]`

| Key | Meaning |
| --- | --- |
| `transfer_number` | Where the AI transfers callers. A **direct** line, never the number that forwards to the AI (that would loop). |
| `fallback_number` | Backup line. Calls go here if the AI is unavailable or the minute limit is reached, so calls are never dropped. |
| `emergency_number` | Tried first for emergencies. |
| `transfer_mode` | `blind` (connect directly) or `warm` (the AI introduces the caller first). |
| `transfer_in_hours`, `transfer_after_hours`, `transfer_emergencies_after_hours` | `true` / `false`. |
| `emergency_preference` | `transfer_then_callback` (transfer, then an urgent callback if nobody answers) or `callback_only`. |
| `after_hours_message` | What the AI says when nobody can take a transfer. |
| `unavailable_message` | Spoken only when the AI is off **and** no forwarding number exists. |

### `[assistant]`

- `instructions` (max 1,500 characters): company-specific guidance, e.g. "For commercial
  callers, ask for the business name and how many units are affected." It is appended to the
  master prompt under a heading that says it **never overrides** the safety rules, the honesty
  rules or tool results. Don't put prices, hours or policies here; they have their own
  sections, which the AI reads live.
- `appointment_policy` (max 500 characters): read to callers who ask how booking works. The AI
  still only records a request; it never confirms a booking.

### `[hours]` and `[[holidays]]`

One line per weekday: `"07:00-19:00"` or `"closed"`. Holidays:

```toml
[[holidays]]
date = 2026-12-25
label = "Christmas Day"
hours = "closed"        # or "09:00-13:00" for shortened hours
```

### `[service_area]`

`label` and `zip_codes` (5-digit US ZIP codes). The AI tells callers outside these ZIP codes
that they are outside the area and offers a callback.

### `[[services]]`

```toml
[[services]]
name = "Commercial rooftop unit service"
description = "Repair and maintenance of packaged rooftop units and VRF systems"
segment = "commercial"          # residential | commercial | industrial; omit = everyone
price_min = 150                 # dollars; omit both prices → "the team will confirm"
price_max = 900
price_note = "quoted per site"
available = true                # optional, default true
```

The AI quotes **only** these services and price ranges; anything else gets a callback offer. A
price the AI says that isn't on this list is flagged "Check numbers" in Call history.

### `[[faqs]]` and `[[policies]]`

`question` / `answer` pairs. The AI repeats answers word for word. Policies (warranty,
cancellation, payment) appear with a "Policy" badge in the owner's dashboard.

### `[[emergency_rules]]`

The fixed life-safety instructions for the built-in categories always come first and cannot be
changed. Per category you decide whether it triggers a transfer and add approved extra wording.

- Built-in keys: `gas`, `co`, `smoke`, `burning_smell`, `sparks`, `dangerous_malfunction`,
  `refrigerant_leak`, `refrigeration_failure`.
- A custom category needs `key` (lower-case, underscores), `label` and `instructions`.

```toml
[[emergency_rules]]
key = "flooding_near_furnace"
label = "Water flooding near the furnace"
transfer = true
instructions = "Keep away from the furnace and any electrical outlets near the water."
```

Have safety wording reviewed by an HVAC or safety professional before go-live.

---

## 3. Checklist for a new client file

- [ ] Copied from `client/examples/client.example.toml`; every value replaced.
- [ ] `public_site = "login"`.
- [ ] Logo replaced in `client/branding/`; `accent` checked on the dark dashboard.
- [ ] `transfer_number` is a direct line, not the forwarded business number.
- [ ] `fallback_number` set (otherwise unanswered AI calls have nowhere to go).
- [ ] Hours in the client's local time; `timezone` correct.
- [ ] Every service has the client's **approved** prices, or no price.
- [ ] Emergency wording approved by the client.
- [ ] `apply-client-config --dry-run` prints `OK`.
- [ ] No credentials anywhere in the file (the loader would refuse them anyway).
