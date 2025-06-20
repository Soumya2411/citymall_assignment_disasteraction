-- Migration script to update existing database for independent resources
-- Run this script to migrate from disaster-dependent to independent resources

-- Enable PostGIS extension for geospatial features (if not already enabled)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add availability_status column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resources' AND column_name = 'availability_status'
    ) THEN
        ALTER TABLE resources ADD COLUMN availability_status TEXT DEFAULT 'available';
        RAISE NOTICE 'Added availability_status column to resources table';
    ELSE
        RAISE NOTICE 'availability_status column already exists in resources table';
    END IF;
END $$;

-- Add description column if it doesn't exist (should already be there but check)
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resources' AND column_name = 'description'
    ) THEN
        ALTER TABLE resources ADD COLUMN description TEXT;
        RAISE NOTICE 'Added description column to resources table';
    ELSE
        RAISE NOTICE 'description column already exists in resources table';
    END IF;
END $$;

-- Add contact_info column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resources' AND column_name = 'contact_info'
    ) THEN
        ALTER TABLE resources ADD COLUMN contact_info TEXT;
        RAISE NOTICE 'Added contact_info column to resources table';
    ELSE
        RAISE NOTICE 'contact_info column already exists in resources table';
    END IF;
END $$;

-- Add capacity column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resources' AND column_name = 'capacity'
    ) THEN
        ALTER TABLE resources ADD COLUMN capacity INTEGER;
        RAISE NOTICE 'Added capacity column to resources table';
    ELSE
        RAISE NOTICE 'capacity column already exists in resources table';
    END IF;
END $$;

-- Remove disaster_id foreign key constraint if it exists
DO $$ 
DECLARE
    constraint_name_var TEXT;
BEGIN 
    -- Get the constraint name
    SELECT constraint_name INTO constraint_name_var
    FROM information_schema.table_constraints 
    WHERE table_name = 'resources' 
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%disaster%'
    LIMIT 1;
    
    -- Drop the constraint if it exists
    IF constraint_name_var IS NOT NULL THEN
        EXECUTE 'ALTER TABLE resources DROP CONSTRAINT ' || constraint_name_var;
        RAISE NOTICE 'Removed disaster_id foreign key constraint: %', constraint_name_var;
    ELSE
        RAISE NOTICE 'No disaster_id foreign key constraint found in resources table';
    END IF;
END $$;

-- Remove disaster_id column if it exists
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resources' AND column_name = 'disaster_id'
    ) THEN
        ALTER TABLE resources DROP COLUMN disaster_id;
        RAISE NOTICE 'Removed disaster_id column from resources table';
    ELSE
        RAISE NOTICE 'disaster_id column does not exist in resources table';
    END IF;
END $$;

-- Update any existing resources to have default availability_status
UPDATE resources 
SET availability_status = 'available' 
WHERE availability_status IS NULL;

-- Create cache table if it doesn't exist
CREATE TABLE IF NOT EXISTS cache (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Resources table is now independent of disasters.';
    RAISE NOTICE 'Next steps: Run functions.sql then sample-data.sql';
END $$;
