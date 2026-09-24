import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Check your .env.local file.');
}

// Capture whether this page load is accepting an invite, BEFORE createClient()
// below gets any chance to process (and clear) the URL hash. Supabase signs
// the user in automatically when they click an invite link - it does not
// prompt them to set a password on its own, that's on the app to add. This
// flag is what drives that mandatory step (see AuthContext.jsx / ProtectedRoute.jsx).
if (window.location.hash.includes('type=invite')) {
  sessionStorage.setItem('flota_needs_password', 'true');
}

export const supabase = createClient(supabaseUrl, supabaseKey);