# Kindfolks — Claude Code Project Brief

Read this entire file before making any changes. This is the source of truth for all product decisions, naming, design tokens, and org structure. Do not override anything here with your own assumptions.

---

## What this app is

Kindfolks is the single employee portal for Kind Collective. It combines all internal tools into one app. Built as a cost-saving alternative to Asana + Lattice + custom HR tools.

Live at: kc-tasks-delta.vercel.app
Repo: github.com/port-satha/kc-tasks
Stack: Next.js + Tailwind CSS + Supabase + Vercel (auto-deploy from GitHub)

### Current features (do not break)
- Task management — My Tasks, Kanban Board (inside projects only), projects
- OKR/KPI tracking — 4-level cascade, approval flow, check-ins, reflections
- Team directory — profile cards, org chart
- Member profiles — onboarding gate, avatar colors, squad/team assignment

### Roadmap features (coming)
- Leave & absence management (owned by First — People Team)
- Notifications & approval routing (owned by Noon — BizTech)
- Procurement/PO request flow (owned by Noon)
- Payslip/document access
- Announcement board

This app will keep growing. Build every feature in a self-contained folder under app/ and components/ so contributors can work independently without breaking each other.

---

## Collaboration model

Port is the product owner and lead developer using Claude Code.
Noon (BizTech Lead) and First (People Lead) are being onboarded as contributors.

Git workflow:
- main branch = production (auto-deploys to Vercel)
- Feature branches: feature/leave-management, feature/notifications, etc.
- Each contributor works on their own branch, submits PR, Port merges

Ownership by feature:
- Tasks + sidebar + My Tasks: Port
- OKR/KPI: Port
- Leave management: First (People logic) + Noon (BizTech)
- Notifications: Noon
- Procurement requests: Noon

After every Claude Code session: run the CLAUDE.md update prompt so the next session starts informed.

---

## Tech stack

- Framework: Next.js 14 (App Router)
- Styling: Tailwind CSS with Sandy Serenity custom tokens
- Database: Supabase (Postgres + RLS + Edge Functions)
- Auth: Supabase Auth
- Hosting: Vercel (auto-deploys from GitHub main)
- Drag and drop: @dnd-kit (TouchSensor + PointerSensor — NOT react-beautiful-dnd, NOT HTML5 drag)
- Data fetching: @tanstack/react-query with staleTime: 30_000
- Performance: removeConsole in production, virtualized lists for 50+ items

---

## Design system — Sandy Serenity tokens

These are the ONLY colors to use. Never introduce new hex values.

Page background:  #DFDDD9  (Porcelain)
Card background:  #F5F3EF  (Linen)
Surface/hover:    #EEEAE4
Divider:          #E8E5DF
Primary text:     #2C2C2A  (Charcoal)
Muted text:       #9B8C82  (Stone)
Hint text:        #B7A99D
Biscuit:          #C2B39F

Sidebar bg:       #2C2C2A
Sidebar hover:    #3A3A37
Sidebar muted:    #9F9A8C

onest brand:      text #2D5016, bg rgba(45,80,22,0.08), border rgba(45,80,22,0.2)
grubby brand:     text #1B4D2A, bg rgba(45,122,62,0.08), border rgba(45,122,62,0.2)
KC shared:        text #5F5E5A, bg rgba(44,44,42,0.06), border rgba(0,0,0,0.1)

High priority:    text #A32D2D, bg rgba(226,75,74,0.08)
Med priority:     text #854F0B, bg rgba(186,117,23,0.08)

Overdue:          text #A32D2D (date + checkbox border)
Assigned badge:   text #185FA5, bg rgba(55,138,221,0.08)

Progress red:     #A32D2D — < 40% of quarterly milestone
Progress amber:   #BA7517 — 40–70%
Progress green:   #639922 — ≥ 70%

Avatar colors (persistent per user):
Port/Noon → #D85A30 (coral)
Amp        → #1D9E75 (teal)
Pim        → #D4537E (pink)
Sek        → #534AB7 (purple)
Jomjam     → #BA7517 (amber)
Ping       → #378ADD (blue)

Mood: warm minimalism, Kinfolk-inspired. No stark whites or clinical grays.
Typography: labels 9.5–11px uppercase tracked, card titles 12.5–13px, primary values 15–18px medium.

---

## Naming rules — apply globally, never revert

Use this          | Never use this
Chapter           | Tribe
Brand (in UI)     | Squad
KC                | Backbone (as brand name)
onest             | OnEst, Onest, ONEST
grubby            | Grubby, GRUBBY
Add task          | New task
My Tasks          | My tasks (capitalize both words)

---

## Brand context

Parent company: Kind Collective (KC)
Internal team name: Kindfolks
Active product brands: onest (PO: Pim), grubby (PO: Sek)
Shared services brand: KC (PO: Noon) — not a consumer brand, style as neutral grey "KC · Shared"

---

## Chapters (5) — navigation groupings ONLY, not OKR levels

Strategy & BD    | Strategy & BD Team
Marketing        | Marketing Team, Design Team, Retail Team
Innovation       | Innovation Team, Regulatory Team
Backbone         | People Team, Business Technology Team, Accounting & Finance Team, Sourcing & Procurement Team
Factory          | Operation Team, Production Team, Stock & Warehouse Team, QMS Team

OKR hierarchy: Brand → Team → Individual. Never add a Chapter level.

---

## Roles & permissions

super_admin | Everything. Only Port.
admin       | Full edit. Cannot change brand_owners/team_leads.
people      | Read-all OKRs + manage period locks + CSV exports. First, Nut.
manager     | Approve direct reports' individual OKRs.
member      | Write own individual OKRs only.
brand_owner | Write Brand-level OKRs/KPIs for one brand.
team_lead   | Write Team-level OKRs/KPIs for one team.

---

## Sidebar — 3 zones (CURRENT DESIGN — do not revert to old layout)

### Zone 1: Main nav (top)
Items in order:
1. My Tasks — grid icon. Blue badge showing unacknowledged assigned task count (only when > 0)
2. Team — person icon
3. OKRs & KPIs — clock icon. Amber badge showing pending check-in count (only when > 0)

Board is intentionally removed from top nav. Board lives inside individual project pages only.

### Zone 2: Projects (middle)
- Section label "PROJECTS" + "+" icon
- Each project: 6px colored dot (onest=#2D5016, grubby=#1B4D2A, KC=#5F5E5A) + project name
- Projects scoped to user's brand — non-admin sees only their brand's projects
- Lock icon SVG on restricted projects

### Zone 3: Bottom (pinned with margin-top: auto)
- Admin health alert (admin only): amber warning if incomplete profiles > 0 — clickable, goes to org chart
- Settings item (admin only): "Settings" label + chevron, goes to /settings containing Roles, Org chart, Edit requests, Snapshots, Export
- User profile row: avatar (28px) + "Nickname Position" + "Squad · Role" + three-dot menu → Edit profile, Sign out

---

## My Tasks — unified view (CURRENT DESIGN)

### Critical rule: NEVER touch existing user custom sections
Users have created their own sections (e.g. "Most Important Lists", "Monday", "Tuesday"). These must remain exactly as-is. New virtual sections layer ON TOP. Zero changes to existing section/task data.

### Database addition (additive only)
Column: tasks.is_acknowledged boolean DEFAULT true
- Existing tasks: all default true (no disruption)
- New tasks assigned by someone else (created_by ≠ assignee_id): is_acknowledged = false on creation
- Mark acknowledged: batch update when user opens My Tasks and scrolls past Recently assigned section

### Filter bar (single row — replaces old multi-row STATUS/PRIORITY/ASSIGNEE rows)
Source pills: [All ✓] [+ Created by me] [→ Assigned to me  N]
Status pills: [Active ✓] [All] [Done]
Right side: [Filter ▾] [Group: by date ▾]

### Section order in My Tasks (top to bottom)
1. Overdue — VIRTUAL, computed (due_date < today AND status ≠ done). Red header. Checkbox border red. Date text red+bold. Never stored in DB.
2. Recently assigned — VIRTUAL, computed (assignee_id = me AND created_by ≠ me AND is_acknowledged = false). Blue header. Each row shows "Assigned by {nickname}" blue badge above task title. Subtasks also surface here with parent breadcrumb label above title — THIS FIXES THE SUBTASK NOT APPEARING BUG.
3. User's custom sections — NEVER TOUCH. Exactly as stored, in exact order.
4. Unsectioned tasks — flat list at bottom if any.

### Row structure (36–40px, mobile 52px min)
Desktop: checkbox | brand chip (optional) | task title | due date (right) | priority chip (right, only if set) | assignee "Nickname Position" (right)
Mobile: checkbox | stacked (brand chip + title + date · assignee) | priority chip (right, only if set)

### Stats line in page header
"14 active · 2 overdue · 3 newly assigned"
Only show "newly assigned" segment when count > 0.

---

## Drag and drop — CRITICAL

Use @dnd-kit with both PointerSensor and TouchSensor.
Do NOT use react-beautiful-dnd (broken on iOS) or HTML5 native drag (broken on touch).

Touch config:
useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })

Drag handles:
- 6-dot SVG icon on left of every task row
- Desktop: visible on hover only
- Mobile: always visible
- Minimum 24x24px touch target

Optimistic updates (CRITICAL for performance):
1. Update UI state immediately on drop
2. Fire Supabase update in background (do not await for UI)
3. Revert + show toast only on error
4. Never refetch entire task list after reorder

Order storage: tasks.order_index float. Insert between two items: (prev + next) / 2. Normalize when precision gets too close.

---

## Performance rules

- removeConsole in next.config.js for production builds
- All Supabase reads via useQuery with staleTime: 30_000
- Single batched query per view — use .select('*, subtasks(*), assignee:profiles(*)') not N+1 calls
- Virtualize lists with @tanstack/react-virtual when > 50 items
- Skeleton loaders, not spinners
- Code-split: OKR route, Team route, Settings — load lazily with next/dynamic
- Drag reorder must feel instant (< 50ms visual feedback)

---

## OKR system — what has been built (do not rebuild or undo)

[All items from previous CLAUDE.md marked ✓ — preserved verbatim]
- Global rename: Tribe → Chapter, Backbone brand → KC ✓
- Sandy Serenity design tokens ✓
- Navigation pill bar with Teams dropdown ✓
- Context bar ✓
- KPI cards with quarterly milestone rows ✓
- Member transparency ✓
- OKR creation form 3-step flow ✓
- Line of sight preview ✓
- Approval flow status pills ✓
- Weekly check-in drawer with confidence 1–5 + sparkline ✓
- First-time onboarding empty state ✓
- Cascade tree visualizer ✓
- Team directory grouped by Chapter ✓
- Profile completion gate ✓
- Role-based nav ✓
- Manager-warning banner hidden from admin/super_admin ✓
- Footer team presence strip hidden from non-admin ✓
- Zero objectives subtitle replaced with context ✓
- Empty quarterly milestone cells hidden ✓
- Objective type taxonomy: Standard/Committed/Aspirational ✓
- Owner name uses profile.nickname everywhere ✓
- Compound KR schema + display + form + check-in ✓
- Chapter/team filter ✓
- Position titles set in DB ✓
- Owner nicknames set in DB ✓
- KPI quarterly milestones set for all 4 onest KPIs ✓
- Full onest 2026 brand OKRs: 6 objectives, 15 KRs ✓
- OKR section label Annual/quarterly logic ✓

---

## OKR — next to build

- grubby 2026 brand OKRs
- KC Shared 2026 brand OKRs
- Owner load tracker (visual warning at 3+ KRs)
- Period locks + snapshots + retroactive edit flow (Phase 5)
- People team CSV export (Phase 5)

---

## Tasks system — what has been built (do not rebuild or undo)

- My Tasks unified view: source filter (All/Created by me/Assigned to me), is_acknowledged column, Recently assigned virtual section ✓
- Overdue visual treatment: red left stripe on card (border-l-[3px] border-l-[#A32D2D] on per-row card wrapper), red checkbox border, red bold date, section overdue count badges, ⚠ Overdue filter pill in toolbar — tasks stay in original sections, no displacement ✓
- Green "Today" text for tasks due today ✓
- Filter bar: single row, source pills left, status pills middle, Overdue+Filter+Group right, flex spacer + divider separating left and right groups ✓
- Per-row card structure: each SortableTaskRow is its own card (rounded-xl, overdue → rounded-r-xl square left edge) — section container is a plain flex-col gap-[2px], no overflow-hidden ✓

---

## Tasks system — next to build

- Mobile drag and drop via @dnd-kit TouchSensor
- Sidebar 3-zone redesign (Board removed, Settings at bottom)
- Optimistic reorder (fix the "forever to load" drag bug)
- DB indexes for performance

---

## Things to NEVER do

- Never use "Tribe" — renamed to "Chapter"
- Never use "Backbone" as a brand — renamed to "KC"
- Never calculate OKR progress % against annual target — always quarterly milestone
- Never show full pill bar to member/team_lead roles
- Never show empty "—" quarterly milestone cells — hide the row
- Never display raw name strings as owner names — use nickname field
- Never add a Chapter-level OKR — hierarchy is Brand → Team → Individual only
- Never rewrite data models without an explicit migration
- Never introduce colors outside Sandy Serenity tokens
- Never break the existing tasks/kanban system when editing OKR files
- Never touch users' existing custom sections in My Tasks
- Never use react-beautiful-dnd or HTML5 drag — use @dnd-kit only
- Never show Board as a top-level sidebar nav item — Board is inside project pages only

---

## Git workflow

Working branch: main (auto-deploys to Vercel)
After each chunk: git add -A && git commit -m "feat: description" && git push

---

## How to use this file

1. Read this file completely before making any changes
2. Check "what has been built" — don't rebuild existing work
3. Check "Things to NEVER do" — avoid regressions
4. After completing work, remind Port to run the CLAUDE.md update prompt
