-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- Replace YOUR_PROJECT with your Supabase project ref

CREATE TABLE IF NOT EXISTS signups (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  number TEXT NOT NULL,
  number_hash TEXT,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified INTEGER DEFAULT 0,
  verification_token TEXT,
  token_expires TEXT,
  password_hash TEXT,
  last_active TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_signups_email ON signups(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_signups_date ON signups(date);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES signups(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type TEXT DEFAULT 'text',
  attachment_path TEXT,
  sender_type TEXT DEFAULT 'user',
  status TEXT DEFAULT 'delivered'
);

CREATE TABLE IF NOT EXISTS feed_posts (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  image_url TEXT,
  video_url TEXT
);

CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  role TEXT DEFAULT 'super',
  permissions TEXT,
  created_by INTEGER REFERENCES admins(id)
);

CREATE TABLE IF NOT EXISTS admin_friends (
  admin_id INTEGER NOT NULL REFERENCES admins(id),
  friend_admin_id INTEGER NOT NULL REFERENCES admins(id),
  PRIMARY KEY (admin_id, friend_admin_id),
  CHECK (admin_id != friend_admin_id)
);

CREATE TABLE IF NOT EXISTS friends (
  user_id INTEGER NOT NULL REFERENCES signups(id),
  friend_id INTEGER NOT NULL REFERENCES signups(id),
  PRIMARY KEY (user_id, friend_id),
  CHECK (user_id != friend_id)
);

CREATE TABLE IF NOT EXISTS friend_requests (
  id SERIAL PRIMARY KEY,
  requester_id INTEGER NOT NULL REFERENCES signups(id),
  recipient_id INTEGER NOT NULL REFERENCES signups(id),
  status TEXT DEFAULT 'pending',
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(requester_id, recipient_id),
  CHECK (requester_id != recipient_id)
);

CREATE TABLE IF NOT EXISTS direct_messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER NOT NULL REFERENCES signups(id),
  recipient_id INTEGER NOT NULL REFERENCES signups(id),
  message TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type TEXT DEFAULT 'text',
  attachment_path TEXT,
  status TEXT DEFAULT 'sent'
);

CREATE TABLE IF NOT EXISTS games (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  link TEXT,
  logo_path TEXT,
  sort_order INTEGER DEFAULT 0
);

-- Seed default feed (run once when table is empty)
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM feed_posts) = 0 THEN
    INSERT INTO feed_posts (title, content, date) VALUES
      ('Welcome to Winfinity!', 'Your ultimate online gaming destination. Play, compete, and win!', NOW()),
      ('$5 Freeplay', 'Verify your email to claim your $5 freeplay bonus. Follow us on Facebook or Instagram!', NOW()),
      ('New Games Coming', 'Stay tuned for exciting new games. Follow us for updates!', NOW());
  END IF;
END $$;

-- Seed default games (run once when table is empty)
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM games) = 0 THEN
    INSERT INTO games (name, link, sort_order) VALUES
      ('Juwa Online', 'https://dl.juwa777.com/', 0),
      ('Game Vault', 'https://download.gamevault999.com/', 1),
      ('Milkyway', 'https://milkywayapp.xyz/', 2),
      ('Cash Frenzy', 'https://www.cashfrenzy777.com/', 3),
      ('YOLO 777', 'https://yolo777.game/', 4),
      ('Cash Machine', 'https://www.cashmachine777.com/', 5),
      ('Gameroom', 'https://www.gameroom777.com/', 6),
      ('Riversweeps', 'https://bet777.eu/', 7),
      ('VBlink', 'https://www.vblink777.club/', 8),
      ('Panda Master', 'https://pandamaster.vip:8888/index.html', 9),
      ('Orion Stars', 'http://start.orionstars.vip:8580/index.html', 10),
      ('Fire Kirin', 'https://firekirin.com/', 11),
      ('JUWA 2.0', 'https://m.juwa2.com/', 12);
  END IF;
END $$;
