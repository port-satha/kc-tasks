# KC Tasks — Kind Collective Task Manager

A personal + team task manager for Kind Collective (onest, grubby, KC).

## Features
- Kanban + List view
- Brand filter: onest / grubby / Kind Collective
- Priority, assignee, due date, status per task
- AI Assist per task (break it down / spot risks / draft message)
- Persistent local storage

## Deploy to Vercel (10 minutes)

### Step 1 — Install Node.js
Go to https://nodejs.org and download the LTS version. Install it.

### Step 2 — Install dependencies & test locally
```bash
cd kc-tasks
npm install
cp .env.local.example .env.local
# Edit .env.local and paste your Anthropic API key
npm run dev
# Open http://localhost:3000
```

### Step 3 — Push to GitHub
1. Go to https://github.com → New repository → name it `kc-tasks` → Create
2. Run:
```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/kc-tasks.git
git push -u origin main
```

### Step 4 — Deploy on Vercel
1. Go to https://vercel.com → Sign up with GitHub
2. Click "Add New Project" → Import `kc-tasks` repo
3. In "Environment Variables" add:
   - Key: `ANTHROPIC_API_KEY`
   - Value: your Anthropic API key (from https://console.anthropic.com)
4. Click Deploy

Your app is live at `kc-tasks.vercel.app` (or similar)!

## Getting your Anthropic API Key
1. Go to https://console.anthropic.com
2. Sign in / create account
3. Go to API Keys → Create Key
4. Copy the key — paste it into Vercel environment variables
