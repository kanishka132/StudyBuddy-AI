/*
  # Create Projects Table for Learning Library

  1. New Tables
    - `projects`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text) - Project name
      - `subject` (text) - Subject category
      - `material_ids` (uuid[]) - Array of material IDs used in project
      - `actions` (text[]) - Array of selected actions (summary, quiz, flashcards)
      - `summary_content` (text, nullable) - Generated summary content
      - `quiz_id` (uuid, nullable) - Reference to generated quiz
      - `flashcards_content` (jsonb, nullable) - Generated flashcards data
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on projects table
    - Add policies for authenticated users to manage their own projects

  3. Indexes
    - Add indexes on user_id and created_at for better query performance
    - Add index on subject for filtering
*/

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  subject text NOT NULL,
  material_ids uuid[] NOT NULL DEFAULT '{}',
  actions text[] NOT NULL DEFAULT '{}',
  summary_content text,
  quiz_id uuid REFERENCES quizzes(id) ON DELETE SET NULL,
  flashcards_content jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create policies for projects
CREATE POLICY "Users can manage their own projects"
  ON projects
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
CREATE INDEX IF NOT EXISTS idx_projects_subject ON projects(subject);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER projects_updated_at_trigger
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_projects_updated_at();

-- Add priority column to todos table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'todos' AND column_name = 'priority'
  ) THEN
    ALTER TABLE todos ADD COLUMN priority text NOT NULL DEFAULT 'medium';
  END IF;
END $$;