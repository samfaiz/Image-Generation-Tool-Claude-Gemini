# AI Image Generation Tool — Dual-AI SaaS

A professional AI image generation platform built on a **dual-AI architecture**:

- **Claude** acts as the *prompt engineer* — it analyzes the user's raw idea and emits a highly
  structured JSON prompt **plus** a synthesized natural-language prompt.
- **Gemini / Imagen** acts as the *artist* — it consumes that prompt (and any reference images)
  to render the final image.

## Repository Layout

```
/Backend    Laravel 11 — API + full-scale Admin CMS (Sanctum SPA auth, encrypted key vault,
            AI pipeline, generation history, admin dashboard)
/Frontend   Next.js 15 (App Router, TypeScript, Tailwind) — client-facing dark-theme web app
```

## Tech Stack

| Layer        | Choice                                                              |
|--------------|--------------------------------------------------------------------|
| Backend      | Laravel 11, PHP 8.3                                                 |
| Auth         | Laravel Sanctum — **SPA cookie (stateful) authentication**         |
| DB           | MySQL (XAMPP)                                                       |
| Key storage  | AES-256-CBC via Laravel `Crypt` facade (APP_KEY-derived)            |
| Admin CMS    | Laravel Blade + Tailwind (CDN), `web` guard                        |
| Frontend     | Next.js 15 App Router, TypeScript, Tailwind CSS, dark flat theme    |
| AI — prompt  | Claude API (`claude-opus-4-8` / configurable)                      |
| AI — image   | Provider abstraction: **Imagen** (strict aspect ratio) + **Gemini 2.5 Flash Image** (reference conditioning) |

## Local Dev — Critical Networking Note

Because we use **Sanctum SPA cookie auth**, both apps MUST share the same site so the session
cookie is sent. We therefore run **both on `localhost`** (NOT `127.0.0.1`):

- Backend:  `http://localhost:8000`
- Frontend: `http://localhost:3000`

Mixing `localhost` and `127.0.0.1` will break the session cookie (the classic "419 / unauthenticated"
trap). See `Backend/config/cors.php`, `config/sanctum.php`, and `Backend/.env`.

## Quick Start

> This repo was already initialized end-to-end: the `image_gen` MySQL database is created,
> migrations are run, and admin/demo users are seeded. The steps below are what you run each
> time (and what a fresh clone would need).

### 0. XAMPP

Start **MySQL** from the XAMPP Control Panel (Apache not required). The DB `image_gen` already
exists; a fresh clone can create it with:
`php -r "(new PDO('mysql:host=127.0.0.1','root',''))->exec('CREATE DATABASE IF NOT EXISTS image_gen');"`

### 1. Backend (Laravel) — http://localhost:8000

```powershell
cd Backend
php artisan migrate --seed     # only needed on a fresh clone (already done here)
php artisan serve --host=localhost --port=8000
```

- Customer API: consumed by the Next.js app.
- **Admin CMS:** open `http://localhost:8000/admin` → sign in.
- Seeded accounts (change the passwords): admin `admin@example.com` / `password`,
  demo user `user@example.com` / `password`.
- No `storage:link` needed — generated images are served through an authenticated, CORS-safe
  proxy (`/api/generations/{id}/image`) so the Watermark Studio canvas can export them.

### 2. Frontend (Next.js) — http://localhost:3000

```powershell
cd Frontend
npm run dev   # http://localhost:3000  (NOT 127.0.0.1 — see networking note above)
```

### 3. Use it

Sign in → add your **real** Claude + Gemini API keys (Settings/onboarding) → fill the ideation
form → watch the two-phase generation → drop a logo in the Watermark Studio → download.

> ⚠️ Generation requires **valid, funded** Anthropic + Google AI Studio keys. The pipeline,
> encryption, and UI are fully wired and tested with fake keys; real keys are needed to actually
> render images. The Gemini model names in `Backend/.env` (`GEMINI_IMAGEN_MODEL`,
> `GEMINI_FLASH_IMAGE_MODEL`) are configurable — adjust them if Google renames a model.

## Security Notes

- User API keys are encrypted at rest with AES-256-CBC (Laravel `Crypt`). Only the last 4 chars
  are ever returned to the client for display.
- The generated image is served **through the backend** (`/api/generations/{id}/image`) with CORS
  headers so the frontend's HTML5 Canvas (Watermark Studio) can export it without tainting.
- ⚠️ **Laravel version:** Composer flags the entire 11.x line with unpatched security advisories in
  this environment. We pinned 11.x per spec (advisory block disabled) but **recommend upgrading to
  Laravel 12 LTS** for production. The upgrade is low-effort given this structure.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full data model and API contract.
