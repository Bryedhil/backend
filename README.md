# Student Expense List System — Backend

Express + MongoDB API with role-based authentication.

## Requirements
- Node.js 18+ (Node.js 20 LTS recommended)
- MongoDB running locally, or a MongoDB connection URI

## Setup
1. Run `npm install`.
2. Copy `.env.example` to `.env` (`copy .env.example .env` in Windows Command Prompt).
3. Set `MONGODB_URI` and replace `JWT_SECRET` with a long random secret.
4. Start MongoDB.
5. Import student accounts: copy `student-expense-login-credentials.csv` into this folder, then run `npm run seed:accounts`.
6. Create an administrator: add `ADMIN_USERNAME` and `ADMIN_PASSWORD` to `.env` (password at least 12 characters), then run `npm run create:admin`.
7. Run `npm run dev`.

## Authentication
- `POST /api/auth/login` with `{ "username": "...", "password": "..." }`
- `GET /api/auth/me` with `Authorization: Bearer <token>`
- `POST /api/auth/change-password` with `{ "currentPassword": "...", "newPassword": "..." }`
- `GET /api/student-portal/me` gives the signed-in student's own profile, payments, assigned charges, and unpaid balance.
- `GET /api/charges` lists individual charges (treasurer/admin only).
- `POST /api/charges` assigns an individual charge. Body: `{ "studentId": "<MongoDB Student _id>", "description": "...", "amount": 100, "dueDate": "2026-10-31" }`.
- `PUT /api/charges/:id` edits an assigned charge; `DELETE /api/charges/:id` removes an incorrect charge.
- `POST /api/contributions` records a student payment. The student balance is calculated automatically as assigned charges minus recorded payments; there is no manual balance field.

The existing class dashboard, students, contributions, expenses, and transactions endpoints now require a treasurer or admin token. Students cannot read the whole class's private records.

## Important
The CSV contains plaintext temporary passwords. Keep it private and do not commit it to GitHub. The import script hashes passwords before storing them in MongoDB. Students must change temporary passwords at first login. Student unpaid balances are based on charges assigned by the treasurer minus recorded contributions; the system does not guess how class expenses should be split.


## Optional Gemini AI features (Cathrine chatbot and admin financial summary)
1. Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/). Free-tier access, model availability, and usage limits depend on Google's current offering and your account.
2. Add `GEMINI_API_KEY=your_key` to the backend `.env` file. The default model is `gemini-2.5-flash-lite`; you can change `GEMINI_MODEL` to a model available to your Google AI Studio account. Keep this key private and never add it to the React frontend.
3. Run `npm install` in this backend folder, then restart with `npm run dev`.
4. The authenticated `POST /api/ai/chat` endpoint accepts `{ "message": "...", "history": [] }`. Students can ask about their own linked records only; admin/treasurer questions use the authorized class summary. The assistant's name is Cathrine.
5. `POST /api/ai/admin-summary` is restricted to admin/treasurer roles and returns calculated metrics plus Cathrine's AI-written explanation.
6. If `GEMINI_API_KEY` is absent, the rest of the system still runs, but AI endpoints return a setup message. AI outputs are explanatory only; MongoDB/backend calculations remain the source of truth. Gemini free-tier usage is limited and may return HTTP 429 when a rate or usage limit is reached.


## Forgot password
1. Add `nodemailer` by running `npm install` in `server-side`.
2. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, and `FRONTEND_URL` in `.env`. For Gmail, use an app password, not your normal account password.
3. Ensure each account has a verified email saved in MongoDB. New account imports can include an `email` column in `student-expense-login-credentials.csv`. To add or update emails for existing accounts without changing their passwords, create `account-emails.csv` with `username,email` columns and run `npm run accounts:emails`. Existing accounts without email must be updated before password recovery will work.
4. Password reset links expire after 30 minutes and can only be used once. The system stores a hash of the reset token and does not reveal whether an email address belongs to an account.

### Reset password to the configured default

The Forgot Password flow still requires a one-time email link. After the user opens the link, the system resets the account password to `DEFAULT_RESET_PASSWORD` from `.env` and marks the account as requiring a password change. Configure a temporary value of at least 10 characters; keep it private and change it periodically. The verified reset page reveals the temporary password once so the user can sign in. All account roles are required to change the temporary password after login. A shared default password is less secure than a unique reset, so use this only for a controlled school/project environment.


## Student self-registration and password recovery

- Student registration is available from the frontend login screen. It only creates a `student` account when the submitted student ID and full name match an existing active `Student` record. Admins/treasurers cannot be created through public registration.
- A student record must be added by an administrator or imported before the student can register.
- Password recovery requires student ID, full name, and the email address already linked to that account. ID/name alone never resets a password. Configure SMTP settings and `FRONTEND_URL` in `.env` for recovery email delivery.
- Change `DEFAULT_RESET_PASSWORD` to a strong temporary password of at least 10 characters. Users are required to change it after signing in. Do not commit `.env` to source control.
