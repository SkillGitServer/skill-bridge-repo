# Developer Documentation & Architecture Guide

- **Current Version:** v1.1.0
- **Lead Developer / Maintainer:** Aniket Gupta
- **Project Scope:** Skill Bridge India / Skill Sups (Admin, Super Admin, Student Portals)

---

## 👤 Lead Developer & Maintainer Contact & Social Details

| Field / Channel | Information / Link |
| :--- | :--- |
| **Full Name** | **Aniket Gupta** (Aniket Kailash Gupta) |
| **Google Email / ID** | [mail.akguptaji@gmail.com](mailto:mail.akguptaji@gmail.com) |
| **Mobile Number** | [+91 74149 08640](tel:+917414908640) |
| **Portfolio Website** | [aniket.bot.cd](https://aniket.bot.cd/) *(Canonical: [ianiket.netlify.app](https://ianiket.netlify.app/))* |
| **GitHub** | [github.com/aniket-gupta020](https://github.com/aniket-gupta020) |
| **LinkedIn** | [linkedin.com/in/aniket-guptaji](https://www.linkedin.com/in/aniket-guptaji/) |
| **WhatsApp** | [Chat on WhatsApp (+91 74149 08640)](https://wa.me/917414908640?text=Hii%20Aniket) |
| **Instagram** | [@me.anikett](https://www.instagram.com/me.anikett?igsh=cmlncGZocWJtdG0y) |
| **Snapchat** | [@snap_akguptaji](https://www.snapchat.com/add/snap_akguptaji?share_id=Un0HmCFs4GY&locale=en-US&fbclid=PAY2xjawIzsFNleHRuA2FlbQIxMQABpvrEMUX6uRdmjeKH6v3Jgl0tHtjJLs46ww7yZwsGxvoSkhf-3vnOw2DCcQ_aem_rOmCrCqf06SLmAA9JeE_IQ) |
| **Facebook** | [facebook.com/AniKetGupta347](https://www.facebook.com/AniKetGupta347) |
| **Location** | Chhatrapati Sambhajinagar, Maharashtra, India |

---

## 🛡️ Security & Role-Based Access Control (RBAC)
- **Strict Role Isolation:** The backend enforces strict cross-role validation on authentication routes. Email queries must explicitly match the intended `role` (student, admin, superadmin) to prevent Privilege Escalation Conflict (Role Bleed).
- **System Settings API:** Global security state (Site Lockdown, DevTools Blocker, Keyboard Shortcut Blocker) is managed centrally in MongoDB and enforced across all client interfaces globally.

---

## 🚀 Frontend Architecture (Vite + React)
- **Routing:** Standard, synchronous static imports are currently enforced for routing. Code-splitting via `React.lazy` and `Suspense` is disabled to prevent infinite loading states on dynamic dashboard components.
- **Data Fetching Failsafes:** All API calls within `useEffect` hooks must be wrapped in `try/catch/finally` blocks. State setters for loading indicators (e.g., `setIsLoading(false)`) must be explicitly called to prevent UI hangups if an endpoint returns a `404` or `500`.

---

## 💾 Backend Standards (Node.js + Mongoose)
- **Deprecation Standards:** When updating MongoDB documents, strictly use `{ returnDocument: 'after' }` rather than the deprecated `{ new: true }` option.
- **External Integrations:** Async operations communicating with external APIs (like Google Drive backups or Brevo OTPs) must catch local failures and return explicit HTTP error codes to the client, preventing silent failures.

---

## 📱 Application Assets
- Direct APK downloads for Android applications (Spark, Vault, SUPSS) are hosted as static assets within the `client/public/downloads` directory to bypass SPA routing fallbacks.
