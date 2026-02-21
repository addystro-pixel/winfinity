# Winfinity Deployment Guide

Deploy **frontend** on Vercel and **backend** on Render.

---

## 1. Backend on Render

### Deploy

1. Go to [render.com](https://render.com) and sign up (free).
2. **New** → **Web Service**.
3. Connect your GitHub repo: `addystro-pixel/winfinity`.
4. Configure:
   - **Name:** `winfinity-api`
   - **Root Directory:** `retro-games/backend`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free
5. **Environment Variables** (add these):
   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `JWT_SECRET` | Generate a random string (e.g. run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
   | `SITE_URL` | Your Vercel frontend URL (e.g. `https://winfinity.vercel.app`) |
   | `API_BASE` | Your Render backend URL (e.g. `https://winfinity-api.onrender.com`) — add after first deploy |
   | `GMAIL_USER` | Your Gmail for verification emails |
   | `GMAIL_APP_PASSWORD` | Gmail App Password ([create one](https://myaccount.google.com/apppasswords)) |
6. Click **Create Web Service**.
7. After deploy, copy your backend URL (e.g. `https://winfinity-api.onrender.com`).
8. Add `API_BASE` with that URL, then **Manual Deploy** → **Deploy latest commit**.

---

## 2. Frontend on Vercel

### Connect backend URL

1. Open your project on [vercel.com](https://vercel.com).
2. **Settings** → **Environment Variables**.
3. Add:
   | Name | Value |
   |------|-------|
   | `VITE_API_URL` | `https://winfinity-api.onrender.com` (your Render backend URL) |
4. **Save**.
5. **Deployments** → **Redeploy** (so the new env var is used).

---

## 3. Update backend CORS (if needed)

If you see CORS errors, ensure `SITE_URL` in Render matches your Vercel URL exactly.

---

## 4. Verification Emails Not Arriving?

If users don't receive the verification email on your hosted site:

1. **Set `API_BASE`** – Must be your Render backend URL (e.g. `https://winfinity-api.onrender.com`). The verify link in the email points here. If missing, it defaults to localhost and won't work.
2. **Set `GMAIL_USER` and `GMAIL_APP_PASSWORD`** – Both must be set on Render. Use a [Gmail App Password](https://myaccount.google.com/apppasswords), not your normal password.
3. **Check spam folder** – Verification emails often land in spam.
4. **Check Render logs** – If email fails, you'll see "Email send failed" in the logs. Common causes: wrong App Password, 2FA not enabled (App Passwords require 2FA), or Gmail blocking.

---

## Notes

- **Render free tier:** Service sleeps after ~15 min of no traffic. First request after sleep can take 30–60 seconds.
- **SQLite on Render:** Data is stored on the server. On free tier, data can be lost if the service is removed or rebuilt. Use Supabase for persistent data (see `DATABASE_SETUP.md`).
- **Gmail:** Use an [App Password](https://myaccount.google.com/apppasswords), not your normal password. You need 2FA enabled on your Google account.
