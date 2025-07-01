/*
  # Add quiz settings to projects table

  1. Changes
    - Add `quiz_question_count` column to `projects` table (integer, nullable, default 5)
    - Add `quiz_difficulty` column to `projects` table (text, nullable, default 'medium')

  2. Security
    - No changes to RLS policies needed as these are just additional columns
*/

DO $$
BEGIN
  -- Add quiz_question_count column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'quiz_question_count'
  ) THEN
    ALTER TABLE projects ADD COLUMN quiz_question_count integer DEFAULT 5;
  END IF;

  -- Add quiz_difficulty column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'quiz_difficulty'
  ) THEN
    ALTER TABLE projects ADD COLUMN quiz_difficulty text DEFAULT 'medium';
  END IF;
END $$;

-- Add comment to describe the new columns
COMMENT ON COLUMN projects.quiz_question_count IS 'Number of questions for quiz generation (default: 5)';
COMMENT ON COLUMN projects.quiz_difficulty IS 'Difficulty level for quiz generation (easy, medium, hard, default: medium)';