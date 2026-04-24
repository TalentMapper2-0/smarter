import "server-only";

import { parsedEnv } from "@/config/env";
import { createClient } from "@supabase/supabase-js";

export const createAdminClient = () =>
  createClient(
    parsedEnv.NEXT_PUBLIC_SUPABASE_URL,
    parsedEnv.SUPABASE_SERVICE_ROLE_KEY
  );
