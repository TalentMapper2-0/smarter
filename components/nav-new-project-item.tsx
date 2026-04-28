"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { trpc } from "@/trpc/client/client";
import { LoaderCircle, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NavNewProjectItem() {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");

  const utils = trpc.useUtils();

  const createWorkspace = trpc.workspaces.create.useMutation({
    onSuccess: (data) => {
      setDialogOpen(false);
      setTitle("");
      utils.workspaces.listRecent.invalidate();
      router.push(`/projects/${data.id}`);
    },
  });

  const handleCreate = () => {
    if (!title.trim()) return;
    createWorkspace.mutate({ title: title.trim() });
  };

  return (
    <SidebarMenuItem>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <SidebarMenuButton className="cursor-pointer">
            <PlusIcon />
            <span>Nieuw project</span>
          </SidebarMenuButton>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Maak nieuw project</DialogTitle>
            <DialogDescription>
              Geef je project een naam om te beginnen.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="project-title">Project naam</Label>
            <Input
              id="project-title"
              placeholder="e.g. Design Engineering"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreate();
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              onClick={handleCreate}
              disabled={!title.trim() || createWorkspace.isPending}
            >
              {createWorkspace.isPending && (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              )}
              Aanmaken
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarMenuItem>
  );
}
