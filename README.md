# Preprint Explorer

Full-stack research discovery app with:
- React + Vite frontend
- Express API
- cookie auth, 2FA, passkeys, trusted devices
- SQLite local mode
- Postgres runtime mode for app, auth, security, and content stores

## Local dev

1. Install dependencies:
   `npm install`
2. Copy env values from `.env.example` as needed.
3. Start the app:
   `npm run dev`

Frontend runs on `http://localhost:3000`.
API runs on `http://localhost:3001`.

## Postgres mode

To run the full backend on Postgres:

```bash
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/preprint_explorer"
export ENABLE_POSTGRES_APP_STORE=1
export APP_URL="http://localhost:3001"
export WEBAUTHN_RP_ID="localhost"
export WEBAUTHN_ORIGIN="http://localhost:3001"
npm run dev:api
```

## Production container

Build and run with Docker Compose:

```bash
docker compose up --build
```

This starts:
- `postgres` on `localhost:5432`
- the app on `http://localhost:3001`

In production mode, the Express server serves the built frontend and the API from the same origin.

## Tests

```bash
npm run lint
npm run build
npm run backup:db
npm run test:e2e:passkey
npm run test:smoke:postgres
```

## Email delivery

If `SMTP_URL` is set, verification and password-reset emails are sent through SMTP.
Without it, the server falls back to debug logging and returns `debugToken` values outside production.

## Admin and ops

- `INITIAL_ADMIN_EMAIL` grants the first moderation/admin role at startup.
- `npm run backup:db` writes a logical JSON backup into `./backups` and keeps the most recent `BACKUP_RETENTION_COUNT` snapshots.
- In production, the API now emits request IDs, baseline security headers, and a stricter CSP than local development.
- `GET /api/ready` and `GET /api/metrics` provide lightweight readiness and operational visibility endpoints.
- `MONITORING_PROVIDER=slack` formats alerts for Slack Incoming Webhooks; `generic-webhook` keeps the raw JSON event payload.
- `BACKUP_UPLOAD_PROVIDER=s3` uploads snapshots to S3-compatible object storage using the `BACKUP_S3_*` env vars; `generic-webhook` keeps the previous HTTP upload mode.
- Moderation policy is now server-driven: `MODERATION_AUTO_ASSIGN=1` assigns new reports to admins automatically, and severe or repeated reports are auto-escalated based on `MODERATION_AUTO_ESCALATE_REASONS` and `MODERATION_TARGET_REPORT_ESCALATION_THRESHOLD`.
- The moderation center supports assignees, escalation notes, action history, and bulk moderation actions.
