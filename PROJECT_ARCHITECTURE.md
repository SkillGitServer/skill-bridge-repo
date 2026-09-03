# Project Architecture

This document describes the architectural layout, authentication flows, and data structures for the Skill Hub India platform.

## Multi-Tenant Authentication & Hierarchy

The platform implements a multi-tenant isolation structure to allow multiple institutes (Admins) to conduct examinations for their respective student pools securely.

### 3-Tier Access System

1. **Super Admin (Tier 1)**
   - The master controller of the platform.
   - Responsible for reviewing registration requests from institutes/teachers wanting to obtain Admin privileges.
   - Can approve or reject requests.

2. **Admin - Institutes/Teachers (Tier 2)**
   - Once approved by the Super Admin, the system generates a unique, immutable **Admin Referral Code** (e.g., `SH-XXX-YYYY`).
   - Admins have access to a dedicated dashboard to:
     - Manage question banks and question categories.
     - Set up examinations with custom timers, rules, and durations.
     - View and manage their linked candidates.
     - Access detailed test performance metrics and download candidate reports.

3. **Student - Candidates (Tier 3)**
   - The end-users taking tests.
   - During registration, providing a valid **Admin Referral Code** is strictly mandatory.
   - Students cannot register without a valid, approved referral code from a registered Admin.

---

### Database Logic (MongoDB Planning)

To enforce tenancy separation and security, the backend registration pipeline operates on the following query sequence:

```mermaid
sequenceDiagram
    autonumber
    actor Candidate as Student / Candidate
    participant API as Backend Signup API
    database DB as MongoDB Database

    Candidate->>API: Submit Details (Name, Phone/Email, Admin Referral Code)
    API->>DB: Query Admins Collection (find admin by Referral Code)
    
    alt Referral Code is Invalid
        DB-->>API: No matching Admin found
        API-->>Candidate: Return 400 Error (Invalid Referral Code)
    else Referral Code is Valid
        DB-->>API: Match found (Admin Object)
        API->>DB: Create Student Document with linkedAdminId
        DB-->>API: Document created successfully
        API-->>Candidate: Return 201 Success (Authenticated Session)
    end
```

#### Schema Fields Mapping
* **`Admins` Collection**:
  - `referralCode` (String, unique, indexed): The immutable referral code issued by the system on approval.
  - `isApproved` (Boolean): Access control flag managed by Super Admin.
  
* **`Students` Collection**:
  - `linkedAdminId` (ObjectId, indexed): Permanent link referencing the associated `Admins` record.
  - **Tenancy Rule**: When querying published exams for a student, the server queries the `Exams` collection where `adminId === student.linkedAdminId`. This prevents candidates from viewing, accessing, or listing exams from any other institute.
