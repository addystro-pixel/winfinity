# Winfinity - Online Gaming Platform

## Project Structure

```
retro-games/
├── frontend/     # React + Vite app
├── backend/      # Node.js + Express API
└── package.json  # Root scripts to run both
```

## Quick Start

From the project root:

```bash
npm start
```

This runs both the backend (port 3002) and frontend (port 5173) together.

## Run Separately

**Backend only:**
```bash
cd backend
npm install
node server.js
```

**Frontend only:**
```bash
cd frontend
npm install
npm run dev
```

## Configuration

- **Backend** (`backend/.env`): Set `GMAIL_USER` and `GMAIL_APP_PASSWORD` for verification emails.
- **Frontend** (`frontend/src/config/api.js`): In dev, API calls go to `http://localhost:3002`. For production, set `VITE_API_URL` in your build env.
