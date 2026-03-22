-- 🔧 Fix Blinkr Schema (Run this in Supabase SQL Editor) 🥂🥂🥂

-- Add missing columns to the waiting_room table if they don't exist
ALTER TABLE public.waiting_room 
ADD COLUMN IF NOT EXISTS room_id TEXT,
ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS chat_mode TEXT DEFAULT 'text';

-- Ensure RLS is enabled and policies exist
ALTER TABLE public.waiting_room ENABLE ROW LEVEL SECURITY;

-- Re-create policies just in case
DROP POLICY IF EXISTS "Allow anon insert to waiting_room" ON public.waiting_room;
DROP POLICY IF EXISTS "Allow anon select from waiting_room" ON public.waiting_room;
DROP POLICY IF EXISTS "Allow anon delete from waiting_room" ON public.waiting_room;
DROP POLICY IF EXISTS "Allow anon update to waiting_room" ON public.waiting_room;

CREATE POLICY "Allow anon insert to waiting_room" ON public.waiting_room FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon select from waiting_room" ON public.waiting_room FOR SELECT USING (true);
CREATE POLICY "Allow anon delete from waiting_room" ON public.waiting_room FOR DELETE USING (true);
CREATE POLICY "Allow anon update to waiting_room" ON public.waiting_room FOR UPDATE USING (true);
