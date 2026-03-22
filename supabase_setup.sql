-- ⚡ Blinkr Supabase Setup Script 🥂🥂🥂
-- Run this in your Supabase SQL Editor to initialize the backend.

-- 1. Create the Waiting Room table for matchmaking
CREATE TABLE IF NOT EXISTS public.waiting_room (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    socket_id TEXT UNIQUE NOT NULL,
    interests TEXT[] DEFAULT '{}',
    chat_mode TEXT NOT NULL DEFAULT 'text',
    room_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create the Reports table
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id TEXT NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS (Row Level Security)
ALTER TABLE public.waiting_room ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (Allowing anon access for this prototype)
-- In a production environment, you would use more restrictive policies.
CREATE POLICY "Allow anon insert to waiting_room" ON public.waiting_room FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon select from waiting_room" ON public.waiting_room FOR SELECT USING (true);
CREATE POLICY "Allow anon delete from waiting_room" ON public.waiting_room FOR DELETE USING (true);
CREATE POLICY "Allow anon update to waiting_room" ON public.waiting_room FOR UPDATE USING (true);

CREATE POLICY "Allow anon insert to reports" ON public.reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon select from reports" ON public.reports FOR SELECT USING (true);

-- 5. Set up Realtime for the waiting_room (Optional, but good for debugging)
ALTER PUBLICATION supabase_realtime ADD TABLE waiting_room;
