/*
  # Create Progress Table for Quiz Attempts

  1. New Tables
    - `progress`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `project_id` (uuid, foreign key to projects)
      - `quiz_id` (uuid, foreign key to quizzes)
      - `attempt` (integer) - Attempt number for this user/project/quiz combination
      - `answers` (jsonb) - User's answers for each question
      - `score` (integer) - Final score achieved
      - `total_questions` (integer) - Total number of questions in the quiz
      - `started_at` (timestamp) - When the quiz attempt was started
      - `completed_at` (timestamp, nullable) - When the quiz attempt was completed

  2. Security
    - Enable RLS on progress table
    - Add policies for authenticated users to manage their own progress records

  3. Indexes
    - Add indexes on user_id, project_id, quiz_id for better query performance
    - Add index on started_at for chronological ordering
    - Add composite index on user_id, project_id, quiz_id for attempt counting

  4. Constraints
    - Ensure attempt numbers are positive
    - Ensure score is not negative and not greater than total_questions
*/

-- Create progress table
CREATE TABLE IF NOT EXISTS progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  quiz_id uuid REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
  attempt integer NOT NULL DEFAULT 1,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  score integer DEFAULT 0,
  total_questions integer DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- Enable Row Level Security
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;

-- Create policies for progress
CREATE POLICY "Users can manage their own progress"
  ON progress
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_progress_user_id ON progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_project_id ON progress(project_id);
CREATE INDEX IF NOT EXISTS idx_progress_quiz_id ON progress(quiz_id);
CREATE INDEX IF NOT EXISTS idx_progress_started_at ON progress(started_at);
CREATE INDEX IF NOT EXISTS idx_progress_completed_at ON progress(completed_at);

-- Composite index for efficient attempt counting and retrieval
CREATE INDEX IF NOT EXISTS idx_progress_user_project_quiz ON progress(user_id, project_id, quiz_id);

-- Add constraints
ALTER TABLE progress ADD CONSTRAINT check_attempt_positive CHECK (attempt > 0);
ALTER TABLE progress ADD CONSTRAINT check_score_valid CHECK (score >= 0);
ALTER TABLE progress ADD CONSTRAINT check_total_questions_positive CHECK (total_questions >= 0);

-- Create function to automatically set attempt number
CREATE OR REPLACE FUNCTION set_progress_attempt_number()
RETURNS TRIGGER AS $$
BEGIN
  -- If attempt is not explicitly set, calculate the next attempt number
  IF NEW.attempt IS NULL OR NEW.attempt = 1 THEN
    SELECT COALESCE(MAX(attempt), 0) + 1
    INTO NEW.attempt
    FROM progress
    WHERE user_id = NEW.user_id 
      AND project_id = NEW.project_id 
      AND quiz_id = NEW.quiz_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set attempt number
CREATE TRIGGER progress_set_attempt_trigger
  BEFORE INSERT ON progress
  FOR EACH ROW
  EXECUTE FUNCTION set_progress_attempt_number();

-- Add comments for documentation
COMMENT ON TABLE progress IS 'Tracks quiz attempts and user progress';
COMMENT ON COLUMN progress.attempt IS 'Sequential attempt number for this user/project/quiz combination';
COMMENT ON COLUMN progress.answers IS 'JSON array storing user answers for each question';
COMMENT ON COLUMN progress.score IS 'Number of correct answers achieved';
COMMENT ON COLUMN progress.total_questions IS 'Total number of questions in the quiz';
COMMENT ON COLUMN progress.started_at IS 'Timestamp when the quiz attempt was started';
COMMENT ON COLUMN progress.completed_at IS 'Timestamp when the quiz attempt was completed (null if in progress)';