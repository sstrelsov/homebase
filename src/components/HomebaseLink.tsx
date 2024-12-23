import { AnchorHTMLAttributes } from "react";
import { useLinkColor } from "../utils/ColorContext";

interface HomebaseLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Tailwind text classes like "text-lg", "text-sm", etc. */
  size?: string;
}

/**
 * A normal <a> link with:
 *  - text color inherited from parent
 *  - underline color from linkColor
 *  - optional size prop (e.g. "text-lg")
 */
export default function HomebaseLink({
  size,
  className = "",
  style,
  children,
  ...props
}: HomebaseLinkProps) {
  const { linkColor } = useLinkColor();

  return (
    <a
      // Merge any custom classes with "text-inherit underline" + size
      className={`text-inherit underline ${className}`}
      // Merge any inline styles with textDecorationColor
      style={{
        textDecorationColor: linkColor,
        textDecorationLine: "underline",
        textUnderlineOffset: "0.15em",
        ...style,
      }}
      {...props}
    >
      {children}
    </a>
  );
}
