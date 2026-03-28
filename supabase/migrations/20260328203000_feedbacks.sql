-- Migration: Create feedbacks table
CREATE TABLE IF NOT EXISTS public.feedbacks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name text NOT NULL,
  user_email text NOT NULL,
  message text NOT NULL,
  emoji_rating text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turn on Row Level Security
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own feedback
CREATE POLICY "Users can insert their own feedback" ON public.feedbacks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Optional: Allow users to view their own feedback, or restrict to admins
CREATE POLICY "Users can view their own feedback" ON public.feedbacks
  FOR SELECT USING (auth.uid() = user_id);
