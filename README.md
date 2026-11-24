# CampusFind – Smart Campus Lost & Found Portal with Automatic Item Matching

A full-stack, database-backed, AI-powered university lost-and-found web application designed for **Odisha University of Technology and Research (OUTR), Bhubaneswar**.

**Project Team (7th Semester, B.Tech CSE):**
- **Satyaprakash Naik** (`23110307`)
- **Shyam Sundar Soren** (`2311030`)
- **Institution:** Odisha University of Technology and Research (OUTR), Bhubaneswar
- **Contact:** `satyabusiness118@gmail.com` · Student Services Office, OUTR, Bhubaneswar

---

## 1. Quick Start & Commands

### Prerequisites
- **Node.js 22.5+ / 24+** (uses built-in `node:sqlite` for zero-dependency persistent relational SQLite storage)

### Install & Run Full-Stack Server (Frontend + REST API + SQLite DB)
```bash
npm install
npm run dev
```
The Vite server automatically mounts the full REST API router (`backend/apiRouter.js`) on `/api/*` backed by `backend/campusfind.db`.

### Run Automated 17-Step End-to-End Acceptance & Security Tests
```bash
npm run test:e2e
```

### Build & Lint
```bash
npm run lint
npm run build
npm run preview
```

---

## 2. Seeded Evaluation Accounts

| Role | Name | Email | Password | Campus ID |
| :--- | :--- | :--- | :--- | :--- |
| **Student** | Satyaprakash Naik | `satya@university.edu` | `student123` | `23110307` |
| **Student** | Shyam Sundar Soren | `shyam@university.edu` | `student123` | `2311030` |
| **Faculty** | Dr. Priyabrata Mohanty | `faculty@university.edu` | `faculty123` | `FAC-204` |
| **Staff** | Ramesh Chandra Behera | `staff@university.edu` | `staff123` | `STF-104` |
| **Administrator** | OUTR Campus Administrator | `admin@university.edu` | `admin123` | `ADM-001` |

---

## 3. System Architecture & Key Features

1. **Complete User Registration & Authentication (`/login`, `/register`, `/admin/login`, `/forgot-password`, `/profile`):**
   - Student, Faculty, and Staff registration with full university fields (Full Name, University Email, Student/Employee ID, Department, Course, Semester, Phone, Password, Confirm Password).
   - Blocks duplicate emails (`409`) and prevents self-registration as Administrator (`403`).
   - Password hashing via Node `crypto.scryptSync` with cryptographic salt (`scrypt$<salt>$<hash>`).
   - Signed HMAC-SHA256 JWT session authentication (`Bearer <token>`), profile editing, notification preferences, password change, and password reset flow.

2. **Personalized Student / Faculty / Staff Dashboard (`/dashboard`):**
   - Displays live database statistics: Total Lost Reported, Total Found Reported, AI Potential Matches, Pending Claims, Approved Claims, and Returned Items.
   - Sections for **My Recent Activities** (with Edit & Close actions), **My AI Matches**, **My Claims** (with QR verification token access), **Notifications Center**, and **Quick Actions**.

3. **Advanced Lost & Found Item Reporting (`/report`, `/report?edit=<id>`):**
   - Dedicated Lost and Found reporting modes with configurable campus locations, brand, color, date, approximate time, distinguishing features, image upload (with preview, replace, and remove), and additional notes.
   - Generates unique report codes (`LST-2026-XXXX` / `FND-2026-XXXX`), guards against accidental duplicate submissions, and automatically triggers the AI matching engine and in-app notifications.

4. **Intelligent AI Automatic Item Matching (`src/utils/matcher.js`, `backend/db.js`, `/matches`):**
   - **Algorithm A — TF-IDF + Cosine Similarity:** Sublinear term-frequency weighting, smoothed IDF, bigrams, and cosine similarity baseline.
   - **Algorithm B — Sentence-BERT Semantic Similarity:** Concept-cluster semantic projections + character 3-gram subword embeddings + IDF-weighted token vectors to capture cross-vocabulary paraphrases (e.g., *"Black leather wallet containing an ATM card and college ID"* ↔ *"Found a dark black purse near the university library with some identification cards"*).
   - **Contextual Metadata Matching:** Combines text similarity with Category, Color, Brand, Campus Location proximity, Incident Date/Time proximity, and Distinguishing Features, generating human-readable **Matching Reasons**.
   - **Side-by-Side Comparison & Match Feedback:** Interactive modal comparing Lost vs. Found attributes and persistent user feedback buttons (`Relevant Match`, `Not My Item`, `Incorrect Match`).

5. **AI Model Performance & Evaluation Dashboard (`/evaluation`):**
   - Computes real **Precision@1**, **Precision@5**, **Recall@5**, and **Mean Reciprocal Rank (MRR)** dynamically from the 12-pair ground-truth `evaluation_dataset` table in the database.
   - Includes a visual comparison chart, metric definitions, an interactive live semantic sandbox, and pair-by-pair ground-truth rank inspection.

6. **Smart Search, Filtering & Item Details (`/browse`, `/items/:id`):**
   - Keyword search with explicit Search & Clear controls, filters for report type, category, campus location, status, and date range, sort options (Newest, Relevance, Oldest, Title), **Grid / List View** toggle, and pagination.
   - Privacy-preserving Item Details showing only public reporter name and role (never exposing private student/employee IDs, phone numbers, or claimant evidence).

7. **Ownership Claim, Admin Verification & Physical Handover (`/claim/:itemId`, `/claims/:claimId`, `/admin`):**
   - Structured claim submission with proof upload, duplicate claim prevention, and conflict resolution.
   - Administrator Control Panel with 8 live database metric cards, Claims Verification Queue with evidence inspection modal, automated Handover Scheduling with unique QR verification tokens (`QR-OUTR-...`), Physical Handover Completion (marking items `Returned` and linked lost reports `Resolved`), AI Matching Configuration, User Management, Audit Logs, and CSV export.

---

## 4. Relational Database Schema

Implemented in SQLite (`backend/db.js` → `backend/campusfind.db`) and PostgreSQL (`backend/schema_postgres.sql`) with 13 normalized relational tables:

- `users` — Registered students, faculty, staff, and administrators with hashed passwords and notification preferences
- `categories` — Item categories (`id-card`, `phone`, `book`, `key`, `bag`, `other`)
- `campus_locations` — Configurable OUTR campus buildings and zones
- `lost_items` — Lost item reports (`LST-2026-XXXX`)
- `found_items` — Found item reports (`FND-2026-XXXX`)
- `item_images` — Uploaded photographs linked to lost/found reports
- `ai_matches` — Automatically computed TF-IDF, Sentence-BERT, contextual, and final similarity scores + JSON matching reasons
- `match_feedback` — User feedback records (`relevant`, `not_my_item`, `incorrect`)
- `claims` — Ownership claim submissions and admin verification decisions (`CLM-2026-XXXX`)
- `handover_records` — Scheduled and completed physical item handovers with QR verification tokens (`HND-2026-XXXX`)
- `notifications` — In-app user notifications with read/unread tracking
- `audit_logs` — Tamper-evident audit trail of registrations, reports, claims, handovers, and admin actions
- `evaluation_dataset` — 12 ground-truth lost/found benchmark pairs for live Precision@k, Recall@5, and MRR evaluation
