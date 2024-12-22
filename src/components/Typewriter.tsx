import { useEffect, useState } from "react";
import styles from "../css/typewriter.module.css";
import { useLinkColor } from "../utils/ColorContext";

interface TypewriterProps {
  phrases: string[];
  period?: number; // Pause once a phrase is fully typed out (ms). Default 2s.
  typingSpeed: number; // Typing speed (ms per character).
  deletingSpeed: number; // Deleting speed (ms per character).
  loop?: boolean; // If false, do NOT reset after the last phrase is typed out.
  preserveTrailingNewlines?: boolean; // If true, do not delete trailing "\n"
}

/**
 * Remove punctuation from a token IF the token is NOT just "\n".
 */
function sanitizeToken(token: string) {
  // If it's all whitespace or specifically newline(s), leave it alone
  if (token.trim() === "" || token.includes("\n")) {
    return token;
  }
  return token.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
}

/**
 * Split the phrase into tokens, capturing spaces and newlines as separate tokens.
 */
function tokenize(phrase: string): string[] {
  return phrase.split(/(\s+)/); // keep whitespace/newlines in separate tokens
}

/**
 * Find how many tokens match from the start (ignoring punctuation except for newlines).
 */
function findPrefixOverlapTokens(a: string, b: string): number {
  const aTokens = tokenize(a).map(sanitizeToken);
  const bTokens = tokenize(b).map(sanitizeToken);

  let i = 0;
  while (i < aTokens.length && i < bTokens.length) {
    if (aTokens[i] === bTokens[i]) {
      i++;
    } else {
      break;
    }
  }
  // We now have i tokens of overlap (in sanitized form).
  // We'll compute raw character length of that overlap by joining
  // the first i tokens from the *original* tokenization of `a`.
  const originalTokens = tokenize(a); // un-sanitized
  return originalTokens.slice(0, i).join("").length;
}

/**
 * If you want to preserve trailing newlines, we can expand the overlap
 * so that any leftover is purely newlines/whitespace, thus it remains visible.
 */
function preserveTrailingNewlinesInOverlap(
  currentPhrase: string,
  rawOverlapLength: number
) {
  // If we've already overlapped the entire phrase, nothing to do
  if (rawOverlapLength >= currentPhrase.length) return rawOverlapLength;

  // Grab everything after the raw overlap
  const leftover = currentPhrase.slice(rawOverlapLength);

  // If leftover is purely whitespace+newlines, keep it all
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

  const cursorColor = useLinkColor();

  const isLastPhrase = !loop && index === phrases.length - 1;

  // Current phrase & next phrase
  const currentPhrase = phrases[index];
  const nextPhrase = isLastPhrase ? "" : phrases[(index + 1) % phrases.length];

  // Figure out how many characters are shared (token overlap)
  let overlapLength = findPrefixOverlapTokens(currentPhrase, nextPhrase);

  // If preserving trailing newlines, check if leftover is purely newlines
  if (preserveTrailingNewlines) {
    overlapLength = preserveTrailingNewlinesInOverlap(
      currentPhrase,
      overlapLength
    );
  }

  useEffect(() => {
    if (phase === "typing") {
      // Still typing out the current phrase
      if (charIndex < currentPhrase.length) {
        const timeoutId = setTimeout(() => {
          setCharIndex((c) => c + 1);
        }, typingSpeed);
        return () => clearTimeout(timeoutId);
      } else {
        // Done typing; pause for period
        const pauseId = setTimeout(() => {
          setPhase("pause");
        }, period);
        return () => clearTimeout(pauseId);
      }
    } else if (phase === "pause") {
      // If it's the last phrase and we're not looping, do nothing
      if (isLastPhrase) return;
      // Otherwise, start deleting
      setPhase("deleting");
    } else if (phase === "deleting") {
      // Deleting until we hit the overlap
      if (charIndex > overlapLength) {
        const timeoutId = setTimeout(() => {
          setCharIndex((c) => c - 1);
        }, deletingSpeed);
        return () => clearTimeout(timeoutId);
      } else {
        // Done deleting; move to next phrase
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
  ]);

  // The displayed text is the first `charIndex` characters of currentPhrase
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
        style={{ borderColor: cursorColor }}
      />
    </div>
  );
};

export default Typewriter;
