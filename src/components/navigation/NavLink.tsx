import { Link as RouterLink, useLocation } from "react-router-dom";
import { useLinkColor } from "../../utils/ColorContext";

interface NavLinkProps {
  to: string;
  children: React.ReactNode;
}

/**
 * Custom link component that changes underline color when active
 *
 * @param to the path to navigate to
 * @param children the content of the link
 * @param props additional props to pass to the link
 * @returns
 */
const NavLink = ({
  to,
  children,
  ...props
}: NavLinkProps & React.HTMLProps<HTMLAnchorElement>) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  const activeColor = useLinkColor();

  return (
    <RouterLink
      {...props}
      to={to}
      className={isActive ? "underline" : "text-inherit"}
      style={
        isActive
          ? {
              textDecorationColor: activeColor,
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
