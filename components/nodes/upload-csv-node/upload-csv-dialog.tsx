"use client";

import { useMediaQuery } from "@/hooks/use-media-query";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

import { TEXT } from "./constants";
import { UploadCsvForm } from "./upload-csv-form";

export function UploadCsvDialog({
  open,
  onOpenChangeAction,
}: {
  open: boolean;
  onOpenChangeAction: (open: boolean) => void;
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChangeAction}>
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader>
            <DialogTitle>{TEXT.title}</DialogTitle>
            <DialogDescription>{TEXT.description}</DialogDescription>
          </DialogHeader>
          <UploadCsvForm onSaveAction={() => onOpenChangeAction(false)} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChangeAction}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>{TEXT.title}</DrawerTitle>
          <DrawerDescription>{TEXT.description}</DrawerDescription>
        </DrawerHeader>
        <UploadCsvForm
          className="px-4"
          onSaveAction={() => onOpenChangeAction(false)}
        />
        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
