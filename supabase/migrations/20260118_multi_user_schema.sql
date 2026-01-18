-- Multi-User Architecture Migration
-- Creates user_stars and user_settings tables with RLS policies

-- ============================================================================
-- 1. Create user_stars table (many-to-many relationship)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_stars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    repo_id BIGINT NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
    starred_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, repo_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_stars_user_id ON user_stars(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stars_repo_id ON user_stars(repo_id);
CREATE INDEX IF NOT EXISTS idx_user_stars_starred_at ON user_stars(starred_at DESC);

-- ============================================================================
-- 2. Create user_settings table
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    github_token TEXT,
    github_username TEXT,
    preferences JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for user lookup
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- ============================================================================
-- 3. Enable Row Level Security (RLS)
-- ============================================================================
ALTER TABLE user_stars ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. RLS Policies for user_stars
-- ============================================================================

-- Users can view their own stars
CREATE POLICY "Users can view their own stars"
    ON user_stars
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own stars
CREATE POLICY "Users can insert their own stars"
    ON user_stars
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own stars
CREATE POLICY "Users can update their own stars"
    ON user_stars
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own stars
CREATE POLICY "Users can delete their own stars"
    ON user_stars
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- 5. RLS Policies for user_settings
-- ============================================================================

-- Users can view their own settings
CREATE POLICY "Users can view their own settings"
    ON user_settings
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own settings
CREATE POLICY "Users can insert their own settings"
    ON user_settings
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own settings
CREATE POLICY "Users can update their own settings"
    ON user_settings
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own settings
CREATE POLICY "Users can delete their own settings"
    ON user_settings
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- 6. Update repos table RLS (make it shared for all authenticated users)
-- ============================================================================

-- Enable RLS on repos if not already enabled
ALTER TABLE repos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Authenticated users can view repos" ON repos;
DROP POLICY IF EXISTS "Authenticated users can insert repos" ON repos;
DROP POLICY IF EXISTS "Authenticated users can update repos" ON repos;

-- All authenticated users can read repos (shared data)
CREATE POLICY "Authenticated users can view repos"
    ON repos
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- All authenticated users can insert repos (collaborative)
CREATE POLICY "Authenticated users can insert repos"
    ON repos
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- All authenticated users can update repos (collaborative translations)
CREATE POLICY "Authenticated users can update repos"
    ON repos
    FOR UPDATE
    USING (auth.role() = 'authenticated');

-- ============================================================================
-- 7. Create function to automatically update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for user_settings
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. Comments for documentation
-- ============================================================================
COMMENT ON TABLE user_stars IS 'Tracks which repositories each user has starred';
COMMENT ON TABLE user_settings IS 'Stores user-specific settings and preferences';
COMMENT ON COLUMN user_stars.starred_at IS 'When the user starred this repo on GitHub';
COMMENT ON COLUMN user_settings.preferences IS 'JSON object for storing UI preferences and other settings';
