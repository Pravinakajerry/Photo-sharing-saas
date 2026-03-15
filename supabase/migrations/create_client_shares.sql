-- ========================================
-- Migration: Create client_shares table
-- ========================================

-- Create the client_shares table
CREATE TABLE IF NOT EXISTS client_shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(client_id, user_id)
);

-- Enable RLS
ALTER TABLE client_shares ENABLE ROW LEVEL SECURITY;

-- Authenticated users can manage their own share tokens
CREATE POLICY "Users can manage their own shares"
    ON client_shares
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Anonymous users can read share tokens (needed to validate a token)
CREATE POLICY "Anyone can read shares by token"
    ON client_shares
    FOR SELECT
    USING (true);

-- ========================================
-- RLS policies for public read access via share token
-- ========================================

-- Allow public SELECT on clients if a valid share token exists
CREATE POLICY "Public can read shared clients"
    ON clients
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM client_shares
            WHERE client_shares.client_id = clients.id
        )
    );

-- Allow public SELECT on client_files if a valid share token exists
CREATE POLICY "Public can read shared client_files"
    ON client_files
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM client_shares
            WHERE client_shares.client_id = client_files.client_id
        )
    );

-- Allow public SELECT on files if linked through a shared client
CREATE POLICY "Public can read shared files"
    ON files
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM client_files
            JOIN client_shares ON client_shares.client_id = client_files.client_id
            WHERE client_files.file_id = files.id
        )
    );
