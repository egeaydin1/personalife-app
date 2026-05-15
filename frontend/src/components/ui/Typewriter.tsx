import { useState, useEffect } from "react";

interface TypewriterProps { text: string; speed?: number; onDone?: () => void; startDelay?: number; }

export function Typewriter({ text, speed = 22, onDone, startDelay = 0 }: TypewriterProps) {
  const [shown, setShown] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setShown(""); setDone(false);
    let i = 0; let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      i++;
      setShown(text.slice(0, i));
      if (i < text.length) {
        setTimeout(tick, speed + Math.random() * 16);
      } else {
        setDone(true);
        onDone?.();
      }
    };
    const t = setTimeout(tick, startDelay);
    return () => { cancelled = true; clearTimeout(t); };
  }, [text]);

  return (
    <span className="typewriter">
      {shown}
      {!done && <span className="cursor-blink" />}
    </span>
  );
}
