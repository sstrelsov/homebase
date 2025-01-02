import { useTheme } from "@nextui-org/use-theme";
import React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

type CodeBlockProps = React.HTMLAttributes<HTMLElement> & {
  className?: string;
  children?: React.ReactNode;
};

export const CodeBlock = ({ className = "", children }: CodeBlockProps) => {
  const { theme } = useTheme();
  // Infer the language from className (e.g. "language-js")
  const language = className.replace(/language-/, "") || "text";

  // Safely handle if children is not a string
  const code = typeof children === "string" ? children.trim() : "";
  const codeTheme = theme === "dark" ? oneDark : oneDark;
  console.log("theme", theme);
  return (
    <SyntaxHighlighter
      language={language}
      style={codeTheme}
      showLineNumbers
      wrapLongLines
      customStyle={{
        background: "transparent",
        margin: 1,
        padding: 1,
        border: "none",
      }}
    >
      {code}
    </SyntaxHighlighter>
  );
};
