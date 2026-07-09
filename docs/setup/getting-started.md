# Getting Started — Local Development

## Prerequisites

| Tool       | Version  | Install                          |
|------------|----------|----------------------------------|
| Node.js    | ≥ 20     | https://nodejs.org               |
| MySQL      | ≥ 8.0    | https://dev.mysql.com/downloads  |
| npm        | ≥ 10     | Bundled with Node                |

---

## 1. Clone & Install

```bash
git clone <repo-url>
cd TOUB_POS

# Install frontend dependencies
cd frontend && npm install && cd ..

# Install backend dependencies
cd backend && npm install && cd ..
```

---

## 2. Database Setup

```bash
# Log into MySQL
mysql -u root -p

# Run the schema
SOURCE docs/database/schema.sql;
```

---

## 3. Environment Variables

Copy the example file and fill in your values:

```bash
cp backend/.env.example backend/.env
```

**`backend/.env` keys:**

| Key              | Example value          | Description                  |
|------------------|------------------------|------------------------------|
| `PORT`           | `3000`                 | Express server port          |
| `DB_HOST`        | `localhost`            | MySQL host                   |
| `DB_PORT`        | `3306`                 | MySQL port                   |
| `DB_NAME`        | `toub_pos`             | Database name                |
| `DB_USER`        | `root`                 | MySQL user                   |
| `DB_PASSWORD`    | `yourpassword`         | MySQL password               |
| `JWT_SECRET`     | `change_me_in_prod`    | JWT signing secret           |
| `JWT_EXPIRES_IN` | `8h`                   | Token lifetime               |
| `PLATFORM_ADMIN_USERNAME` | `platform_admin` | Local bootstrap username |
| `PLATFORM_ADMIN_PASSWORD` | `platform123` | Local bootstrap password |
| `PLATFORM_ADMIN_ROLE` | `platform_admin` | Local bootstrap role |

---

## 4. Run

Open two terminals:

**Terminal 1 — Backend**
```bash
cd backend
npm run dev
# Listening on http://localhost:3000
```

**Terminal 2 — Frontend**
```bash
cd frontend
npm run dev
# Vite dev server on http://localhost:5173
```

---

## 5. Default Credentials

> Local development startup creates this API-only bootstrap account if it does not already exist. Change the password before any real deployment.

| Role | Username | Password | PIN |
|------|----------|----------|-----|
| Platform Admin | `platform_admin` | `platform123` | — |

---

## 6. Verify

```bash
curl http://localhost:3000/api/health
# → { "success": true, "message": "Toub POS API is healthy." }
```

---

## Useful Scripts

| Command              | Location   | Description              |
|----------------------|------------|--------------------------|
| `npm run dev`        | `backend/` | Start backend with nodemon |
| `npm run dev`        | `frontend/`| Start Vite dev server    |
| `npm run build`      | `frontend/`| Production bundle        |
| `npm run lint`       | `frontend/`| ESLint check             |
