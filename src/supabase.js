import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://yubbkdytsmwcuidknxkr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1YmJrZHl0c213Y3VpZGtueGtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMTIxNzYsImV4cCI6MjA5NTg4ODE3Nn0.IgqFEU-Z8wu875idt3j3sK8WXc-YHgf5Z5EnBfwVVfE'
);
