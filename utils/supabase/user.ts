"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "./server";

async function logOut() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  await supabase.auth.signOut();
  redirect("/login");
}

async function signInWithAzure(origin: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data } = await supabase.auth.signInWithOAuth({
    provider: "azure",
    options: {
      redirectTo: `${origin}/auth/callback`,
      // Keep OAuth scopes minimal in SSR apps because provider tokens are stored
      // in the auth cookie and large Azure tokens can trigger 431/header-too-large.
      scopes: "openid profile email User.Read",
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (data.url) {
    redirect(data.url);
  }
}

export { logOut, signInWithAzure };
