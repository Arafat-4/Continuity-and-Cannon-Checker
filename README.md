# Continuity & Canon Checker

An AI-powered manuscript analysis tool that extracts story facts from fiction manuscripts and uses them to build a structured canon and detect continuity issues.

## 🚀 Live Demo

**Frontend:**  
https://continuity-canon-checker.vercel.app

**Backend API:**  
https://continuity-canon-checker.onrender.com

**API Documentation:**  
https://continuity-canon-checker.onrender.com/docs

---

## ✨ Features

- 📄 PDF manuscript upload
- 📚 Automatic chapter detection
- 🤖 AI-powered fact extraction using Google Gemini
- 👤 Character extraction and normalization
- 🎭 Character relationship tracking
- 📍 Location extraction
- 🕒 Timeline and date extraction
- 👁️ Point-of-view detection
- ✍️ Narrative tense detection
- 📖 Automatic canon construction
- 🔍 Continuity checking
- ⚠️ Conflict detection
- 📝 Review generation
- 💾 Chapter analysis caching
- ⏸️ Resume processing after API quota interruptions

---

## 🧠 How It Works

```text
PDF Manuscript
      ↓
Text Extraction
      ↓
Chapter Detection
      ↓
Gemini Fact Extraction
      ↓
Chapter Fact Storage
      ↓
Canon Construction
      ↓
Continuity Checking
      ↓
Review / Conflict Detection
      ↓
Frontend Results


🏗️ Architecture
                    ┌──────────────────┐
                    │      User        │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ React + Vite     │
                    │     Vercel       │
                    └────────┬─────────┘
                             │
                          HTTPS
                             │
                             ▼
                    ┌──────────────────┐
                    │ FastAPI Backend  │
                    │     Render       │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
         PDF Parser       Gemini API      Storage
            pypdf        Fact Extraction    JSON
              │              │
              └──────────────┘
                     │
                     ▼
              Canon + Continuity


🛠️ Tech Stack
Frontend
React
Vite
CSS
JavaScript
Backend
Python
FastAPI
Pydantic
pypdf
AI
Google Gemini API
Structured JSON extraction
Deployment
GitHub
Vercel
Render


## 📌 Current Status

The MVP is currently deployed and supports:

- Manuscript upload
- Chapter detection
- AI fact extraction
- Canon construction
- Continuity analysis
- Review generation
- Live frontend and backend deployment

## 🚧 Roadmap

- Persistent cloud storage
- User authentication
- Multiple manuscript workspaces
- Database-backed storage
- Advanced continuity rules
- Improved conflict visualization
- Background processing
- Usage and quota management
- Custom domain
