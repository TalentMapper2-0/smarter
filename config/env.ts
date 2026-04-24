import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
});

export const parsedEnv = envSchema.parse(process.env);
