-- Migration: add notes and recurring fields to transactions
-- Run this once in your Supabase SQL Editor (https://supabase.com/dashboard)

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS recurrence_interval TEXT DEFAULT 'monthly';
