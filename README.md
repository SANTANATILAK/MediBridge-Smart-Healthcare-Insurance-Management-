# MediBridge: Smart Healthcare & Insurance Management Platform

MediBridge connects patients, hospitals and health insurers through one platform. Its core idea is the
**Universal Healthcare Transaction ID (UHT ID)**: every hospital visit gets one ID that ties together admission,
insurance verification, pre-authorization, treatment, bills, documents, claims and settlement.

| Layer     | Technology                                              | Folder       |
|-----------|---------------------------------------------------------|--------------|
| Frontend  | React 18, Vite, React Router, Recharts, plain CSS       | `frontend/`  |
| Backend   | Java 17, Spring Boot 3.3, Spring Security (JWT), JPA    | `backend/`   |
| Database  | MySQL 8                                                 | (compose)    |
| AI        | Python 3.11, FastAPI, Gemini API, Tesseract OCR         | `ai-service/`|

## Features

**Public site:** hero with UHT ID tracker, services, how-it-works, partner hospitals and insurers (live from the API),
testimonials, FAQ, contact form.

**Login portals:** separate sign-in for patients (with self-registration), hospitals, insurers and super admins.
Role-based access is enforced by the API and by the React routes.

**Patient dashboard:** profile management, policies with remaining coverage, hospital search by city, side-by-side
comparison of up to three hospitals, visit history with UHT IDs, claim submission and tracking, notifications,
AI policy explanation and an AI assistant chat.

**Hospital dashboard:** patient lookup with coverage, admission with automatic pre-authorization against remaining
coverage, discharge, claim submission for discharged visits, approval tracking and analytics.

**Insurer dashboard:** incoming claim queue, approve / reject / request-info, settlement, fraud-risk alerts for human
investigation, performance analytics (pie chart, settlement ratio).

**Super admin:** platform counts, claims-by-status analytics, user list with activate / deactivate.

**AI service:** healthcare assistant (Gemini, with a rule-based fallback), policy explanation, deterministic
missing-document detection and claim-readiness score, OCR and insurance document classification with amount extraction.

**Fraud screening:** on submission, claims are flagged when they exceed remaining coverage, duplicate a visit claim,
or are high-value. Flags go to the insurer's alert queue. Nothing is rejected automatically.

## Quick start (Docker)

```bash
cp .env.example .env          # optional: add GEMINI_API_KEY and a strong JWT_SECRET
docker compose up --build
```

Open **http://localhost:8081**. The API is on `:8080`, the AI service on `:8000`, MySQL on `:3306`.

## Quick start (local development)

Prerequisites: Java 17+, Maven 3.9+, Node 18+, Python 3.11+, MySQL 8 (or Docker for MySQL only).

1. **MySQL**: create a database and user, or run only the database container:
   ```bash
   docker run -d --name mb-mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=rootpass \
     -e MYSQL_DATABASE=medibridge -e MYSQL_USER=medibridge -e MYSQL_PASSWORD=medibridge mysql:8.0
   ```
2. **AI service**:
   ```bash
   cd ai-service
   python -m venv .venv && source .venv/bin/activate
   pip install -r requirements.txt
   export GEMINI_API_KEY=your-key      # optional
   uvicorn main:app --reload --port 8000
   ```
   OCR needs the Tesseract binary (`apt install tesseract-ocr` or `brew install tesseract`).
3. **Backend**:
   ```bash
   cd backend
   mvn spring-boot:run                 # http://localhost:8080
   ```
   Tables are created automatically and demo data is loaded on the first start.
4. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev                         # http://localhost:5173 (proxies /api to :8080)
   ```

## Demo accounts

All demo accounts use the password **`Demo@123`**. Change them before any real deployment.

| Portal         | Email                      | Notes                                         |
|----------------|----------------------------|-----------------------------------------------|
| Patient        | `patient@medibridge.in`    | Rahul Sharma (code `MB-P-000101`), active admission, settled claim |
| Patient        | (register your own)       | Self-registration creates a new patient code  |
| Hospital       | `hospital@medibridge.in`   | CityCare Multispeciality Hospital, Bhubaneswar |
| Insurer        | `insurer@medibridge.in`    | Shield Health Insurance, includes a fraud-risk alert |
| Super Admin    | `admin@medibridge.in`      | Platform console                              |

Priya Nair (`MB-P-000102`) is seeded as a patient record for hospital lookup demos.

## Demo flow (suggested)

1. Log in as the **hospital**, open *Patient Lookup*, search `MB-P-000101`, and admit that patient with an estimate.
   The response shows a new UHT ID and the pre-authorization result.
2. Copy the UHT ID to the **homepage tracker** to see the live journey, with no login required.
3. Log in as the **patient** and check *Policies & Coverage*, *Notifications* and *AI Assistant*. Submit a claim from *Claims*.
4. Log in as the **insurer** and approve, then settle the claim. Open *Fraud-Risk Alerts* to review flagged claims.

## API overview

| Method | Path | Role | Purpose |
|--------|------|------|---------|
| POST | `/api/auth/register` | public | Patient self-registration |
| POST | `/api/auth/login` | public | Login, with optional `portal` check |
| GET  | `/api/public/hospitals?city=` | public | Partner hospitals, filterable by city |
| GET  | `/api/public/insurers` | public | Insurance partners |
| GET  | `/api/public/track/{uhtId}` | public | Visit journey summary by UHT ID |
| POST | `/api/public/contact` | public | Contact form |
| GET  | `/api/patient/dashboard` | PATIENT | Profile, policies, visits, claims, notifications |
| PUT  | `/api/patient/profile` | PATIENT | Update personal profile |
| POST | `/api/patient/claims` | PATIENT | Submit a claim |
| POST | `/api/patient/notifications/read-all` | PATIENT | Mark notifications read |
| GET  | `/api/hospital/dashboard` | HOSPITAL | Visits, claims, analytics |
| GET  | `/api/hospital/patients?q=` | HOSPITAL | Patient lookup with coverage |
| POST | `/api/hospital/visits` | HOSPITAL | Admit patient, issue UHT ID, pre-auth check |
| POST | `/api/hospital/visits/{id}/discharge` | HOSPITAL | Discharge and final bill |
| POST | `/api/hospital/claims` | HOSPITAL | Claim for a discharged visit |
| GET  | `/api/insurer/dashboard` | INSURER | Claims queue, stats, fraud alerts |
| POST | `/api/insurer/claims/{id}/decision` | INSURER | `APPROVE`, `REJECT`, `REQUEST_INFO`, `SETTLE` |
| GET  | `/api/admin/dashboard` | ADMIN | Platform counts and users |
| PATCH | `/api/admin/users/{id}/toggle` | ADMIN | Activate or deactivate an account |
| POST | `/api/ai/{action}` | authenticated | `chat`, `explain-policy`, `claim-readiness`, `analyze-document` |

## Configuration

Backend environment variables (see `backend/src/main/resources/application.yml`):

| Variable | Default | Purpose |
|----------|---------|---------|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | localhost / 3306 / medibridge | MySQL connection |
| `JWT_SECRET` | demo value | **Must be replaced in production** (32+ characters) |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allowed origins |
| `AI_SERVICE_URL` | `http://localhost:8000` | Python AI service base URL |

AI service: `GEMINI_API_KEY` (optional; without it, rule-based answers are used), `GEMINI_MODEL` (default `gemini-1.5-flash`).

## Security notes

- Passwords are hashed with BCrypt. Password hashes are never returned by the API.
- Stateless JWT authentication, with roles embedded in the token and enforced per URL prefix.
- The AI proxy only forwards allow-listed actions, and the Gemini key is sent in a header, not in the URL.
- Fraud flags are advisory and always routed to a human investigator.

## Production checklist

- Set a strong `JWT_SECRET`, and remove or change the demo passwords.
- Serve the frontend and API over HTTPS (terminate TLS at the load balancer or nginx).
- Replace `ddl-auto: update` with Flyway or Liquibase migrations.
- Encrypt sensitive personal fields (for example, government ID numbers) at rest with a KMS-managed key.
- The AI service currently accepts requests from any origin. Keep it on a private network, reachable only from the backend, or restrict its CORS policy.
- Add rate limiting on `/api/auth/*` and `/api/public/contact`.

## Project layout

```
medibridge/
├── backend/            Spring Boot API (controllers, services, JPA entities, JWT security, seed data)
├── frontend/           React app (public site, login portals, four role dashboards)
├── ai-service/         FastAPI service (assistant, policy explainer, readiness, OCR)
├── docker-compose.yml  MySQL + backend + AI + frontend
└── .env.example
```
