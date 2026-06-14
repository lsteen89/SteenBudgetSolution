# Production Recovery Launch Guide

Purpose: bring the current production host back to a clean, working state after months of code, schema, Cloudflare, and environment changes.

Assumption: deploy itself already works and `https://ebudget.se` serves the frontend. This runbook focuses on making prod runtime state match the current repository.

## Safety Rules

- Treat the current production database as disposable only after confirming that no data must be kept.
- Wipe only the MariaDB volume. Do not use `docker compose down -v` for this task because it also removes Caddy, Redis, and ASP.NET Data Protection volumes.
- Keep secrets out of git, shell history where possible, screenshots, and chat.
- Run commands from the prod repo root on the Pi 4, expected path: `/opt/steenbudget`.
- Use `docker compose config` before restart so missing `.env` variables fail early.

## Current Production Shape

Source-of-truth files in this repo:

- `docker-compose.yml`
- `database/init/*.sql`
- `caddy/Caddyfile`
- `.github/workflows/cicd.yml`
- `Backend/appsettings.Production.json`
- `Frontend/.env.production`

Runtime services:

- `mariadb`: MariaDB 11.4.2, initialized from `./database/init`
- `redis`: token blacklist/cache
- `backend`: `ghcr.io/lsteen89/steenbudget-backend:latest`
- `caddy`: serves `/opt/steenbudget/frontend/dist` and proxies `/api/*` and `/ws`
- `cloudflared`: Cloudflare tunnel using `CLOUDFLARE_TOKEN`
- `watchtower`: label-based cleanup/update helper

## Phase 1: Preflight

On Pi 4:

```bash
cd /opt/steenbudget
pwd
git status --short
docker compose ps
docker compose logs backend --tail=80
docker compose logs mariadb --tail=80
```

Confirm the host has the current compose/schema files:

```bash
git rev-parse --short HEAD
ls -la database/init caddy docker-compose.yml .env
```

If the repo is stale, run the normal deploy from GitHub Actions instead of manually pulling random files. The deploy path should deliver the current backend image, frontend artifact, compose file, schema, and Caddyfile together.

## Phase 2: Update `.env`

Open `/opt/steenbudget/.env` on the Pi 4 and make it match the current compose/application requirements.

Minimum required variables:

```dotenv
# MariaDB container
MARIADB_ROOT_PASSWORD=<long-random-root-password>
MARIADB_DATABASE=steenbudgetPROD
MARIADB_USER=steenbudget
MARIADB_PASSWORD=<long-random-app-password>

# Backend database connection
DATABASESETTINGS__CONNECTIONSTRING=Server=mariadb;Port=3306;Database=steenbudgetPROD;Uid=steenbudget;Pwd=<same-as-MARIADB_PASSWORD>;SslMode=None;GuidFormat=Binary16

# Backend runtime secrets
REDIS_PASSWORD=<long-random-redis-password>
WEBSOCKET_SECRET=<long-random-websocket-secret>
JWT_KEYS__2025_09_11_B64=<base64-32-plus-bytes>
JWT_KEYS__2025_12_01_B64=<base64-32-plus-bytes>

# Cloudflare
CLOUDFLARE_TOKEN=<cloudflared-tunnel-token>
CLOUDFLARE_API_TOKEN=<caddy-dns01-token>

# Turnstile
Turnstile__Enabled=true
Turnstile__SecretKey=<cloudflare-turnstile-secret-key>

# Email, SMTP mode
Email__Provider=Smtp
Smtp__Host=mail.ebudget.se
Smtp__Port=587
Smtp__User=<smtp-user>
Smtp__Password=<smtp-password>
Smtp__FromAddress=no-reply@ebudget.se
Smtp__FromName=eBudget
Smtp__ContactRecipient=info@ebudget.se

# Public URLs
AppSettings__BaseUrl=https://ebudget.se
AppUrls__VerifyUrl=https://ebudget.se/email-confirmation
```

Generate replacement secrets when needed:

```bash
openssl rand -base64 32
openssl rand -hex 32
```

Lock down the file:

```bash
chmod 600 .env
```

Validate compose expansion:

```bash
docker compose --env-file .env config >/tmp/steenbudget-compose.rendered.yml
```

If this command fails, fix `.env` before touching the database.

## Phase 3: Verify Cloudflare

Cloudflare must provide two separate things:

- Tunnel runtime token: `CLOUDFLARE_TOKEN`, used by `cloudflared`.
- DNS API token: `CLOUDFLARE_API_TOKEN`, used by Caddy DNS-01.

Check Cloudflare dashboard:

- `ebudget.se` and `www.ebudget.se` resolve to the intended tunnel/DNS setup.
- Tunnel is healthy and routes to the prod host.
- Caddy API token has DNS edit/read rights scoped to the `ebudget.se` zone.
- Turnstile site key is for `ebudget.se` and `www.ebudget.se`.

Important frontend check: current React code reads `VITE_TURNSTILE_SITE_KEY`, but the workflow currently passes `VITE_APP_RECAPTCHA_SITE_KEY`. Before deploy, make sure the production frontend build has a real `VITE_TURNSTILE_SITE_KEY` value. Otherwise login/register CAPTCHA may render with the placeholder from `Frontend/.env.production`.

## Phase 4: Wipe and Recreate MariaDB

Find the exact MariaDB volume while the service still exists:

```bash
DB_VOLUME="$(docker inspect "$(docker compose ps -q mariadb)" --format '{{range .Mounts}}{{if eq .Destination "/var/lib/mysql"}}{{.Name}}{{end}}{{end}}')"
echo "$DB_VOLUME"
```

Expected name is similar to `steenbudget_mariadb_data`. If the output is empty, stop and inspect manually:

```bash
docker compose ps mariadb
docker inspect "$(docker compose ps -q mariadb)"
```

Stop services that depend on the database:

```bash
docker compose stop backend mariadb
docker compose rm -f mariadb
```

Delete only the MariaDB volume:

```bash
docker volume rm "$DB_VOLUME"
```

Recreate database from current `database/init/*.sql`:

```bash
docker compose up -d mariadb
docker compose logs -f mariadb
```

Wait for the log line showing initialization completed, or check health:

```bash
docker compose ps mariadb
```

Smoke-check schema:

```bash
docker compose exec mariadb sh -lc 'mariadb -u"$MARIADB_USER" -p"$MARIADB_PASSWORD" "$MARIADB_DATABASE" -e "SHOW TABLES;"'
```

## Phase 5: Start Runtime

Start dependencies and backend:

```bash
docker compose up -d redis backend cloudflared caddy
docker compose ps
```

Check backend readiness from inside the compose network:

```bash
docker compose exec backend curl -fsS http://localhost:8080/api/healthz
docker compose exec backend curl -fsS http://localhost:8080/api/readyz
```

External health endpoints are intentionally hidden by Caddy and return `404` for `/api/healthz` and `/api/readyz`.

Check public routes:

```bash
curl -I https://ebudget.se
curl -I https://ebudget.se/login
curl -I https://ebudget.se/api/healthz
```

Expected:

- `/` returns HTML.
- `/login` returns the SPA fallback.
- `/api/healthz` returns `404` through Caddy.

## Phase 6: Product Smoke Test

Use browser, not direct API, because Turnstile is part of login/register.

Smoke path:

1. Open `https://ebudget.se`.
2. Register a new real test account.
3. Confirm verification email arrives.
4. Enter verification code.
5. Complete first-login budget setup.
6. Confirm dashboard loads.
7. Create or edit one income, expense, saving, and debt item.
8. Refresh browser and confirm data persists.
9. Log out, log in again, and confirm session refresh works.
10. Open browser devtools and confirm no failed `/api/*`, `/ws/*`, Turnstile, or static asset requests.

Optional DB-side checks:

```bash
docker compose exec mariadb sh -lc 'mariadb -u"$MARIADB_USER" -p"$MARIADB_PASSWORD" "$MARIADB_DATABASE" -e "
SELECT COUNT(*) AS Users FROM Users;
SELECT COUNT(*) AS Budgets FROM Budget;
SELECT COUNT(*) AS RefreshTokens FROM RefreshTokens;
SELECT COUNT(*) AS EmailOutbox FROM EmailOutbox;
"'
```

## Phase 7: Log Checks

```bash
docker compose logs backend --tail=150
docker compose logs caddy --tail=150
docker compose logs cloudflared --tail=150
docker compose logs redis --tail=80
docker compose logs mariadb --tail=80
```

Look for:

- missing `WEBSOCKET_SECRET`
- missing `DatabaseSettings:ConnectionString`
- JWT key-ring errors
- Redis auth errors
- Turnstile verification failures
- SMTP auth or TLS failures
- Caddy upstream failures to `backend:8080`
- MariaDB constraint errors during first-login setup

## Rollback Options

If schema initialization fails:

```bash
docker compose down
docker volume rm "$DB_VOLUME"
```

Then fix the failing SQL/env problem and repeat Phase 4.

If backend fails after DB recreate:

```bash
docker compose logs backend --tail=200
docker compose up -d mariadb redis
```

Do not restore the old MariaDB volume unless the wipe was a mistake and a backup exists.

If Caddy/Cloudflare fails but backend is healthy:

```bash
docker compose logs caddy --tail=200
docker compose logs cloudflared --tail=200
docker compose restart caddy cloudflared
```

## Done Criteria

- `docker compose ps` shows healthy/running `mariadb`, `redis`, `backend`, `caddy`, and `cloudflared`.
- MariaDB volume was recreated from current `database/init`.
- Backend `/api/readyz` succeeds from inside the backend container.
- Public site loads through Cloudflare/Caddy.
- Register, email verification, first-login setup, dashboard load, edit, refresh, logout, and login all work.
- Logs show no repeating runtime errors after smoke test.
