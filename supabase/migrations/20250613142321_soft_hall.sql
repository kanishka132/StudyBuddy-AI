/*
  # Add file path column to materials table

  1. Changes
    - Add `file_path` column to `materials` table to store Supabase Storage file paths
    - This enables persistent file access and preview capabilities

  2. Security
    - No changes to RLS policies needed as this is just adding a column
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'materials' AND column_name = 'file_path'
  ) THEN
    ALTER TABLE materials ADD COLUMN file_path text;
  END IF;
END $$;