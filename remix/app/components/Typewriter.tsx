/* eslint-disable import/no-unresolved */
import { useEffect, useState } from "react";
import { selectLinkColor } from "~/store/colorSlice";
import { useAppSelector } from "~/store/hooks";
import styles from "../typewriter.module.css";

interface TypewriterProps {
  phrases: string[];
  period?: number;
  typingSpeed: number;
  deletingSpeed: number;
  loop?: boolean;
  preserveTrailingNewlines?: boolean;
}

function findPrefixOverlap(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) {
    i++;
  }
  return i;
}

function preserveTrailingNewlinesInOverlap(
  currentPhrase: string,
  rawOverlapLength: number
) {
  if (rawOverlapLength >= currentPhrase.length) return rawOverlapLength;
  const leftover = currentPhrase.slice(rawOverlapLength);
  if (/^[\n\s]+$/.test(leftover)) {
    return currentPhrase.length;
  }
  return rawOverlapLength;
}

const Typewriter = ({
  phrases,
  period = 2000,
  typingSpeed,
  deletingSpeed,
  loop = true,
  preserveTrailingNewlines = false,
}: TypewriterProps) => {
  const [phase, setPhase] = useState<"typing" | "deleting" | "pause">("typing");
  const [index, setIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);

  const linkColor = useAppSelector(selectLinkColor);

  // Whenever phrases changes, reset the typewriter
  useEffect(() => {
    setPhase("typing");
    setIndex(0);
    setCharIndex(0);
  }, [phrases]);

  const isLastPhrase = !loop && index === phrases.length - 1;

  const currentPhrase = phrases[index] ?? "";
  const nextPhrase = isLastPhrase ? "" : phrases[(index + 1) % phrases.length];

  let overlapLength = findPrefixOverlap(currentPhrase, nextPhrase);
  if (preserveTrailingNewlines) {
    overlapLength = preserveTrailingNewlinesInOverlap(
      currentPhrase,
      overlapLength
    );
  }

  useEffect(() => {
    if (phase === "typing") {
      if (charIndex < currentPhrase.length) {
        // Slow down for newlines / periods
        const nextChar = currentPhrase[charIndex];
        let currentTypingSpeed = typingSpeed;
        if (nextChar === "." || nextChar === "\n") {
          currentTypingSpeed *= 2;
        }

        const timeoutId = setTimeout(() => {
          setCharIndex((c) => c + 1);
        }, currentTypingSpeed);
        return () => clearTimeout(timeoutId);
      } else {
        // Done typing; pause
        const pauseId = setTimeout(() => {
          setPhase("pause");
        }, period);
        return () => clearTimeout(pauseId);
      }
    } else if (phase === "pause") {
      if (isLastPhrase) return;
      setPhase("deleting");
    } else if (phase === "deleting") {
      if (charIndex > overlapLength) {
        // Slow down for newlines / periods
        const prevChar = currentPhrase[charIndex - 1];
        let currentDeletingSpeed = deletingSpeed;
        if (prevChar === "." || prevChar === "\n") {
          currentDeletingSpeed *= 2;
        }

        const timeoutId = setTimeout(() => {
          setCharIndex((c) => c - 1);
        }, currentDeletingSpeed);
        return () => clearTimeout(timeoutId);
      } else {
        // If looping, move on; otherwise just end
        setIndex((i) => (loop ? (i + 1) % phrases.length : i + 1));
        setPhase("typing");
      }
    }
  }, [
    phase,
    charIndex,
    currentPhrase,
    overlapLength,
    period,
    typingSpeed,
    deletingSpeed,
    index,
    nextPhrase,
    isLastPhrase,
    loop,
    phrases.length,
  ]);

  const display = currentPhrase.slice(0, charIndex);

  function renderWithLineBreaks(text: string) {
    return text.split("\n").map((segment, i, arr) => (
      <span key={i}>
        {segment}
        {i < arr.length - 1 && <br />}
      </span>
    ));
  }

  return (
    <div>
      {renderWithLineBreaks(display)}
      <span
        className={`border-r-[2.5px] solid ml-[1.8px] ${styles.blink}`}
        style={{ borderColor: linkColor }}
      />
    </div>
  );
};

export default Typewriter;
