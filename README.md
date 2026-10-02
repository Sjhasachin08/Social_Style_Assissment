# Social Style Assessment System

A simple, fully local web application implementing the Social Style self-assessment
(Assertiveness × Responsiveness → Analytical / Driver / Amiable / Expressive),
with accounts, role-based access, and admin management of history and users.

## Tech Stack

- **Backend:** Node.js, Express.js, SQLite (via Node's built-in `node:sqlite` module — no native compilation, no build tools required)
- **Auth:** bcrypt password hashing, JWT stored in an httpOnly cookie
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **PDF Reports:** PDFKit

**Requires Node.js 22.5 or newer** (for built-in SQLite support). Check your version with `node --version`; if it's older, install the latest LTS from https://nodejs.org.

## Getting Started

```bash
npm install
npm start
```

Then open **http://localhost:3000** in your browser.

That's it — on first run the app automatically:

1. Creates the `database/` folder if it doesn't exist
2. Creates `database/social_style.db` (SQLite file) if it doesn't exist
3. Creates all required tables (including `users`)
4. Seeds the 30 questionnaire items (15 Assertiveness + 15 Responsiveness)
5. Seeds the four Social Style descriptions
6. Seeds a **default admin account** and prints its credentials to the console:
   - email: `admin@example.com`
   - password: `ChangeMe123!`

   Override these before first run with environment variables:
   ```bash
   ADMIN_EMAIL=you@company.com ADMIN_PASSWORD=SomeStrongPassword npm start
   ```
   **Log in and change the password immediately in production.** Also set a
   fixed `JWT_SECRET` env var in production — without it, a random secret is
   generated per process start, which logs everyone out on every restart.

No database host, username, password, or connection string is ever required.

## Development

```bash
npm run dev
```

Runs the server with `nodemon` for auto-restart on file changes.

## Accounts & Roles

- **Sign up** (`/signup`) creates a regular `user` account. Public signup can
  never create an admin — the `role` field is always ignored from client input.
- **Regular users** can take the assessment and can only ever see, view, and
  download PDFs for **their own** results (`GET /api/assessments`,
  `GET /api/assessments/:id`, `GET /api/assessments/:id/pdf` are all scoped to
  `req.user.id` unless the caller is an admin).
- **Admins** can see everyone's assessment history, edit participant
  name/email on any record, delete any record, and manage user accounts
  (edit name/email/role, reset password, delete account) from `/admin/users`.
  An admin cannot delete their own account or demote/delete the last
  remaining admin (so you can never lock yourself out entirely).

## Application Flow

Sign Up / Log In → 30-Question Assessment → Submit →
Backend Scoring → Result Page (scores, matrix, personality analysis) → PDF Report

Admins additionally see Edit/Delete controls on the History page and on each
Result page, plus a "Users" link in the navbar for account management.

## Scoring Logic

- Assertiveness Total = sum of the 15 Assertiveness answers (each 1–4)
- Assertiveness Average = Assertiveness Total / 15
- Responsiveness Total = sum of the 15 Responsiveness answers (each 1–4)
- Responsiveness Average = Responsiveness Total / 15
- Midpoint = 2.5
  - Assertiveness < 2.5 and Responsiveness < 2.5 → **Analytical**
  - Assertiveness ≥ 2.5 and Responsiveness < 2.5 → **Driver**
  - Assertiveness < 2.5 and Responsiveness ≥ 2.5 → **Amiable**
  - Assertiveness ≥ 2.5 and Responsiveness ≥ 2.5 → **Expressive**

All scoring happens on the backend in `services/scoringService.js`. The frontend
only ever sends `{ questionId, selectedScore }` pairs — it never sends totals,
averages, or the resulting style, so scores cannot be tampered with client-side.
This was verified end-to-end: submitting all-high-assertive/all-low-responsive
answers correctly lands in **Driver**, and all-low-assertive/all-high-responsive
correctly lands in **Amiable** — both quadrants are fully reachable.

## API Endpoints

| Method | Path                          | Auth           | Description                                   |
|--------|-------------------------------|----------------|------------------------------------------------|
| POST   | `/api/auth/signup`            | Public         | Create a regular user account                  |
| POST   | `/api/auth/login`              | Public         | Log in, sets auth cookie                        |
| POST   | `/api/auth/logout`             | Logged in      | Clears auth cookie                              |
| GET    | `/api/auth/me`                 | Logged in      | Current user info                               |
| GET    | `/api/questions`               | Logged in      | List all active questionnaire items             |
| POST   | `/api/assessments`             | Logged in      | Submit a completed assessment (answers only — identity comes from the account) |
| GET    | `/api/assessments`              | Logged in      | Own results (or all, if admin)                  |
| GET    | `/api/assessments/:id`          | Owner or admin | Get a single assessment + its style details + answers |
| GET    | `/api/assessments/:id/pdf`      | Owner or admin | Download the PDF report                         |
| PUT    | `/api/assessments/:id`          | **Admin only** | Edit participant name/email on a record         |
| DELETE | `/api/assessments/:id`          | **Admin only** | Delete a record                                 |
| POST   | `/api/assessments/:id/answers`  | **Admin only** | Overwrite answers on an existing record (recalculates scores) |
| GET    | `/api/users`                    | **Admin only** | List all user accounts                          |
| PUT    | `/api/users/:id`                | **Admin only** | Edit a user's name/email/role/password          |
| DELETE | `/api/users/:id`                 | **Admin only** | Delete a user account                           |

## Project Structure

```
social-style-assessment/
├── database/
│   ├── database.js      # DB connection + auto-init
│   ├── schema.js         # Table definitions (incl. users, idempotent migrations)
│   ├── seed.js            # Default questionnaire + style content + default admin
│   └── social_style.db   # Created automatically on first run
├── middleware/
│   └── auth.js            # JWT sign/verify, authenticate + requireAdmin middleware
├── public/
│   ├── css/style.css
│   └── js/{app,assessment,result,history,admin-users}.js
├── routes/
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── questionRoutes.js
│   └── assessmentRoutes.js
├── controllers/
│   ├── authController.js
│   ├── userController.js
│   ├── questionController.js
│   └── assessmentController.js
├── services/
│   ├── scoringService.js
│   └── pdfService.js
├── views/
│   ├── index.html
│   ├── login.html
│   ├── signup.html
│   ├── assessment.html
│   ├── result.html
│   ├── history.html
│   └── admin-users.html
├── app.js
├── server.js
└── package.json
```

## Editing the Questionnaire

All questionnaire text and Social Style descriptions live in one place:
`database/seed.js`. Edit the `ASSERTIVENESS_QUESTIONS`, `RESPONSIVENESS_QUESTIONS`,
or `SOCIAL_STYLES` arrays, delete `database/social_style.db`, and restart the
server to re-seed with your changes.
