-- Migration: create bills table (Contas a Pagar)
-- Run once in Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS bills (
  id                UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID    REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name              TEXT    NOT NULL,
  description       TEXT,
  amount            DECIMAL(12,2) NOT NULL DEFAULT 0,
  due_date          DATE    NOT NULL,
  payment_method    TEXT    DEFAULT 'Pix',
  account_id        UUID    REFERENCES accounts(id) ON DELETE SET NULL,
  pix_key           TEXT,
  category          TEXT    DEFAULT 'Outros',
  status            TEXT    DEFAULT 'pending',   -- 'pending' | 'paid'
  paid_at           TIMESTAMPTZ,
  file_url          TEXT,
  file_name         TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own bills"
  ON bills FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- Optional: Supabase Storage bucket for bill file attachments
-- Create manually in Supabase Dashboard → Storage → New bucket
--   Name: bills
--   Public: false  (or true for simpler access)
-- ────────────────────────────────────────────────────────────────────────────
