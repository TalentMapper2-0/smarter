import { z } from "zod";

export const TextInputPartSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

export const FileInputPartSchema = z.object({
  type: z.literal("file"),
  fileId: z.string(),
  name: z.string(),
  mimeType: z.string(),
  size: z.number(),
});

export const FormInputPartSchema = z.object({
  type: z.literal("form"),
  stepId: z.string(),
  values: z.record(z.string(), z.unknown()),
});

export const UserInputPartSchema = z.discriminatedUnion("type", [
  TextInputPartSchema,
  FileInputPartSchema,
  FormInputPartSchema,
]);

export const UserInputSchema = z.object({
  parts: z.array(UserInputPartSchema),
});

export const ProcessTurnInputSchema = z.object({
  chatId: z.string(),
  userInput: UserInputSchema.optional(),
});