# Deployment guide

This repository is the **master**. It is deployed two ways:

| | Public demo | Paying client |
| --- | --- | --- |
| Purpose | Sales demo with the fictional *Houston Comfort HVAC* | One real HVAC company |
| Mode | `DEMO_MODE=true` (API) + `NEXT_PUBLIC_DEMO_MODE=true` (site) | Both **unset/false** |
| `client/client.toml` | Master copy, `public_site = "marketing"` | The client's own file, `public_site = "login"` |
| API host | Render Free (`render.yaml`) | Railway (`backend/railway.json`) or a paid Render instance; never a sleeping free instance |
| Site | Cloudflare Pages | Cloudflare Pages (its own project) |
| Database / Auth | Its own Supabase project | Its **own** Supabase project per client |
| Vapi | Its own org, no payment method | Its own org (or BILEKSA's production org), own credential |
| Cost | ₹0 | See `docs/costs.md` |

Isolation rule: **every client gets its own copy of the repo, its own Supabase project, its
own API service and its own Pages project.** Databases, keys and secrets are never shared
between clients or with the demo. Credentials live only in the hosts' environment variables;
`.env` files are git-ignored and only the `*.example` files are committed.

Switching modes is configuration only: set or unset `DEMO_MODE` on the API and
`NEXT_PUBLIC_DEMO_MODE` on the site, and choose the `client.toml`. No code changes.

---

## 0. Prerequisites (local machine)

- Git, Python 3.12 with [`uv`](https://docs.astral.sh/uv/) (`pip install uv`), Node.js 22,
  PostgreSQL 15+ for local tests.
- Accounts: GitHub, Supabase, Vapi, Cloudflare, and Render (demo) or Railway (clients).

Local run (optional, for checking a client file before deploying):

```bash
cp backend/.env.example backend/.env        # fill in local/staging values
cp frontend/.env.example frontend/.env.local
cd backend && uv sync && uv run alembic upgrade head && uv run uvicorn app.main:app --reload
cd frontend && npm ci && npm run dev        # http://localhost:3000
```

Full test suite (backend tests, lint, type checks, build, secret scan):

```bash
bash scripts/check.sh
RUN_E2E=1 bash scripts/check.sh             # plus both browser end-to-end suites
```

---

## Part A — Public demo (₹0)

Order matters: Supabase → Vapi → Render → Pages → scheduled jobs → check.
Detailed screenshots-level steps and free-tier limits: [`docs/demo-deployment.md`](docs/demo-deployment.md).

1. **GitHub.** Push the master repo to a private repository.
2. **Supabase (new project `bileksa-demo`).** Email auth on, **sign-ups off**. Site URL = the
   Pages URL; add `<pages-url>/reset-password` to redirect URLs. Copy project URL, anon key,
   service-role key and the session-pooler connection string (scheme
   `postgresql+asyncpg://`). Enable `pg_cron` and `pg_net`.
3. **Vapi (demo org, no card).** Copy private and public keys; create a Bearer Token custom
   credential with a long random token.
4. **Render.** New → Blueprint → the repo (reads `render.yaml`). Fill every `sync: false`
   variable from `backend/.env.demo.example`:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | demo Supabase pooler URL |
   | `PUBLIC_API_URL` | `https://<service>.onrender.com` |
   | `FRONTEND_URL`, `CORS_ORIGINS` | the Pages URL |
   | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | from step 2 |
   | `VAPI_PRIVATE_KEY`, `VAPI_PUBLIC_KEY` | from step 3 |
   | `VAPI_WEBHOOK_SECRET` | the Bearer token from step 3 |
   | `INTERNAL_SWEEP_SECRET`, `DEMO_OWNER_PASSWORD`, `DEMO_ADMIN_PASSWORD` | `openssl rand -base64 32` each |

   Deploy. Start-up runs migrations, seeds the demo company and creates the two demo sign-ins.
   Check `https://<service>.onrender.com/health/ready`.
5. **Cloudflare Pages.** Connect the repo. Preset **None**, root `frontend`, build
   `npm ci && npm run build`, output `out`. Variables from `frontend/.env.demo.example`:
   `NEXT_PUBLIC_DEMO_MODE=true`, `NEXT_PUBLIC_API_URL` (Render URL),
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NODE_VERSION=22`.
6. **Wire URLs back.** Pages URL → Render `FRONTEND_URL`/`CORS_ORIGINS` and Supabase Site URL.
7. **Scheduled jobs.** Run `supabase/demo_cron.sql` in the demo SQL editor (with the Render URL
   and sweep secret). Trigger the first provisioning:
   `curl -X POST -H "Authorization: Bearer $INTERNAL_SWEEP_SECRET" https://<api>/internal/sweep`.
8. **Vapi tools.** Sign in to `/demo` as admin → **Vapi tools → Sync tools to Vapi**. Restrict
   the Vapi public key to the Pages origin.
9. **Check.** `/demo` → enter as owner → open every page, run each simulated scenario, place one
   short live call, confirm it appears in Call history. Enter as admin → Demo controls shows the
   spend.

---

## Part B — A paying client

### B1. Create the client's copy of the repo

```bash
# from a clean checkout of the master
git clone git@github.com:<you>/bileksa-hvac.git bileksa-client-lonestar
cd bileksa-client-lonestar
git remote rename origin master                       # keep the master for updates
git remote add origin git@github.com:<you>/bileksa-client-lonestar.git   # new PRIVATE repo
git checkout -b main
```

### B2. Write the client's configuration (no secrets)

```bash
cp client/examples/client.example.toml client/client.toml
# edit client/client.toml — every value; set branding.public_site = "login"
# replace client/branding/logo.svg (or point branding.logo at a PNG)
cd backend && uv sync && uv run python -m app.cli apply-client-config --dry-run
```

Field reference: [CLIENT-CONFIGURATION-GUIDE.md](CLIENT-CONFIGURATION-GUIDE.md). Commit and push:

```bash
git add client && git commit -m "Lone Star Air: client configuration" && git push -u origin main
```

### B3. Supabase (new project for this client)

1. New project, region US East (or nearest). Enable daily backups / PITR.
2. Auth: Email on, **sign-ups off**, TOTP MFA on. Site URL = the client's site URL; add
   `<site-url>/reset-password` to redirect URLs.
3. Copy project URL, anon key, service-role key, pooler connection string
   (`postgresql+asyncpg://…`). Enable `pg_cron` and `pg_net`.

### B4. Vapi

1. Use the production org (or a dedicated org for the client). Copy the private key.
2. Custom Credentials → **Bearer Token** with a long random token. Token =
   `VAPI_WEBHOOK_SECRET`; credential id = `VAPI_CREDENTIAL_ID`.
3. Phone number: a Twilio number imported into Vapi (can dial out for transfers), see
   `docs/phone-integration.md`. The backend attaches it with server-side routing; you never set
   an assistant on the number by hand.

### B5. API (Railway)

1. New project → Deploy from the client's GitHub repo, root directory `backend/`
   (`backend/Dockerfile`, `backend/railway.json`: migrations run as the pre-deploy step, health
   check `/health/ready`, one replica).
2. Variables (full list with explanations: `backend/.env.example` and `docs/environment.md`):

   | Variable | Value |
   | --- | --- |
   | `ENVIRONMENT` | `production` |
   | `DEMO_MODE` | `false` (or unset) |
   | `REQUIRE_ADMIN_MFA` | `true` |
   | `DATABASE_URL` | client's Supabase pooler URL |
   | `PUBLIC_API_URL` | the Railway domain (or `api.<client-domain>`) |
   | `FRONTEND_URL`, `CORS_ORIGINS` | the client's site URL |
   | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | from B3 |
   | `VAPI_PRIVATE_KEY`, `VAPI_WEBHOOK_SECRET`, `VAPI_CREDENTIAL_ID` | from B4 |
   | `INTERNAL_SWEEP_SECRET` | `openssl rand -base64 32` |
   | `SMTP_*` | optional; enables email alerts |
   | `CLIENT_CONFIG_PATH` | leave empty (uses `client/client.toml`) |

   Leave `VAPI_PUBLIC_KEY` empty (browser voice is a demo-only feature).
3. Deploy, then open `https://<api>/health/ready`.

### B6. Load the client's data and check the environment

From your machine, with the client's production variables exported (or in a Railway shell):

```bash
cd backend
uv run python -m app.cli check-config               # every value set? prints names, never values
uv run python -m app.cli apply-client-config        # loads client/client.toml
uv run python -m app.cli setup-vapi-tools           # creates/updates the Vapi tools
uv run python -m app.cli sweep                      # provisions and verifies the assistant now
```

`check-config` must end with `READY`. Run `apply-client-config` again whenever the file
changes; it never runs automatically, so admin-panel edits are not overwritten by a redeploy.

### B7. Site (Cloudflare Pages, a new project for this client)

Connect the client's repo. Preset **None**, root `frontend`, build `npm ci && npm run build`,
output `out`. Variables: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NODE_VERSION=22`. **Do not set `NEXT_PUBLIC_DEMO_MODE`.**
Add the custom domain. The build applies the client's branding and writes the security
headers (`out/_headers`). Then put the site URL into the API's `FRONTEND_URL`/`CORS_ORIGINS`
and Supabase's Site URL.

### B8. Scheduled sweep

Run `supabase/pg_cron_sweep.sql` in the client's Supabase SQL editor with the API URL and
`INTERNAL_SWEEP_SECRET`. The sweep (every 15 minutes) re-syncs the assistant and phone
routing, reconciles missed call reports and sends queued emails.

### B9. Admin, owner and go-live

1. Supabase → Authentication → Users → **Add user** (BILEKSA staff), then
   `uv run python -m app.cli add-admin <user-uuid> <email>`. Sign in at `/login`; enrol TOTP.
2. Admin → client → **Overview**: assign the package (password-confirmed).
3. **Phone & Vapi**: assign the number, have the client set up forwarding (the page shows the
   carrier codes), press **Start test call** and call in until it shows **Verified**.
4. **Activate client**, then **Invite the client owner by email**. The owner sets a password
   from the email and lands on their dashboard.

### B10. Updating a client from the master later

```bash
git fetch master && git merge master/main     # client/ is the only folder you changed
bash scripts/check.sh && git push             # Railway and Pages redeploy
```

New migrations run on deploy (they are additive). If the master changed the Vapi prompt or
tools, the sweep re-syncs the assistant automatically (`TEMPLATE_VERSION`).

---

## Go-live checklist (each client)

- [ ] Own Supabase project, own API service, own Pages project; nothing shared with the demo.
- [ ] `check-config` prints `READY`; `DEMO_MODE` unset/false; `NEXT_PUBLIC_DEMO_MODE` unset.
- [ ] `REQUIRE_ADMIN_MFA=true`; Supabase sign-ups disabled; every admin enrolled in TOTP.
- [ ] `apply-client-config` run; dashboard pages show the right services, hours, ZIPs, FAQs.
- [ ] Admin → Vapi tools shows no missing tools; assistant **Verified**.
- [ ] Phone line **Verified** with a real test call; transfer number answers; fallback rings.
- [ ] Emergency test call (say "I smell gas"): alert email received, urgent callback recorded.
- [ ] pg_cron job present in `cron.job` and succeeding in `cron.job_run_details`.
- [ ] Backups/PITR on; restore rehearsed (`scripts/backup_restore_check.sh`).
- [ ] Privacy policy, terms, AI disclosure and call-recording consent reviewed for the client.
- [ ] No `.env` file or credential committed (`bash scripts/check_secrets.sh`).

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Site loads but every page says it can't reach the server | `NEXT_PUBLIC_API_URL` wrong, or the API's `CORS_ORIGINS` doesn't contain the site URL | Fix the value, redeploy the site / restart the API |
| `/health/ready` fails | `DATABASE_URL` wrong (scheme must be `postgresql+asyncpg://`, use the pooler host) | Correct it; check Supabase isn't paused |
| Sign-in works, then "Not authorised" | User not linked to a business (owner) or not an admin | Invite the owner from Admin; or run `add-admin` |
| Admin is sent to two-step setup every time | TOTP not enrolled or Supabase MFA off | Enable TOTP in Supabase Auth, enrol again |
| Assistant stuck in "Pending"/"Failed" | Vapi key/credential wrong, or tools missing | `check-config`; Admin → Vapi tools → Sync; `cli sweep`; read Admin → Errors |
| Calls go straight to the fallback number | Client not active, minute limit reached, or routing not synced | Admin → Overview status and usage; run the sweep |
| Invitation email never arrives | Supabase SMTP rate limits on the free mail sender | Configure custom SMTP in Supabase Auth |
| `apply-client-config` says "looks like a secret" | A credential or long random string in `client.toml` | Remove it; credentials belong in env vars |
| `apply-client-config` refuses: several businesses | The database isn't a single-client database | Use the client's own Supabase project |
| Branding didn't change | Site not rebuilt after editing `[branding]` | Push to trigger a Pages build (or `npm run build`) |
| Demo shows "Live voice is unavailable" | Demo budget reached or `VAPI_PUBLIC_KEY` unset | Admin → Demo controls; simulated calls still work |
| Render demo slow on first visit | Free instance was asleep | Wait ~1 minute; pg_cron keeps it awake normally |
