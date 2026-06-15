
export const messages = {
  initialized:
    "Hey! Laten we beginnen. Ik ga je helpen om je door het proces van sourcing te leiden.",
    
} as const;

export type MessageKey = keyof typeof messages;
