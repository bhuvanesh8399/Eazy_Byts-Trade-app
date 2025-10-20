## Eazy_Byts-Trade-app
# Stock Trading Simulator (STS-2025-BD)

A production-style **paper trading simulator**: virtual portfolios, order flow, and chart-informed decisions—safe market practice with a clean, modern stack.

**Stack**
- **Backend:** Java 21 • Spring Boot 3.3.x • JPA • Security (JWT) • Caffeine • Flyway • H2 (dev) / Postgres 16 (prod)
- **Frontend:** React 18 + Vite (TS/JS) • Chart.js
- **Dev URLs:** API `http://localhost:8080` • Web `http://localhost:5173`

---

## Project Status
- ✅ Backend Step 2 complete: Gradle 8.9 ok, **/api/hello** 200, Actuator **UP**, CORS baseline, stateless security filter chain, global exception handler, Flyway present (no migrations)
- ✅ Frontend Step 1: Vite baseline, Router (Login/Dashboard/Portfolio/Orders), `.env` wired, `/ping` health, ESLint+Prettier
- ⏭️ Next: **Backend Step 3 — JWT auth** (User entity+repo, BCrypt, token issue/verify, JwtAuthFilter) and **Frontend Step 2 — auth flow + protected routes**

---

## Quickstart

### Option A — Docker
```bash
docker network create sts-net 2>/dev/null || true

# Postgres 16 (use 55432 if 5432 conflicts)
docker run -d --name sts-db --network sts-net \
  -e POSTGRES_DB=stsdb -e POSTGRES_USER=sts -e POSTGRES_PASSWORD=sts \
  -p 55432:5432 postgres:16

# Backend
docker build -t sts-backend ./backend
docker run -d --name sts-backend --network sts-net --env-file ./backend/.env.example \
  -p 8080:8080 sts-backend

# Frontend
docker build -t sts-frontend ./frontend
docker run -d --name sts-frontend --network sts-net --env-file ./frontend/.env.example \
  -p 5173:5173 sts-frontend
