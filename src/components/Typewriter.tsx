import { useEffect, useState } from "react";
import styles from "../css/typewriter.module.css";
import { useLinkColor } from "../utils/ColorContext";

interface TypewriterProps {
  phrases: string[];
  period?: number /** Pause once a phrase is fully typed out (ms). Default 2s. */;
  typingSpeed: number /** Typing speed (ms per character). */;
  deletingSpeed: number /** Deleting speed (ms per character). */;
}

// 1) Count how many leading words match
function findWordPrefixOverlap(a: string, b: string): number {
  const aWords = a.split(/\s+/);
  const bWords = b.split(/\s+/);
  let i = 0;
  while (i < aWords.length && i < bWords.length && aWords[i] === bWords[i]) {
    i++;
  }
  return i;
}

// 2) Return the substring for the first `count` words
function substringOfWords(phrase: string, count: number): string {
  return phrase.split(/\s+/).slice(0, count).join(" ");
}

const Typewriter = ({
  phrases,
  period = 2000,
  typingSpeed,
  deletingSpeed,
}: TypewriterProps) => {
  const [text, setText] = useState(""); // the actual text displayed
  const [phase, setPhase] = useState<"typing" | "deleting" | "pause">("typing");
  const [index, setIndex] = useState(0); // which phrase in the list
  const [charIndex, setCharIndex] = useState(0); // how many characters are shown

  const cursorColor = useLinkColor();

  const currentPhrase = phrases[index % phrases.length];
  const nextPhrase = phrases[(index + 1) % phrases.length];

  // how many words do they share at the start?
  const overlapWordCount = findWordPrefixOverlap(currentPhrase, nextPhrase);

  // Convert that overlap into a character length
  const overlapSubstr = substringOfWords(currentPhrase, overlapWordCount);
  const overlapLength = overlapSubstr.length;

  useEffect(() => {
    if (phase === "typing") {
      // Move forward until we've typed all of currentPhrase
      if (charIndex < currentPhrase.length) {
        const timeoutId = setTimeout(() => {
          setCharIndex((c) => c + 1);
        }, typingSpeed);
        return () => clearTimeout(timeoutId);
      } else {
        // Done typing, pause briefly
        const pauseId = setTimeout(() => {
          setPhase("pause");
        }, period);
        return () => clearTimeout(pauseId);
      }
    } else if (phase === "pause") {
      // After pausing, switch to deleting
      setPhase("deleting");
    } else if (phase === "deleting") {
      // Delete back until we reach the overlap substring length
      if (charIndex > overlapLength) {
        const timeoutId = setTimeout(() => {
          setCharIndex((c) => c - 1);
        }, deletingSpeed);
        return () => clearTimeout(timeoutId);
      } else {
        // We’ve deleted down to the common words, so move on
        setIndex((i) => (i + 1) % phrases.length);
        setPhase("typing");
      }
    }
  }, [
    phase,
    charIndex,
    currentPhrase,
    overlapLength,
    period,
    phrases,
    typingSpeed,
    deletingSpeed,
    index,
    nextPhrase,
  ]);

  // The displayed text is the first `charIndex` characters of currentPhrase
  const display = currentPhrase.slice(0, charIndex);

  useEffect(() => {
    setText(display);
  }, [display]);

  return (
    <div>
      {text}
      <span
        className={`border-r-[2.5px] solid ml-[1.8px] ${styles.blink}`}
        style={{ borderColor: cursorColor }}
      />
    </div>
  );
};

export default Typewriter;
