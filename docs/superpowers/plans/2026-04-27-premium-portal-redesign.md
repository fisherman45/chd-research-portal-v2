# Premium Portal Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevate the CHD Research Portal V2 into a more premium, editorial-luxury subscriber product with clearer internal publishing workflows and staged activation-based access.

**Architecture:** Keep the current single-file React application intact, but introduce a stronger shared visual system, richer access-state modeling, and cleaner portal workflows through focused in-place changes in `src/App.jsx`. Preserve existing routes and demo behavior while upgrading layout, forms, libraries, and admin controls.

**Tech Stack:** React 19, Create React App, local component state, localStorage persistence, existing `api` helpers, GitHub Pages deploy

---

### Task 1: Save the redesign checkpoint and working plan

**Files:**
- Modify: `docs/superpowers/specs/2026-04-27-premium-portal-redesign-design.md`
- Create: `docs/superpowers/plans/2026-04-27-premium-portal-redesign.md`

- [ ] **Step 1: Confirm the approved design spec exists**

Run: `Get-Content docs/superpowers/specs/2026-04-27-premium-portal-redesign-design.md`
Expected: approved premium redesign spec is present

- [ ] **Step 2: Save this implementation plan**

Write this file to:

```text
docs/superpowers/plans/2026-04-27-premium-portal-redesign.md
```

- [ ] **Step 3: Keep the checkpoint commit available for rollback**

Run:

```bash
git log --oneline -3
```

Expected: includes the redesign spec commit before implementation work

### Task 2: Add the new access model and premium UI primitives

**Files:**
- Modify: `src/App.jsx`
- Test: `npm run build`

- [ ] **Step 1: Add local data structures for activation codes and institutions**

Add seeded data and state for:

```js
const INIT_ACCESS_CODES = [
  { id: 1, code: "CHD-IND-2026-001", type: "individual", tier: "premium", assignedEmail: "", usedBy: "", usedAt: "", active: true, expiresAt: "2026-12-31" },
  { id: 2, code: "CHD-IND-2026-002", type: "individual", tier: "registered", assignedEmail: "", usedBy: "", usedAt: "", active: true, expiresAt: "2026-12-31" },
  { id: 3, code: "CHD-INST-ARM-001", type: "institution", tier: "premium", institutionId: 1, seatLimit: 12, seatsUsed: 3, active: true, expiresAt: "2026-12-31" },
];

const INIT_INSTITUTIONS = [
  { id: 1, name: "ARM Securities", code: "CHD-INST-ARM-001", seatLimit: 12, seatsUsed: 3, active: true, contact: "research@arm.com" },
  { id: 2, name: "Meristem", code: "CHD-INST-MER-001", seatLimit: 8, seatsUsed: 2, active: true, contact: "research@meristemng.com" },
];
```

- [ ] **Step 2: Extend user shape and localStorage keys**

Update `LS` and `App` state to persist:

```js
accessCodes: "chd_access_codes",
institutions: "chd_institutions",
```

And initialize:

```js
const [accessCodes,setAccessCodes] = useState(()=>lsGet(LS.accessCodes)||INIT_ACCESS_CODES);
const [institutions,setInstitutions] = useState(()=>lsGet(LS.institutions)||INIT_INSTITUTIONS);
```

- [ ] **Step 3: Add shared premium surface helpers**

Create compact reusable helpers in `src/App.jsx` for:

```js
function Surface({children,style}) { ... }
function Eyebrow({children,color}) { ... }
function MetricTile({label,value,sub,accent}) { ... }
function SectionFrame({title,sub,children,actions}) { ... }
```

- [ ] **Step 4: Verify the file still compiles conceptually**

Run: `npm run build`
Expected: build passes or returns only implementation-related errors from later tasks

### Task 3: Rebuild signup, activation, and limited-access flows

**Files:**
- Modify: `src/App.jsx`
- Test: `npm run build`

- [ ] **Step 1: Replace request-access-first registration with account creation**

Update `AuthPage` registration state so the form collects:

```js
{ name:"", email:"", company:"", phone:"", role:"Investor", password:"", confirmPassword:"" }
```

And saves created users locally with:

```js
{
  id: Date.now(),
  name,
  email,
  company,
  phone,
  tier: "registered",
  accessState: "limited",
  institutionId: null,
  activationHistory: [],
}
```

- [ ] **Step 2: Add activation actions**

Implement:

```js
const activateIndividualCode = (code, userEmail) => { ... }
const activateInstitutionCode = (code, userEmail) => { ... }
```

Rules:
- individual codes are single-use
- institution codes consume seats
- successful activation upgrades the user tier and access state

- [ ] **Step 3: Add a limited-access state card and activation UI**

Create UI inside `AuthPage` or adjacent account flow for:

```js
"Activate individual code"
"Activate institutional code"
"Continue with limited access"
```

And a limited-access message describing:
- account created
- full research access requires activation
- contact research or institution admin

- [ ] **Step 4: Gate subscriber library access with clearer messaging**

Update premium gating copy to reflect activation logic instead of generic paywall wording.

- [ ] **Step 5: Run build**

Run: `npm run build`
Expected: PASS

### Task 4: Redesign the public and subscriber surfaces

**Files:**
- Modify: `src/App.jsx`
- Test: `npm run build`

- [ ] **Step 1: Upgrade header, footer, and form input styling**

Refine:
- `Inp`
- `Header`
- `Footer`

With calmer spacing, stronger hierarchy, and a more premium CHD surface treatment.

- [ ] **Step 2: Redesign `Home`**

Keep the same route and content purpose, but elevate:
- hero composition
- featured research treatment
- section spacing
- subscriber CTA clarity

- [ ] **Step 3: Redesign `ReportsPage` and `ReportSingle`**

Improve:
- filter/search bar layout
- report card rhythm
- report detail readability
- premium access messaging

- [ ] **Step 4: Redesign `LibraryPage`**

Add clearer sections:
- Continue Reading
- Saved Reports
- Recently Added
- Reading Activity
- Activation / account status panel for limited users

- [ ] **Step 5: Run build**

Run: `npm run build`
Expected: PASS

### Task 5: Redesign internal workspaces and admin access management

**Files:**
- Modify: `src/App.jsx`
- Test: `npm run build`

- [ ] **Step 1: Upgrade `PortalShell` and overview blocks**

Apply the stronger premium system to:
- portal hero
- sidebar
- workspace cards
- overview metrics

- [ ] **Step 2: Improve admin CMS structure**

Update `ManagePage` tab labels and add:

```js
{k:"subscribers",l:"Subscriber Access"}
{k:"codes",l:"Access Codes"}
```

- [ ] **Step 3: Add access-management tabs**

Implement simple admin views for:
- pending or limited users
- institutions
- codes
- seat usage

- [ ] **Step 4: Improve internal library and workflow presentation**

Tighten:
- pending review surfaces
- reports table styling
- publishing and category management surfaces

- [ ] **Step 5: Run build**

Run: `npm run build`
Expected: PASS

### Task 6: Verify, publish, and deploy

**Files:**
- Modify: `src/App.jsx`
- Modify: `docs/superpowers/plans/2026-04-27-premium-portal-redesign.md`

- [ ] **Step 1: Run final production build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 2: Review git status**

Run: `git -c safe.directory=C:/dev/chd-research-portal-v2 -C C:\\dev\\chd-research-portal-v2 status --short`
Expected: only intended redesign files are modified

- [ ] **Step 3: Commit the redesign**

Run:

```bash
git -c safe.directory=C:/dev/chd-research-portal-v2 -C C:\dev\chd-research-portal-v2 add src/App.jsx docs/superpowers/plans/2026-04-27-premium-portal-redesign.md
git -c safe.directory=C:/dev/chd-research-portal-v2 -C C:\dev\chd-research-portal-v2 commit -m "Redesign premium research portal experience"
```

- [ ] **Step 4: Push**

Run:

```bash
git -c safe.directory=C:/dev/chd-research-portal-v2 -C C:\dev\chd-research-portal-v2 push -u origin main
```

- [ ] **Step 5: Deploy**

Run:

```bash
npm run deploy
```

Expected: GitHub Pages publish completes successfully
