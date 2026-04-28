# CHD Research Portal cPanel Backend Readiness

This portal is prepared to move from demo/local state to a GoDaddy cPanel backend without changing the user-facing workflow.

## Recommended Stack

- PHP 8.x endpoints under `/api`
- MySQL or MariaDB through cPanel
- Session cookies for authenticated staff and subscribers
- cPanel file storage for PDFs, profile images, digest files, and price lists
- SMTP from the domain mail service for password reset and access notifications

## Core Tables

- `users`: account profile, tier, role, institution, password hash, status
- `access_requests`: self-registration requests awaiting Research Desk review
- `access_codes`: individual and institutional activation codes
- `institutions`: institution profile, seat limit, seats used, code owner
- `reports`: title, excerpt, body, category, access tier, status, owner, publication date
- `report_versions`: previous versions and revisions
- `approvals`: reviewer, decision, timestamp, rejection reason
- `analysts`: public analyst profiles and internal contributor records
- `library_documents`: archive/library file metadata
- `digests`: digest summary, highlights, file path, updated date
- `fund_snapshots`: NAV, AUM, returns, chart data, data date, source
- `audit_log`: every publish, approval, access, code, and delete action

## Workflow Rules

- Self-registration creates a limited account and an `access_requests` row.
- Full access starts only after the Research Desk approves entitlement and issues an activation code.
- Individual codes are single-person codes.
- Institutional codes are master codes with seat limits and seat tracking.
- Intern uploads do not publish directly. They move through review.
- Reports must have owner, category, date, access tier, status, and disclosure language before publication.
- Admin/Research Desk actions should write to `audit_log`.

## Frontend Integration

Set `REACT_APP_API_BASE` when the backend is not hosted at `/api`.

Example:

```env
REACT_APP_API_BASE=https://yourdomain.com/api
```

The existing frontend already centralizes most backend calls through `src/api.js`, and direct upload/settings calls now use the same API base helper.
