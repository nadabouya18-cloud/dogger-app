import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://yubbkdytsmwcuidknxkr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1YmJrZHl0c213Y3VpZGtueGtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3ODk0MDMsImV4cCI6MjA2NDM2NTQwM30.placeholder'
);
