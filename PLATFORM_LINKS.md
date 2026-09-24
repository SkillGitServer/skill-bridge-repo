# 🌐 Skill Bridge India — Master Platform & Service Directory

A centralized reference of all cloud services, deployment platforms, API dashboards, and infrastructure links powering the Skill Bridge India application.

---

## 🚀 1. Hosting & Deployments

| Service | Purpose | Dashboard Link | Related Env Variables |
| :--- | :--- | :--- | :--- |
| **Frontend (Netlify)** | Hosts the Vite React single-page app, builds, and custom domain routing | [Netlify Project Overview](https://app.netlify.com/projects/official-skill-bridge-india/overview) | `VITE_API_BASE_URL` (in Netlify env) |
| **Backend & PDF Engine (Render)** | Hosts the Node.js/Express REST API server and handles Puppeteer PDF generations | [Render Backend Service](https://dashboard.render.com/web/srv-daprftbncjis73ffka4g) | `PORT`, `NODE_ENV`, `JWT_SECRET` |

---

## 🗄️ 2. Database

| Service | Purpose | Dashboard Link | Related Env Variables |
| :--- | :--- | :--- | :--- |
| **MongoDB Atlas** | Production cloud database cluster storing student profiles, exams, jobs, and results | [MongoDB Atlas Cluster Overview](https://cloud.mongodb.com/v2/6ab3b1e7469f3d0d4aa5566a#/overview) | `MONGO_URI` |

---

## 🤖 3. AI & LLM Engine

| Service | Purpose | Dashboard Link | Related Env Variables |
| :--- | :--- | :--- | :--- |
| **Groq Cloud Console** | Ultra-fast LLM inference powering Bridge AI assistant, AI Practice questions, and ATS resume critiques | [Groq API Keys](https://console.groq.com/keys) | `GROQ_CHAT_API_KEY`, `AI_RESUME_API_KEY`, `VITE_GROQ_API_KEY` |

---

## 🔑 4. Google Cloud & Drive Storage

| Service | Purpose | Dashboard Link | Related Env Variables |
| :--- | :--- | :--- | :--- |
| **Google Cloud Console** | Google OAuth 2.0 Sign-In client and Google Drive API integration for cloud document sync | [Google Cloud Console](https://console.cloud.google.com) | `GOOGLE_CLIENT_ID`, `VITE_GOOGLE_CLIENT_ID` |
| **Google Cloud Credentials** | Manage OAuth Consent Screen, authorized redirect URIs, and Service Account / Client keys | [GCP Credentials Manager](https://console.cloud.google.com/apis/credentials) | `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`, `GOOGLE_DRIVE_REFRESH_TOKEN`, `GOOGLE_DRIVE_FOLDER_ID` |

---

## ✉️ 5. Email & OTP Verification

| Service | Purpose | Dashboard Link | Related Env Variables |
| :--- | :--- | :--- | :--- |
| **Brevo (Sendinblue)** | Transactional email delivery over HTTPS API (port 443) for OTP verifications and mentor notifications | [Brevo Dashboard](https://app.brevo.com/) | `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` |
| **Brevo Security & Whitelist** | Manage API access, authorized sender IPs, and security policies | [Brevo Authorised IPs](https://app.brevo.com/security/authorised_ips) | `BREVO_API_KEY` |
| **Brevo API Keys** | Generate or rotate SMTP / REST v3 API keys | [Brevo API Keys](https://app.brevo.com/settings/keys/api) | `BREVO_API_KEY` |

---

## 🖼️ 6. Media & Document Storage *(Remaining / Additional)*

| Service | Purpose | Dashboard Link | Related Env Variables |
| :--- | :--- | :--- | :--- |
| **Cloudinary** | Cloud image and document storage for student profile photos, certificate assets, and verification documents | [Cloudinary Console](https://console.cloudinary.com/) | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |

---

## 💳 7. Payment Gateway *(Remaining / Additional)*

| Service | Purpose | Dashboard Link | Related Env Variables |
| :--- | :--- | :--- | :--- |
| **Razorpay** | Payment processing for student registrations, verified assessments, and platform checkout | [Razorpay Dashboard](https://dashboard.razorpay.com/) | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `VITE_RAZORPAY_KEY_ID` |

---

## ⏱️ 8. Keep-Alive & Monitoring (Crons)

| Service | Purpose | Dashboard Link | Configuration Notes |
| :--- | :--- | :--- | :--- |
| **UptimeRobot** | Recurring HTTP keep-alive pingers to prevent Render backend from sleeping on inactivity | [UptimeRobot Monitors](https://dashboard.uptimerobot.com/monitors) | Pings Render `/api/health` or root endpoint every 5–10 mins |

---

## 🐙 9. Git Code Repositories

| Repository | Purpose | URL |
| :--- | :--- | :--- |
| **Primary GitHub Repo** | Primary development and version control repository | [GitHub: Skill_Bridge_India_V2](https://github.com/aniket-gupta020/Skill_Bridge_India_V2) |
| **Git Server Backup** | Automated secondary push mirror (`origin` dual-push) | [GitHub: skill-bridge-repo](https://github.com/SkillGitServer/skill-bridge-repo) |

---

## 📋 Summary of Remaining Services Added:
In addition to the links you provided, the following two critical third-party services were identified from your backend environment and added:
1. **Cloudinary** ([https://console.cloudinary.com/](https://console.cloudinary.com/)): For student avatar photos and certificate document storage (`CLOUDINARY_CLOUD_NAME`).
2. **Razorpay** ([https://dashboard.razorpay.com/](https://dashboard.razorpay.com/)): For payment checkout processing (`RAZORPAY_KEY_ID`).
