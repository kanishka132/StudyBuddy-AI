/*
  # Create Materials Storage Bucket

  1. Storage Setup
    - Create materials bucket for file storage
    - Configure bucket settings for security and file limits
    
  2. Security
    - Bucket is private (not publicly accessible)
    - Files organized by user ID folders
    - Users can only access their own files

  Note: Storage bucket creation and RLS policies for storage.objects
  need to be configured through Supabase Dashboard or API, not SQL migrations.
  This migration creates the necessary database structure to support file storage.
*/

-- Create a function to ensure the materials bucket exists
-- This will be called by the application when needed
CREATE OR REPLACE FUNCTION ensure_materials_bucket()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function serves as a placeholder for bucket creation
  -- The actual bucket creation should be done through Supabase Dashboard
  -- or using the Supabase client in the application
  RETURN true;
END;
$$;

-- Add file_path column to materials table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'materials' AND column_name = 'file_path'
  ) THEN
    ALTER TABLE materials ADD COLUMN file_path text;
  END IF;
END $$;

-- Create an index on file_path for better performance
CREATE INDEX IF NOT EXISTS idx_materials_file_path ON materials(file_path);

-- Update the materials table to support file storage
COMMENT ON COLUMN materials.file_path IS 'Storage path for uploaded files in Supabase Storage';