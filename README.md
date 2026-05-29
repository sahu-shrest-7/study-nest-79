# 📚 Study Hub Connect — Collaborative Study Platform

A real-time web app where students create virtual study rooms,
track study sessions, and collaborate via live chat.

## 🌐 Live Demo
**https://study-nest-79.vercel.app**

## ✨ Features
- ✅ Authentication — Email/password signup and login
- ✅ Study Room Management — Create, browse, join and leave rooms
- ✅ Session Timer — Start/stop study sessions with duration tracking
- ✅ Room Chat — Real-time messaging inside study rooms
- ✅ Real-time Updates — Live presence via Supabase Realtime
- ✅ Activity Dashboard — Personal study stats and session history
- ✅ Pomodoro Timer — 25/5 minute focus-break cycles
- ✅ Private Rooms — Join via 8-character invite codes

## 🛠 Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React, TypeScript, Tailwind CSS |
| Database | PostgreSQL via Supabase |
| Authentication | Supabase Auth |
| Real-time | Supabase Realtime |
| Deployment | Vercel |

## 🚀 Setup Instructions
1. Clone: `git clone https://github.com/sahu-shrest-7/study-nest-79`
2. Install: `npm install`
3. Copy env: `cp .env.example .env`
4. Add Supabase credentials to `.env`
5. Run SQL from `supabase/migrations/` in Supabase SQL editor
6. Start: `npm run dev`

## 🔐 Environment Variables
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```
