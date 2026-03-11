-- Migration 003: Add file attachment support to transactions table
-- Run this in your Supabase SQL Editor

-- Add file columns to transactions table
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS file_url  TEXT,
  ADD COLUMN IF NOT EXISTS file_name TEXT;

-- ---------------------------------------------------------------
-- Supabase Storage: create the 'attachments' public bucket
-- ---------------------------------------------------------------
-- Run the following in your Supabase dashboard (Storage section)
-- OR via the Supabase JS client / CLI:
--
--   1. Go to Storage > New bucket
--   2. Name: attachments
--   3. Public bucket: YES (enables permanent public URLs)
--
-- Storage RLS policies (run in SQL Editor):

-- Allow authenticated users to upload their own files
INSERT INTO storage.policies (name, bucket_id, operation, definition)
VALUES (
  'Users can upload attachments',
  'attachments',
  'INSERT',
  '(auth.uid() IS NOT NULL)'
)
ON CONFLICT DO NOTHING;

-- Allow public read access (so stored URLs remain accessible)
INSERT INTO storage.policies (name, bucket_id, operation, definition)
VALUES (
  'Public read attachments',
  'attachments',
  'SELECT',
  'TRUE'
)
ON CONFLICT DO NOTHING;

-- Allow users to update/delete their own files
INSERT INTO storage.policies (name, bucket_id, operation, definition)
VALUES (
  'Users can delete own attachments',
  'attachments',
  'DELETE',
  '(auth.uid() IS NOT NULL)'
)
ON CONFLICT DO NOTHING;
