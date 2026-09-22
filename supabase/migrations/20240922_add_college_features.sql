-- Create new tables for college/institution features

-- College verifications table for organizer approval process
CREATE TABLE IF NOT EXISTS college_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    college_name TEXT NOT NULL,
    student_id_image_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tournament reports table for reporting spam/fake events
CREATE TABLE IF NOT EXISTS tournament_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'confirmed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tournament templates for common college formats
CREATE TABLE IF NOT EXISTS tournament_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    format TEXT NOT NULL CHECK (format IN ('solo', 'squad')),
    rules_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- College leaderboard to track college performance
CREATE TABLE IF NOT EXISTS college_leaderboard (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    college_name TEXT NOT NULL,
    points INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tournament share logs to track social sharing
CREATE TABLE IF NOT EXISTS tournament_share_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    shared_to_platform TEXT NOT NULL CHECK (shared_to_platform IN ('whatsapp', 'instagram', 'facebook', 'twitter')),
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add new columns to organizers table for institution features
ALTER TABLE organizers
ADD COLUMN IF NOT EXISTS institution_name TEXT,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add new columns to tournaments table for college features
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS scope TEXT CHECK (scope IN ('intra', 'inter')),
ADD COLUMN IF NOT EXISTS college_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS access_code TEXT,
ADD COLUMN IF NOT EXISTS institution_name TEXT,
ADD COLUMN IF NOT EXISTS is_college_only BOOLEAN DEFAULT FALSE;