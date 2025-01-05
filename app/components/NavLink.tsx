import { Link as RemixLink, useLocation } from "@remix-run/react";
import { useState } from "react";
import { selectLinkColor } from "~/store/colorSlice";
import { useAppSelector } from "~/store/hooks";

interface NavLinkProps {
  to: string;
  disableEffects?: boolean;
  children: React.ReactNode;
}

/**
 * Custom link component that changes underline color when active
 *
 * @param to the path to navigate to
 * @param disableEffects to have no underline or color effect
 * @param children the content of the link
 * @param props additional props to pass to the link
 */
const NavLink = ({
  to,
  children,
  disableEffects,
  ...props
}: NavLinkProps & React.HTMLProps<HTMLAnchorElement>) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  const linkColor = useAppSelector(selectLinkColor);
  const [hovering, setHovering] = useState(false);
  return (
    <RemixLink
      {...props}
      to={to}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={
        (isActive || hovering) && !disableEffects ? "underline" : "text-inherit"
      }
      style={
        (isActive || hovering) && !disableEffects
          ? {
              textDecorationColor: linkColor,
              textUnderlineOffset: "3px",
            }
          : undefined
      }
    >
      {children}
    </RemixLink>
  );
};

export default NavLink;
