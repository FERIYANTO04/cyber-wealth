# Deployment and production activation

This project is a Next.js 15 Pages Router application backed by PostgreSQL and Drizzle ORM. The ZIP does not contain hosting credentials, a live database URL, or third-party API keys. Do not paste secrets into source files or `NEXT_PUBLIC_*` variables. For GetLaunch, deploy it as a server-backed web app/container, not as a static-site export: it needs Next.js API routes, PostgreSQL, and server-side secrets.

## Required runtime configuration

Set these values in the hosting provider's private environment-variable settings:

- `DATABASE_URL`: PostgreSQL connection URL. For Supabase, open **Connect → ORMs → Drizzle** or **Connect → Connection string → URI**. Prefer the **Session pooler** URI for a long-running Next.js server when the direct database host is not reachable from the hosting provider. Use the exact URI supplied by Supabase, replace only its password placeholder locally, and append `?sslmode=require` only if the supplied URI does not already specify SSL. Never use a browser-exposed `NEXT_PUBLIC_` variable for this value.
- `JWT_SECRET`: long, random secret used to sign owner sessions.
- `GROQ_API_KEY`: API key for the Groq OpenAI-compatible model provider (required by the current code).
- `AI_BASE_URL`: optional; defaults to `https://api.openai.com/v1`.
- `AI_MODEL`: optional; defaults to `gpt-4o-mini`.
- `CRON_SECRET`: random secret with at least 32 characters for scheduled autopilot calls.
- `NEXT_PUBLIC_IS_PLAYGROUND`: set to `false` in production. The preview-only value `true` enables the embedded playground bridge and cross-site cookie behavior.

Optional services may require additional variables documented by their integration screens.

## Supabase connection notes

- The Supabase **Project URL / Data API URL** is not the PostgreSQL `DATABASE_URL`; the app's Drizzle adapter needs the PostgreSQL URI.
- In Supabase, use **Connect** and choose **ORM → Drizzle** or **Connection string → URI**. If using the pooler, choose **Session** for this app's server connection. Do not paste the URI, password, `service_role` key, or secret keys into chat, screenshots, source code, or public variables.
- In the hosting dashboard, add a private environment variable named `DATABASE_URL` and paste the full PostgreSQL URI as its value. Add `JWT_SECRET` as a separate private variable with at least 32 random characters. Redeploy/restart after changing variables.
- Run the database migration command from the host's release/build command only after confirming the target database and taking a backup. Do not use the Supabase Data API URL in `DATABASE_URL`.

## Build and database

1. Install dependencies with `npm ci`.
2. Run `npm run check`.
3. Run `npm run build`.
4. Back up the production database before applying schema changes.
5. Apply migrations with `npm run db:migrate` from a deployment/release step that has the production `DATABASE_URL`.
6. Start the app with `npm start` (the included Docker image starts the standalone server on port 8082).

Do not run migrations against a production database until its owner has verified the backup and target URL.

## Scheduled autopilot

The application originally only checked for a due daily pass when an owner opened the console. A protected server endpoint is now available:

`POST /api/cron/autopilot`

Header:

`Authorization: Bearer <CRON_SECRET>`

Configure the hosting provider's scheduler/cron service to call this endpoint at least once per day (for example, every hour). The app itself checks whether a daily run is due, whether the owner paused operations, and skips when not due. The endpoint returns a concise JSON result.

Important:
- The scheduler must support HTTPS POST requests with a custom Authorization header.
- Do not expose `CRON_SECRET` in browser code, public environment variables, logs, or screenshots.
- The in-process overlap guard prevents duplicate runs on one server instance only. If the host runs multiple concurrent instances, configure the scheduler for a single active invocation or add a shared database lock before scaling horizontally.
- A scheduled request is not proof that every external task succeeded. Inspect the JSON response and server logs.
- Keep owner approvals enabled for irreversible or public-facing actions. Paid orders are settled only by a signature-verified Paddle webhook. Never mark an order paid based on a redirect or browser response.

## Health check

`GET /api/health` is a basic process liveness endpoint. `GET /api/health/ready` checks PostgreSQL connectivity, a strong JWT secret, and whether Paddle gateway credentials are present. It does not verify account balances or initiate bank transfers. Use the Integrasi page for provider checks.

## GetLaunch deployment notes

- Use GetLaunch AI Workspace Publish for a server-backed web app, or an enabled container deployment. Do not choose Static Site: static export does not run this app's API routes or server-side database code.
- If GetLaunch asks for build/start commands, use `npm run build` and `npm start`. The start script listens on `0.0.0.0` and honors the platform-provided `PORT` (default Next.js port 3000). For Docker deployments, the included Dockerfile runs the standalone Next.js server on port 8082; map the service to container port 8082 unless the platform overrides `PORT`.
- Add production secrets in the private production environment settings, not the preview settings. Set `NEXT_PUBLIC_IS_PLAYGROUND=false` for production.
- Connect a hosted PostgreSQL database using a pooled connection string. For Supabase, use the Session Pooler URI; for Neon, use the pooled URI. Never use `localhost`, a Supabase Project URL, or the Supabase Transaction Pooler URI.
- Apply schema migrations once against the intended production database with `npm run db:migrate` after confirming the database and backup. Do not run migrations on every web request.
- GetLaunch's pay-per-use web app does not keep background timers or scheduled jobs alive. The protected endpoint `POST /api/cron/autopilot` must be called by an external HTTPS scheduler with `Authorization: Bearer <CRON_SECRET>`. Test the endpoint manually before enabling recurring runs. Keep owner approval enabled for irreversible actions.
- The current app storage adapter expects a Supabase-compatible Storage API (`STORAGE_URL`, `STORAGE_KEY`, and optional `STORAGE_BUCKET`). GetLaunch's built-in public static-file bucket uses a different API and is not a drop-in replacement. Configure a compatible object-storage service for private/user uploads, or leave storage-dependent features disabled until an adapter is added. If storage is not configured, upload requests return a clear 503 error.

GetLaunch's web-app runtime is stateless: files written to the app filesystem are temporary. Persist application records in PostgreSQL and uploaded files in external object storage.

## Portal anggota, komisi, dan penarikan (WD)

- Portal anggota: `/member` (pendaftaran dan login anggota, saldo pribadi, kode referral, riwayat komisi, data pribadi/rekening, dan pengajuan WD).
- Panel pemilik: `/admin/members` (hanya sesi pemilik; daftar anggota, pencatatan komisi referral/penjualan/tugas, dan keputusan WD).
- Jalankan `npm run db:migrate` saat deploy agar migrasi `0013_member_wallet.sql` diterapkan.
- Pastikan `DATABASE_URL` dan `JWT_SECRET` (acak, minimal 32 karakter) sudah diisi di environment hosting sebelum anggota login/daftar. Portal anggota akan menolak login/pendaftaran jika konfigurasi inti belum siap.
- Komisi referral, penjualan, dan tugas dicatat admin setelah sumbernya diverifikasi. Pendaftaran melalui referral belum otomatis menghasilkan komisi; tarif dan aturan komisi perlu ditetapkan pemilik terlebih dahulu. Belum ada integrasi otomatis yang membuktikan transaksi/tugas selesai.
- WD berjalan melalui pemeriksaan admin: pending → approved → paid. Status `paid` hanya boleh dipilih setelah transfer bank/e-wallet benar-benar dilakukan di luar aplikasi. Aplikasi ini belum mengirim uang otomatis.
- Saldo anggota dihitung dari komisi berstatus approved dikurangi WD pending, approved, dan paid. Data saldo pemilik tidak pernah dikirim ke portal anggota.
