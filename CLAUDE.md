# Kindfolks — Claude Code Project Brief

Read this entire file before making any changes. This is the source of truth
for all product decisions, naming, design tokens, and org structure.
Do not override anything here with your own assumptions.

---

## What this app is

Internal tool for Kind Collective team combining:
- **Task management** (Kanban/list view — original feature)
- **OKR/KPI tracking** (added in 2026 — the main active development area)

Built as a cost-saving alternative to Asana.
Live at: kc-tasks-delta.vercel.app
Repo: github.com/port-satha/kc-tasks

---

## Tech stack

- Framework: Next.js + Tailwind CSS
- Database: Supabase
- Hosting: Vercel (auto-deploys from GitHub)
- Repo: github.com/port-satha/kc-tasks

---

## Design system — Sandy Serenity tokens

These are the ONLY colors to use. Never introduce new hex values without
updating this file first.

```
Page background:  #DFDDD9  (Porcelain)
Card background:  #F5F3EF  (Linen)
Surface/hover:    #EEEAE4
Divider:          #E8E5DF
Primary text:     #2C2C2A  (Charcoal)
Muted text:       #9B8C82  (Stone — also written as #9F9A8C)
Hint text:        #B7A99D
Biscuit:          #C2B39F

Sidebar bg:       #2C2C2A
Sidebar hover:    #3A3A37
Sidebar muted:    #9F9A8C

onest brand:      #2D5016  (bg: #D4EDBE, light: #EAF3DE)
grubby brand:     #1B4D2A  (bg: #C8E0D0, light: #DAF0E3)
KC shared:        #5F5E5A  (bg: #E8E5DF, light: #EEECEA)
both brands:      #3C3489  (bg: #EEEDFE)

Progress red:     #A32D2D  (bg: #FCEBEB) — < 40% of quarterly milestone
Progress amber:   #BA7517  (bg: #FAEEDA) — 40–70%
Progress green:   #639922  (bg: #EAF3DE) — ≥ 70%
```

Mood: warm minimalism, Kinfolk-inspired. No stark whites or clinical grays.

---

## Brand context

- Parent company: Kind Collective (KC)
- Internal team name: Kindfolks
- Two active product brands: onest, grubby
- KC = shared services layer (not a consumer brand)

---

## Naming rules — apply globally, never revert

| Use this | Never use this |
|---|---|
| Chapter | Tribe |
| Brand (in UI labels) | Squad |
| KC | Backbone (as a brand name) |
| onest | OnEst, Onest, ONEST |
| grubby | Grubby, GRUBBY |

---

## Brands (3) — each owns OKRs and KPIs

| Brand | Purpose | Project Owner |
|---|---|---|
| onest | Premium plant-based home & personal care | Pim |
| grubby | Bio-solutions for plant & pet care | Sek |
| KC | Shared functions — People, BizTech, Finance, Procurement | Noon |

KC is NOT a consumer brand. Style it with neutral grey and label "KC · Shared".

---

## Chapters (5) — navigation groupings ONLY, not OKR levels

| Chapter | Teams within |
|---|---|
| Strategy & BD | Strategy & BD Team |
| Marketing | Marketing Team, Design Team, Retail Team |
| Innovation | Innovation Team, Regulatory Team |
| Backbone | People Team, Business Technology Team, Accounting & Finance Team, Sourcing & Procurement Team |
| Factory | Operation Team, Production Team, Stock & Warehouse Team, QMS Team |

Chapter is a UI grouping only. No Chapter-level OKRs exist.
OKR hierarchy: Brand → Team → Individual. Never add a Chapter level.

---

## OKR hierarchy

```
Brand (annual + quarterly)      — owned by brand_owner
  ↓ cascades to
Team (quarterly)                — owned by team_lead
  ↓ cascades to
Individual (quarterly, private) — owned by member, approved by manager
```

---

## Roles & permissions

| Role | Access |
|---|---|
| super_admin | Everything. Only Port. |
| admin | Full edit. Cannot add/remove members or change brand_owners/team_leads. |
| people | Read-only all OKRs + manage period locks, edit requests, CSV exports. |
| manager | Review/approve direct reports' individual OKRs. |
| member | Write own individual OKRs only. |
| brand_owner | Write Brand-level OKRs/KPIs for one brand. |
| team_lead | Write Team-level OKRs/KPIs for one team. |

---

## Navigation visibility rules — CRITICAL

Always check userRole / profile.system_role before rendering nav elements.

### Full navigation (super_admin / admin / brand_owner only)
- Full dark pill bar (Brands + Chapters)
- Sub-tabs (Company health | Brand: X | My OKRs)
- Context bar with quarter selector
- Export button
- Footer team presence strip

### Simplified navigation (team_lead / manager / member)
- Hide the full dark pill bar entirely
- Replace with a slim context line: "You're viewing [brand] · [team]"
- Hide sub-tabs — show My OKRs content directly
- Hide context bar — move quarter selector inline into the page header
- Never show the manager-warning banner to super_admin or admin
- Hide "0 objectives · 0 key results" when count = 0; show team context instead
- Remove footer team presence strip

---

## KPI cards — quarterly milestone display

- Progress % is always against the QUARTERLY milestone, not annual target
- If no quarterly milestones set: hide the cells, show only annual bar
- Never show "—" in empty milestone cells — hide the row instead
- Done quarter: green bg #EAF3DE, border #B8D98A, value shows "Xk ✓"
- Current quarter: amber bg #FAEEDA, border #F0C870
- Future quarters: default card bg, value in hint color #B7A99D

---

## Member profile schema

| Field | Set by | Required |
|---|---|---|
| nickname | Member | Yes — primary display name everywhere |
| full_name | Member | Yes |
| position_title | Member | Yes |
| start_date | Member | No |
| line_id | Member | No |
| chapter | Admin | Yes |
| team | Admin | Yes |
| brand | Admin | Yes — 'onest' / 'grubby' / 'KC' / 'both' |
| reports_to | Admin | Yes |
| system_role | Admin | Yes |
| brand_role | Admin | No |
| profile_complete | System | Computed when 3 required self fields are filled |

Display name logic everywhere:
- Primary: nickname (e.g. "Pim", "Safe", "Ellie")
- Subtitle: full_name in muted text
- Role line: position_title

Never display raw name strings like "Safe Thanyarat Content".
If no nickname set, use initials.

---

## Team members & colors (tasks system)

- Port (CEO) — coral #D85A30
- Amp (CIO) — teal #1D9E75
- Noon (Business Technology Lead) — coral #D85A30
- Pim (Brand Manager, onest) — pink #D4537E
- Ping (Design Director) — blue #378ADD
- Sek (Product Owner, grubby) — purple #534AB7
- Jomjam (Marketing, grubby) — amber #BA7517

---

## Key people reference (OKR system)

| Nickname | Role | Brand | Reports to |
|---|---|---|---|
| Port | CEO / super_admin | All | — |
| Amp | CIO | All | Port |
| Noon | BizTech Lead / KC PO | KC | Port |
| Pim | Marketing Lead / onest PO | onest | Port |
| Sek | grubby PO | grubby | Port |
| Ping | Design Director | Both | Port |
| Peem | Innovation Lead | onest | Pim |
| Sa | Innovation Lead / Factory Lead | grubby | Sek |
| Miw | Sourcing & Procurement Lead | Both | Noon |
| First | People Lead | Both | Noon |
| Jomjam | Marketing Lead | grubby | Sek |

---

## Tasks system (original feature — do not break)

- Kanban + List view toggle
- Brand filter: onest, grubby, Kind Collective
- Priority filter: High / Medium / Low
- Kanban columns: To Do → In Progress → In Review → Done
- Task fields: title, brand, priority, assignee, due date, status, notes
- AI Assist per task: Break it down, Spot risks, Draft a message
- Current owner: Port (CEO) — transitioning to Noon

---

## OKR system — what has been built (do not rebuild or undo)

- Global rename: Tribe → Chapter, Backbone brand → KC ✓
- Sandy Serenity design tokens in tailwind.config.js and globals.css ✓
- Navigation pill bar: brand pills (filter) + chapter pills (disclosure only) ✓
- Chapter sub-drawer: team pills appear below nav when chapter is clicked ✓
- Context bar: "Viewing [Brand] › [Chapter] › [Team]" ✓
- KPI cards with quarterly milestone rows ✓
- Member transparency: full read access to brand hierarchy ✓
- OKR creation form: 3-step flow with cascade picker ✓
- Line of sight preview: [brand] › [KR] › [Your OKR] ✓
- Approval flow: status pills (draft/pending/approved/changes_requested) ✓
- Weekly check-in drawer: confidence tapper 1–5 + sparkline history ✓
- First-time onboarding empty state: welcome card with 3-step guide (member role only) ✓
- Cascade tree visualizer: Brand KR → Team OKRs → Individual OKRs ✓
- Team directory: grouped by Chapter, member cards with incomplete state ✓
- Profile completion gate: non-dismissable modal on first login ✓
- Role-based nav: member/team_lead/manager see slim "You're viewing [brand] · [team]" context line; super_admin/admin/brand_owner see full dark pill bar ✓
- Manager-warning banner hidden from super_admin and admin roles ✓
- Footer team presence strip hidden from non-admin roles ✓
- Zero objectives subtitle replaced with team/quarter context for all roles ✓
- Empty quarterly milestone cells hidden instead of showing "—" ✓

---

## In progress — next to build

(Nothing currently queued — all chunks shipped.)

---

## Git situation (important)

Local branch is **kindfolks-rollout**, not main. Do NOT run git pull or
git push to origin/main mid-rollout. After each chunk of work:
  git add -A
  git commit -m "chunk N: description"
Do not push to origin until reconcile-git.sh is run at end of rollout.

---

## Things to never do

- Never use "Tribe" — renamed to "Chapter"
- Never use "Backbone" as a brand — renamed to "KC"
- Never calculate progress % against annual target — always quarterly milestone
- Never show full pill bar to member/team_lead roles
- Never show empty "—" quarterly milestone cells — hide the row
- Never display raw name strings as owner names — use nickname field
- Never add a Chapter-level OKR — hierarchy is Brand → Team → Individual only
- Never rewrite data models without an explicit migration in the prompt
- Never introduce colors outside Sandy Serenity tokens above
- Never break the existing tasks/kanban system when editing OKR files

---

## Conventions

- Always use Sandy Serenity color system
- No stark whites or clinical grays
- Mobile-friendly layouts
- Warm minimalist aesthetic
- Progress bars: 2px height, rounded, color by quarterly milestone %
- Typography: labels 9.5–11px uppercase tracked, card titles 12.5–13px,
  primary values 15–18px medium

---

## How to use this file

When Port gives you a task:
1. Read this file first
2. Check "What has been built" — don't rebuild existing work
3. Check "Things to never do" — avoid regressions
4. After completing the change, remind Port to update this file
