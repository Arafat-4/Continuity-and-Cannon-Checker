# System Architecture

## Overview

Continuity & Canon Checker is an AI-powered manuscript analysis platform.

The system accepts a PDF manuscript, extracts its text, detects chapters, analyzes each chapter using Google Gemini, stores the extracted story facts, constructs a manuscript canon, and performs continuity analysis.

---

## Production Architecture

```text
                         User
                           |
                           v
                  +------------------+
                  | React + Vite     |
                  | Frontend         |
                  +--------+---------+
                           |
                           | HTTPS
                           v
                  +------------------+
                  | Vercel           |
                  | Frontend Hosting |
                  +--------+---------+
                           |
                           | API Requests
                           v
                  +------------------+
                  | FastAPI Backend  |
                  | Render           |
                  +--------+---------+
                           |
              +------------+------------+
              |                         |
              v                         v
     +------------------+      +------------------+
     | PDF Processing   |      | Google Gemini    |
     | pypdf            |      | API              |
     +--------+---------+      +--------+---------+
              |                         |
              +------------+------------+
                           |
                           v
                  +------------------+
                  | Story Facts      |
                  | Extraction       |
                  +--------+---------+
                           |
                           v
                  +------------------+
                  | Canon Builder     |
                  +--------+---------+
                           |
                           v
                  +------------------+
                  | Continuity       |
                  | Checker           |
                  +--------+---------+
                           |
                           v
                  +------------------+
                  | Reviews /        |
                  | Conflicts        |
                  +------------------+
