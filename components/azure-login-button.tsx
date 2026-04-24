"use client";

import { Button } from "./ui/button";
import Image from "next/image";
import { useTransition } from "react";
import { LoaderCircle } from "lucide-react";
import { signInWithAzure } from "@/utils/supabase/user";

export default function AzureLoginButton() {
  const [isLoading, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(() => {
      signInWithAzure(window.location.origin);
    });
  };

  return (
    <Button
      variant={"outline"}
      disabled={isLoading}
      className="grid h-fit grid-cols-3 align-middle p-2"
      onClick={handleClick}
      // size={"default"}
    >
      <Image src="/media/microsoft.png" alt="Azure" width={24} height={24} />
      Log in met Microsoft
      {isLoading && <LoaderCircle className="h-5 w-5 animate-spin" />}
    </Button>
  );
}
