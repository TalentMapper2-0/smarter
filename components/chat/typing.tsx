"use client";

import { useEffect, useState } from "react";

type Props = {
  text: string;
  speed?: number;
};

export function TypingMessage({ text, speed = 25 }: Props) {
  const [typingState, setTypingState] = useState({
    displayedText: "",
    sourceSpeed: speed,
    sourceText: text,
  });

  useEffect(() => {
    let index = 0;

    const interval = window.setInterval(() => {
      index += 1;
      setTypingState({
        displayedText: text.slice(0, index),
        sourceSpeed: speed,
        sourceText: text,
      });

      if (index >= text.length) {
        window.clearInterval(interval);
      }
    }, speed);

    return () => window.clearInterval(interval);
  }, [text, speed]);

  const displayedText =
    typingState.sourceText === text && typingState.sourceSpeed === speed
      ? typingState.displayedText
      : "";

  return <span>{displayedText}</span>;
}
