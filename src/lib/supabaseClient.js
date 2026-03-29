// ============================================================
//  supabaseClient.js — Doctora Petite
//  Ubicación: src/lib/supabaseClient.js
// ============================================================

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = "https://xvvfuxqyokgxyufktbby.supabase.co";
const SUPABASE_ANON = "sb_publishable_jMZ-OFg-MUEUrreDAyiZRg_OrCk2olh";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);