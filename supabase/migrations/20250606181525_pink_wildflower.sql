/*
  # Create user profiles and materials tables

  1. New Tables
    - `user_profiles`
      - `id` (uuid, primary key)
      - `user_id` (text)
      - `display_name` (text)
      - `avatar` (text)
      - `education` (text)
      - `goals` (text array)
      - `custom_goal` (text, nullable)
      - `created_at` (timestamp)
    - `materials`
      - `id` (uuid, primary key)
      - `user_id` (text)
      - `name` (text)
      - `type` (text)
      - `size` (bigint)
      - `uploaded_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own data
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text UNIQUE NOT NULL,
  display_name text NOT NULL,
  avatar text NOT NULL,
  education text NOT NULL,
  goals text[] NOT NULL DEFAULT '{}',
  custom_goal text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create materials table
CREATE TABLE IF NOT EXISTS materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  size bigint NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_profiles
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own profile"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid()::text = user_id);

-- Create RLS policies for materials
CREATE POLICY "Users can view own materials"
  ON materials
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own materials"
  ON materials
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own materials"
  ON materials
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own materials"
  ON materials
  FOR DELETE
  TO authenticated
  USING (auth.uid()::text = user_id);