# Database Setup (Supabase PostgreSQL)

For **persistent data** on your hosted site, use Supabase instead of SQLite.

---

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up (free).
2. **New Project** → name it (e.g. `winfinity`).
3. Set a database password and save it.
4. Wait for the project to be created.

---

## 2. Run Schema

1. In Supabase dashboard: **SQL Editor** → **New query**.
2. Copy the contents of `backend/supabase-schema.sql`.
3. Paste and click **Run**.

---

## 3. Get Connection String

1. Go to **Project Settings** → **Database**.
2. Under **Connection string**, choose **URI**.
3. Copy the connection string (format: `postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres`).
4. Replace `[YOUR-PASSWORD]` with your actual database password.

---

## 4. Add to Render

1. In your Render backend service: **Environment** → **Add**.
2. **Key:** `DATABASE_URL`
3. **Value:** Your Supabase connection string (paste the full URI).
4. **Save**.
5. **Manual Deploy** → **Deploy latest commit**.

---

## 5. Create First Admin (Supabase only)

Supabase does not seed admins. Create your first admin via the Supabase SQL Editor:

1. Generate a password hash (run in terminal, replace `YOUR_PASSWORD` with your chosen password):
   ```bash
   node -e "const c=require('crypto');const s=c.randomBytes(16).toString('hex');const h=c.pbkdf2Sync('YOUR_PASSWORD',s,1000,64,'sha512').toString('hex');console.log(s+':'+h);"
   ```
2. In Supabase SQL Editor, run (replace placeholders):
   ```sql
   INSERT INTO admins (email, name, password_hash, date, role, permissions)
   VALUES (
     'your@email.com',
     'Admin',
     'PASTE_THE_HASH_FROM_STEP_1',
     NOW(),
     'super',
     '{"users":true,"chat":true,"feed":true,"games":true,"admins":true,"settings":true}'
   );
   ```

---

## 6. Supabase Storage (Uploads) – Optional

To store **uploads** (images, voice messages, feed media, game logos) in Supabase instead of local disk:

1. In Supabase: **Storage** → **New bucket** → name it `uploads` → set **Public bucket** to ON → Create.
2. Get your **Project URL** and **service_role key** from Supabase: **Project Settings** → **API**.
3. Add to Render **Environment**:
   - `SUPABASE_URL` = your Project URL (e.g. `https://xxx.supabase.co`)
   - `SUPABASE_SERVICE_KEY` = your service_role key (keep secret)
4. Redeploy.

If these are not set, uploads use local disk (and may be lost on redeploy).

---

## Notes

- **Local dev:** Without `DATABASE_URL`, the app uses SQLite in `backend/data/`.
- **Production:** With `DATABASE_URL` set on Render, the app uses Supabase PostgreSQL.
- **Data persists** across redeploys when using Supabase.
