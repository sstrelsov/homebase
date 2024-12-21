import { useEffect, useState } from "react";
import styles from "../css/typewriter.module.css";
import { useLinkColor } from "../utils/ColorContext";

interface TypewriterProps {
  /** List of phrases to cycle through */
  phrases: string[];
  /**
   * How long to pause after a phrase is fully typed out
   * before starting deletion (ms). Defaults to 2000ms.
   */
  period?: number;
}

const Typewriter = ({ phrases, period = 2000 }: TypewriterProps) => {
  const [text, setText] = useState<string>(""); // The text being typed/deleted
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [index, setIndex] = useState<number>(0); // Which phrase we’re on

  const cursorColor = useLinkColor();

  useEffect(() => {
    const fullText = phrases[index % phrases.length];
    let speed = 200 - Math.random() * 100;

    if (isDeleting) {
      speed /= 2;
    }

    if (!isDeleting && text === fullText) {
      // Done typing, pause, then start deleting
      const timer = setTimeout(() => setIsDeleting(true), period);
      return () => clearTimeout(timer);
    }

    if (isDeleting && text === "") {
      // Done deleting, move to next phrase
      setIsDeleting(false);
      setIndex((prev) => prev + 1);
      const timer = setTimeout(() => {}, 500);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setText(
        isDeleting
          ? fullText.substring(0, text.length - 1)
          : fullText.substring(0, text.length + 1)
      );
    }, speed);

    return () => clearTimeout(timer);
  }, [text, isDeleting, index, phrases, period]);

  return (
    <div className={`${styles.typewriterText} text-3xl leading-normal`}>
      {text}
      <span
        className={`border-r-[2.5px] solid ml-[1.8px] ${styles.blink}`}
        style={{ borderColor: cursorColor }}
      />
    </div>
  );
};

export default Typewriter;
