# Nearbites

A concise developer README describing current progress, how to start the system locally, and a short operator manual.

---

**Project Overview**

- **Name**: Nearbites
- **Purpose**: Lightweight food/menu delivery & recommendation backend with a minimal frontend used by LPU-C.
- **Stack**: Node.js + Express backend, MySQL database, Cloudinary for images, OpenRouter/OpenAI for AI features, simple static frontend in `public/`.

---

**Current Progress (what's implemented)**

- **Backend API**: Implemented in [server.js](server.js#L1).
  - User authentication endpoints (signup/login) with password hashing (`bcrypt`).
  - Role handling: `userType` values: `1` = Student, `2` = Seller, `3` = Admin.
  - CRUD for Food, Stores, Preferences, Reviews, Meal Plans.
  - Image upload flow: temporary local upload via `multer` then permanent upload to Cloudinary at `/api/food/upload`.
  - Admin endpoints: list/delete users.
  - Several AI-powered endpoints to recommend bundles, estimate macros, generate weekly meal plans, and budget-aware recommendations.

- **Database**: MySQL schema and example data in [nearbitesdb.sql](nearbitesdb.sql#L1). Migration to fix constraints in [migrations/0001_fix_constraints.sql](migrations/0001_fix_constraints.sql#L1).
  - `db.js` uses `mysql2/promise` connection pool and expects DB credentials via environment variables.

- **AI integration**: Implemented in [ai.js](ai.js#L1) with `openai` client targeting OpenRouter (`OPENROUTER_API_KEY` required). The backend passes strict system prompts and menu data to the AI helpers.

- **Frontend**: Static files in `public/` (login/signup flow, dashboards, onboarding). Primary entry is [public/index.html](public/index.html#L1) and UI helpers are in [public/js/ui.js](public/js/ui.js#L1).

- **Uploads**: Local temporary uploads stored in `uploads/` and then uploaded to Cloudinary; local files are deleted after successful upload.

---

**Important files**

- [server.js](server.js#L1) — main Express app and all API routes.
- [db.js](db.js#L1) — MySQL connection pool (reads DB settings from env).
- [ai.js](ai.js#L1) — AI helper using OpenRouter/OpenAI.
- [nearbitesdb.sql](nearbitesdb.sql#L1) — full DB schema dump + seeded rows.
- [migrations/0001_fix_constraints.sql](migrations/0001_fix_constraints.sql#L1) — migration notes and ALTER statements.
- `public/` — static frontend assets (index, dashboards, onboarding, JS helpers).

---

**Prerequisites**

- Node.js (recommended v16+ or newer).
- MySQL-compatible server (MySQL 8 recommended). The included dump was generated on MySQL 8.
- A Cloudinary account (for image uploads).
- An OpenRouter API key (or compatible OpenAI endpoint) for AI features.

---

**Environment variables (.env)**

Create a `.env` file in the project root with values similar to below:

```env
# Server
PORT=3000

# MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=nearbites

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret

# OpenRouter / OpenAI
OPENROUTER_API_KEY=your_openrouter_api_key
```

Important: Do NOT commit the `.env` file or secrets to version control.

---

**Install & Start (local development)**

1. Install dependencies:

```bash
npm install
```

2. Prepare the database:

- Create the database and import the schema (example):

```bash
# Replace host/port/user/password/database values as appropriate
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p $DB_NAME < nearbitesdb.sql
```

On Windows you can run the same `mysql` command from Git Bash or adjust for your client.

- Optionally run the migration file if your schema differs:

```bash
# Run the migration SQL as an admin user
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p $DB_NAME < migrations/0001_fix_constraints.sql
```

3. Populate `.env` with real credentials (Cloudinary + OpenRouter + DB).

4. Start the server:

```bash
node server.js
# or for live reload (install nodemon globally):
npx nodemon server.js
```

5. Open the application in a browser:

```
http://localhost:3000
```

---

**Key API endpoints (quick reference)**

- **Auth & Users**
  - `POST /api/users/signup` — public student signup (school-email restricted).
  - `POST /api/users/login` — login.
  - `PUT /api/users/:userId` — update username/password/mustChangePassword.

- **Admin**
  - `POST /api/admin/create-seller` — create seller account (sets mustChangePassword).
  - `GET /api/admin/users` — list users.
  - `DELETE /api/admin/users/:userId` — delete user.

- **Stores & Food**
  - `POST /api/stores` — create store.
  - `GET /api/stores/seller/:userId` — seller's stores.
  - `POST /api/food` — add food item.
  - `GET /api/food` — list/search menu (`?search=..&isQuickServe=1`).
  - `GET /api/food/store/:storeId` — store menu.
  - `PUT /api/food/:foodId` — update menu item.
  - `DELETE /api/food/:foodId` — delete item.
  - `POST /api/food/upload` — upload image (multipart form field `foodImage`).

- **Preferences / Reviews / Meal Plans**
  - Preferences: `POST /api/preferences`, `GET /api/preferences/:userId`, `DELETE /api/preferences/:preferenceId`.
  - Reviews: `POST /api/reviews`, `GET /api/reviews/food/:foodId`.
  - Meal plans: `POST /api/ai/generate-meal-plan`, `GET /api/mealplans/user/:userId`.

- **AI endpoints**
  - `POST /api/ai/recommend-bundle` — AI chooses one pairing from the current menu.
  - `POST /api/ai/estimate-macros` — returns JSON with `carbs` and `calories`.
  - `POST /api/ai/recommend-by-budget` — recommends items under a given budget.

---

**Short manual / common tasks**

- Create a test student (curl):

```bash
curl -X POST http://localhost:3000/api/users/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"student@lpunetwork.edu.ph","password":"P@ssw0rd!","username":"teststudent","userType":1}'
```

- Login (curl):

```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@lpunetwork.edu.ph","password":"P@ssw0rd!"}'
```

- Upload an image (curl example):

```bash
curl -X POST http://localhost:3000/api/food/upload \
  -F "foodImage=@./path/to/local-image.jpg"
```

- Ask AI for a bundle recommendation (curl):

```bash
curl -X POST http://localhost:3000/api/ai/recommend-bundle \
  -H "Content-Type: application/json" \
  -d '{"foodName":"Adobo Rice"}'
```

---

**Notes, gotchas & troubleshooting**

- Sign-up domain enforcement: public signups are restricted to emails ending with `@lpunetwork.edu.ph`. Adjust logic in [server.js](server.js#L1) if you need a different rule.
- Database connection failures typically mean env variables are missing or MySQL isn't reachable. Check `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME`.
- Cloudinary upload errors usually indicate missing/wrong Cloudinary credentials.
- AI failures (`ai.js`) mean the `OPENROUTER_API_KEY` is missing or OpenRouter is rejecting requests. Inspect server logs for the error message printed by `askGPT`.
- The project currently lacks a `start` script in `package.json`. Add one like `"start": "node server.js"` for convenience.

---

**Recommended next steps / improvements**

- Add `scripts.start` and `scripts.dev` to `package.json`.
- Add automated migrations (knex, sequelize, or Flyway) instead of ad-hoc SQL.
- Add JWT/session management and role-based middleware to lock down admin/seller routes.
- Add basic tests for critical endpoints and CI integration.
- Add a `seed` command or script for local developer accounts.

---

If you'd like, I can:

- add a `start` script to `package.json`,
- create a `.env.example` file in the repo,
- or create basic curl-based smoke tests for the core endpoints.

Tell me which of those you'd like next.
