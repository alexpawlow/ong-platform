-- ============================================================
-- ONG Platform — Schema Supabase
-- Execute no SQL Editor: https://supabase.com/dashboard/project/xxtboonawnvlnzmjwqfn/sql
-- ============================================================

-- 1. Tabela de perfis (estende auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'viewer')),
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  last_login   TIMESTAMPTZ
);

-- 2. Tabela de automações
CREATE TABLE IF NOT EXISTS automations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  type             TEXT NOT NULL,
  course_id        INTEGER,
  course_name      TEXT,
  mailchimp_tag    TEXT,
  mailchimp_list_id TEXT,
  inactivity_days  INTEGER DEFAULT 7,
  active           BOOLEAN DEFAULT true,
  last_run         TIMESTAMPTZ,
  run_count        INTEGER DEFAULT 0,
  created_by       UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de configurações (Moodle, Mailchimp, etc.)
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings    ENABLE ROW LEVEL SECURITY;

-- profiles: usuários autenticados leem tudo; admin gerencia tudo
CREATE POLICY "Leitura para autenticados"   ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert para autenticados"    ON profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Update próprio ou admin"     ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
CREATE POLICY "Delete apenas admin"         ON profiles FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- automations: qualquer autenticado faz CRUD
CREATE POLICY "CRUD automations"  ON automations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- settings: qualquer autenticado lê e escreve
CREATE POLICY "CRUD settings"     ON settings    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- Primeiro usuário admin
-- Após criar seu usuário no Supabase (Auth → Add user),
-- cole o UUID dele abaixo e execute:
-- ============================================================

-- INSERT INTO profiles (id, email, display_name, role, active)
-- VALUES ('SEU-UUID-AQUI', 'admin@suaong.org', 'Administrador', 'admin', true)
-- ON CONFLICT (id) DO UPDATE SET role = 'admin';
