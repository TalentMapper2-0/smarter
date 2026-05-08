import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { PlusIcon } from "lucide-react";
import Link from "next/link";

export default function NavNewProjectItem() {
  return (
    <SidebarMenuItem>
      <Link href={"/c"}>
        <SidebarMenuButton className="cursor-pointer">
          <PlusIcon />
          <span>Nieuwe chat</span>
        </SidebarMenuButton>
      </Link>
    </SidebarMenuItem>
  );
}
