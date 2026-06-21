# Architecture

## 1. High-level flow

```
┌──────────────┐    Sanctum SPA cookie     ┌───────────────────────────┐
│  Next.js 16  │ ────────────────────────► │      Laravel 11 API       │
│ (localhost   │ ◄──────────────────────── │     (localhost:8000)      │
│  :3000)      │      JSON / image bytes   │                           │
└──────────────┘                           │  ┌─────────────────────┐  │
                                           │  │ ClaudeService       │──┼─► Claude API
                                           │  │ (idea → JSON + NL)  │  │
                                           │  └─────────────────────┘  │
                                           │  ┌─────────────────────┐  │
                                           │  │ ImageProvider        │──┼─► Imagen / Gemini
                                           │  │  (NL prompt → image)│  │   2.5 Flash Image
                                           │  └─────────────────────┘  │
                                           │   keys decrypted in-mem    │
                                           └───────────────────────────┘
                                                       │
                                                   MySQL (XAMPP)
```

**Why the AI calls live in Laravel, not Next.js:** the user's encrypted API keys live in the
Laravel DB. Decrypting them only ever happens server-side in Laravel; they are never sent to the
browser or to Next.js. The browser only ever sees the generated image and the (non-secret) prompt.

## 2. Database schema

### `users`  (extends Laravel default)
| column           | type             | notes                                  |
|------------------|------------------|----------------------------------------|
| id               | bigint pk        |                                        |
| name             | string           |                                        |
| email            | string unique    |                                        |
| password         | string (hashed)  |                                        |
| is_admin         | boolean          | default false — gates the Admin CMS    |
| last_active_at   | timestamp null   | updated per authenticated request → DAU|
| timestamps       |                  |                                        |

### `api_credentials`  (encrypted key vault, 1:1 with user)
| column               | type          | notes                                       |
|----------------------|---------------|---------------------------------------------|
| id                   | bigint pk     |                                             |
| user_id              | fk unique     |                                             |
| claude_key           | text null     | **AES-256-CBC ciphertext** (Crypt)          |
| gemini_key           | text null     | **AES-256-CBC ciphertext** (Crypt)          |
| claude_last4         | string(4) null| plaintext last-4 for UI display only        |
| gemini_last4         | string(4) null|                                             |
| claude_verified_at   | timestamp null| set when a test ping to Claude succeeds     |
| gemini_verified_at   | timestamp null|                                             |
| timestamps           |               |                                             |

### `generations`  (history / gallery)
| column         | type          | notes                                            |
|----------------|---------------|--------------------------------------------------|
| id             | bigint pk     |                                                  |
| user_id        | fk            |                                                  |
| idea           | text          | required input                                   |
| industry       | string        | required input                                   |
| competitors    | string        | required input (comma-separated)                 |
| elements       | text null     | optional input                                   |
| reference_url  | string null   | optional input                                   |
| reference_path | string null   | optional uploaded file (storage/app/public/...)  |
| claude_json    | json null     | structured prompt from Claude                    |
| final_prompt   | text null     | synthesized NL prompt sent to image model        |
| aspect_ratio   | string        | default '9:16'                                   |
| provider       | string null   | 'imagen' \| 'gemini-flash' (chosen at runtime)   |
| image_path     | string null   | stored generated image                           |
| status         | string        | pending\|prompted\|generating\|completed\|failed |
| error          | text null     |                                                  |
| timestamps     |               |                                                  |

Plus Laravel defaults: `password_reset_tokens`, `sessions` (SPA cookie auth needs the DB session
store), `personal_access_tokens` (Sanctum), `cache`, `jobs`.

## 3. API contract  (all under `/api`, JSON)

### Auth (Sanctum SPA — cookie based)
| method | path                     | body                                             | returns        |
|--------|--------------------------|--------------------------------------------------|----------------|
| GET    | `/sanctum/csrf-cookie`   | —                                                | sets XSRF cookie|
| POST   | `/api/register`          | name, email, password, password_confirmation     | 201 user       |
| POST   | `/api/login`             | email, password                                  | 200 user       |
| POST   | `/api/logout`            | —                                                | 204            |
| GET    | `/api/user`              | — (auth)                                          | current user   |

### API key vault (auth)
| method | path                | body                          | returns                                            |
|--------|---------------------|-------------------------------|----------------------------------------------------|
| GET    | `/api/credentials`  | —                             | { has_claude, has_gemini, claude_last4, gemini_last4, claude_verified, gemini_verified } |
| PUT    | `/api/credentials`  | claude_key?, gemini_key?, verify? | stores encrypted, optionally test-pings, returns status |
| DELETE | `/api/credentials`  | —                             | 204                                                |

### Generation (auth) — split into two phases for the dual-skeleton UX
| method | path                              | body                                                        | returns                                  |
|--------|-----------------------------------|-------------------------------------------------------------|------------------------------------------|
| POST   | `/api/generations`                | multipart: idea, industry, competitors, elements?, reference_url?, reference (file?), aspect_ratio? | **Phase 1 (Claude):** { id, claude_json, final_prompt, status:'prompted' } |
| POST   | `/api/generations/{id}/image`     | —                                                           | **Phase 2 (Gemini):** { id, image_url, provider, status:'completed' } |
| GET    | `/api/generations`                | —                                                           | paginated list (gallery)                 |
| GET    | `/api/generations/{id}`           | —                                                           | full record                              |
| GET    | `/api/generations/{id}/image`     | —                                                           | image bytes w/ CORS header (canvas-safe) |
| DELETE | `/api/generations/{id}`           | —                                                           | 204                                      |

Splitting Claude (phase 1) and Gemini (phase 2) into two requests is what lets the frontend show
two **distinct** loading skeletons ("Engineering prompt…" then "Generating image…").

### Admin CMS — Blade, `web` guard, prefix `/admin`
| method | path                                  | purpose                                  |
|--------|---------------------------------------|------------------------------------------|
| GET    | `/admin/login`                        | admin login page                         |
| GET    | `/admin`                              | dashboard: Total Users, DAU, generations |
| GET    | `/admin/users`                        | user management table                    |
| POST   | `/admin/users/{user}/reset-password`  | force password reset (emails link / temp)|

## 4. Image provider abstraction

```
ImageProviderInterface
  ├─ ImagenProvider          (text-to-image, honors aspect_ratio strictly: 1:1,3:4,4:3,9:16,16:9)
  └─ GeminiFlashImageProvider(image+text, supports user reference image conditioning, ~aspect)

ImageProviderFactory::for($generation, $key)
  → if generation has a reference image → GeminiFlashImageProvider
  → else                                → ImagenProvider
```

User can override the aspect ratio in the UI (default `9:16`). When a reference image is supplied
we route to Gemini 2.5 Flash Image (which can condition on it) and request the aspect ratio in the
prompt; otherwise Imagen enforces it exactly.

## 5. Claude prompt-engineering contract

Claude is system-prompted to return **strict JSON** with this shape (also serialized into
`final_prompt`):

```json
{
  "subject": "...",
  "style": "...",
  "composition": "...",
  "color_palette": ["..."],
  "lighting": "...",
  "mood": "...",
  "differentiators_vs_competitors": ["..."],
  "must_include_elements": ["..."],
  "negative_prompt": "...",
  "aspect_ratio": "9:16",
  "final_prompt": "A single rich natural-language paragraph the image model will actually consume."
}
```

The backend persists the whole object in `claude_json` and copies `final_prompt` out for the image
provider. This is the fix for "image models don't accept raw JSON" — Claude produces both the
structured data (for storage/UI/re-editing) and the prose the artist model needs.
