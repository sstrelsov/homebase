import { Link as RouterLink, useLocation } from "react-router-dom";
import { useLinkColor } from "../../utils/ColorContext";

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
 * @returns
 */
const NavLink = ({
  to,
  children,
  disableEffects,
  ...props
}: NavLinkProps & React.HTMLProps<HTMLAnchorElement>) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  const { linkColor } = useLinkColor();
  console.log("linkColor", linkColor);
  return (
    <RouterLink
      {...props}
      to={to}
      className={isActive && !disableEffects ? "underline" : "text-inherit"}
      style={
        isActive && !disableEffects
          ? {
              textDecorationColor: linkColor,
              textUnderlineOffset: "3px",
            }
          : undefined
      }
    >
      {children}
    </RouterLink>
  );
};

export default NavLink;
