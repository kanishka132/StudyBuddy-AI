/*
  # Add subject column to materials table

  1. Changes
    - Add `subject` column to `materials` table with default value 'untagged'
    - Update existing materials to have 'untagged' subject

  2. Security
    - No changes to RLS policies needed
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'materials' AND column_name = 'subject'
  ) THEN
    ALTER TABLE materials ADD COLUMN subject text DEFAULT 'untagged';
  END IF;
END $$;