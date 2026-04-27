# CHD Research Portal V2 Premium Redesign

Date: 2026-04-27
Project: `chd-research-portal-v2`
Scope: Subscriber-facing experience, internal publishing workspaces, access-control flow, and library redesign

## Goal

Redesign the existing portal into a more premium, editorial-luxury product while preserving the current CHD identity, current page set, and the practical workflow structure that already exists. The redesign should improve hierarchy, readability, navigation, information architecture, and role-based workflows without turning the portal into a different product.

The resulting experience should feel like a high-end institutional research product:

- editorial luxury
- calm and deliberate
- premium but work-safe
- CHD navy-and-gold brand retained
- Calibri retained throughout
- cleaner and more defensible workflow logic

## Product Direction

The portal should be organized as three related product zones:

1. Public and subscriber-facing zone
2. Reading and research-consumption zone
3. Internal publishing and administration zone

These zones should feel related, but the interface should make their purposes distinct.

### Public and subscriber-facing zone

This includes:

- homepage
- reports listing
- analyst profiles
- contact flow
- premium research library
- account and access state

This zone should carry the highest level of polish because subscribers and prospects are the most important external users.

### Reading and research-consumption zone

This is the premium content workspace for subscribers. It should feel more like a curated research environment than a generic file browser. It should support:

- saved content
- continue reading
- recent activity
- grouped content shelves
- account status visibility
- activation prompts for limited-access users

### Internal publishing and administration zone

This is the CMS and workflow layer for interns, analysts, directors, and administrators. It should support:

- report submission
- review and approval
- publishing
- archive control
- analyst and intern oversight
- access-code management
- subscriber and institution management

## Design Principles

The redesign should follow these principles:

1. Keep the CHD identity recognizable
2. Improve weak navigation and weak placement instead of preserving them blindly
3. Prefer clearer workflow over visual novelty
4. Use whitespace, hierarchy, and layout discipline as the primary signals of quality
5. Preserve continuity with the existing product so users are not disoriented
6. Give subscriber-facing surfaces slightly higher polish than internal tools, while keeping the internal tools equally coherent
7. Avoid flashy decoration, loud gradients, or speculative “luxury” styling that would undermine institutional trust

## Approved Structural Direction

The redesign will follow a structured premium re-architecture:

- retain the current brand and core product identity
- reorganize weak sections where the current placement does not serve usability
- elevate both subscriber and internal experiences
- borrow selected qualities from a deeper redesign without turning the product into a new brand

Selected upgrades borrowed from a deeper redesign:

- stronger product shell
- better separation between public, subscriber, and staff experiences
- a true library workspace model
- a tighter CMS model for report lifecycle management
- more refined editorial surfaces
- more purpose-built role-based portals

## Access and Membership Model

The portal should move to a staged access model.

### Account creation

Any user can create a basic account using:

- name
- company
- work email
- role
- password

This avoids forcing users to contact research before they can even enter the system.

### Access states

Users can exist in one of the following states:

- public visitor
- registered limited-access user
- individual subscriber
- institutional subscriber
- internal staff user

### Limited-access state

After basic registration, users should enter a limited-access state unless they activate a valid code.

This state should:

- allow access to selected public pages and teasers
- clearly explain that full research access requires activation
- provide visible paths to enter a code or contact the research team
- avoid feeling like an error or dead end

This is preferable to hard-blocking users after signup because it supports both:

- users who were told to contact research first
- users who discover the portal first and need guidance afterward

### Individual activation code

Individual subscriber access uses:

- one code per person
- single-use activation
- optional expiry or status tracking in admin

### Institutional master code

Institutional access uses:

- one master code issued to the client organization
- self-activation for approved users from that institution
- seat-limited entitlement
- organization-linked account upgrade on successful activation

### Internal access management requirements

The research or admin team should be able to:

- issue individual codes
- issue institutional master codes
- define seat limits for institutions
- track code usage
- revoke or expire codes
- see inactive registered users who have not yet activated

## Subscriber Experience Redesign

### Homepage

The homepage should be elevated into a more premium editorial front door.

Changes:

- calmer, more deliberate hero section
- stronger featured research presentation
- cleaner path into reports, analysts, and premium access
- better section hierarchy
- less generic web-app framing

The page should still feel recognizably CHD, not like a new media brand.

### Reports listing

The reports area should be easier to scan and trust at a glance.

Changes:

- improved filtering and sorting treatment
- stronger featured-versus-standard report separation
- clearer category, sector, and freshness signals
- tighter card hierarchy
- more polished empty and filtered states

### Premium research library

The subscriber library should become a real reading workspace instead of a simple file list.

Key modules:

- Continue Reading
- Saved Reports
- Recently Added
- Topic or category shelves
- Reading history
- Recommended or highlighted coverage

Design goals:

- improved readability
- better prioritization
- more editorial rhythm
- less utility-dashboard feeling

### Subscriber account area

The account area should show:

- current access status
- activation state
- institution relationship if applicable
- saved content
- recent reading activity

The account surface should stay lean and useful.

## Internal Publishing and Workspaces

### Shared role-based approach

Each internal role should have a purpose-built workspace:

- admin
- director
- analyst
- intern

All internal workspaces should use a cleaner structural pattern inspired by the improved admin panel:

- clear left-side navigation
- overview first
- purpose-driven sections
- better spacing and visual hierarchy
- less crowded tab behavior

### Admin workspace

Admin should function as the primary CMS and control center.

Sections should include:

- Overview
- Pending Reports
- Publishing Queue
- Reports
- File Library
- Archive
- Analysts
- Interns
- User Accounts
- Subscriber Access
- Institutional Access
- Access Codes
- Funds or price-list management
- Settings

Admin-specific goals:

- all pending reports visible in one queue
- direct approve, reject, request revision, and publish actions
- subscriber and institution control in one place
- stronger visibility into content lifecycle states

### Director workspace

The director portal should support oversight rather than raw administration.

Sections should include:

- Overview
- Team Pipeline
- Pending Approvals
- Published Reports
- Coverage Watch
- Reader Activity

Director-specific goals:

- team-level visibility
- publishing velocity awareness
- category and coverage oversight
- easy review of work in flight

### Analyst workspace

The analyst portal should support production, review, and awareness.

Sections should include:

- Overview
- My Reports
- Pending Review or Intern Approvals
- Reader Activity
- Price Lists
- Current Publishing Tasks
- Profile

Analyst-specific goals:

- easier scanning of owned work
- clearer approval obligations
- better visibility into reader interest
- less ambiguity than the current abbreviated labels

### Intern workspace

The intern portal should be simpler and narrower in scope.

Sections should include:

- Overview
- My Submissions
- Reader Activity
- Price Lists
- Revision Requests or Supervisor Notes

Intern-specific goals:

- lower cognitive load
- clearer submission status
- better visibility into required revisions
- enough structure to feel professional without clutter

## Content Lifecycle and Admin Library Model

The admin library should operate as a real publishing workflow, not only a storage interface.

Content states:

- draft
- pending review
- approved
- published
- archived

Workflow:

1. Intern or analyst submits report
2. Reviewer or analyst checks content
3. Director or admin approves where required
4. Admin or authorized user publishes
5. Report moves to live library and internal archive views

The admin library should expose:

- ownership
- status
- submission date
- revision status
- publish date
- category
- role source

## Navigation and Information Architecture

Navigation may be reorganized where the current structure is weak.

Allowed changes:

- changing section order
- grouping pages more logically
- separating subscriber and staff behaviors more clearly
- improving library and workspace navigation

Not allowed:

- changing the product so much that it stops feeling like the current portal
- introducing unnecessary novelty or complexity

## Visual System

The visual direction should be an editorial-luxury interpretation of the current CHD product.

Required attributes:

- Calibri throughout
- CHD navy and gold retained
- more whitespace
- stronger type hierarchy
- calmer surface treatment
- fewer harsh utility borders
- better card and table rhythm
- more premium forms, banners, and empty states

The design should rely on:

- spacing
- alignment
- panel structure
- restrained accent usage
- clear section sequencing

It should avoid:

- flashy gradients as primary identity
- loud decorative elements
- consumer-tech visual gimmicks
- over-cluttered dashboards

## Forms and Input Surfaces

Forms should be redesigned across the product, including:

- signup
- login
- activation
- contact research
- report submission
- admin management forms

Form goals:

- clearer grouping
- calmer field rhythm
- stronger labels and helper text
- better action hierarchy
- more premium, deliberate presentation

The signup and activation flows in particular should feel like a controlled financial-research product, not a generic app form.

## Backend and State Changes Within Current App

For the current project, the redesign should include local application-state logic changes sufficient to model the intended product behavior.

This includes:

- user access states
- activation status
- individual code flow
- institutional code flow
- seat usage simulation
- subscriber versus limited-access rendering
- content status flow for internal workspaces

These changes may remain simulated in local app state for the demo build, but the structures should make production integration straightforward later.

## Rollback and Safety

Before implementation, preserve a rollback point locally using git so the current UI can be restored if needed.

This rollback point should exist before major redesign edits begin.

## Testing and Verification

Implementation will require:

- build verification
- browser verification on desktop and mobile-sized viewports
- checks that the redesigned flows are coherent
- checks that the primary subscriber and internal interactions still work

Critical flows to verify:

- signup
- limited-access state
- individual activation
- institutional activation
- subscriber library usage
- internal report approval and publishing flow
- role-based portal navigation

## Implementation Boundaries

This redesign should improve the product significantly without overreaching into unrelated systems.

In scope:

- interface redesign
- navigation reorganization where weak
- local state and data-model improvements for access and workflow logic
- better role-based portal structure

Out of scope for this pass:

- real backend or database integration
- external authentication providers
- production-grade institution provisioning services
- replacing the CHD identity with a new brand system

## Recommendation

Proceed with implementation using this spec as the source of truth:

- premium editorial redesign
- subscriber-first polish
- stronger internal CMS and publishing flow
- staged access with individual and institutional code activation
- local rollback preserved before changes
