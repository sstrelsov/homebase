import { Link } from "@tanstack/react-router";
import { useLinkColor } from "../../utils/ColorContext";

interface NavLinkProps {
  to: string;
  disableEffects?: boolean;
  children: React.ReactNode;
}

const NavLink = ({ to, children, disableEffects }: NavLinkProps) => {
  const { linkColor } = useLinkColor();
  return (
    <Link
      to={to}
      activeProps={
        disableEffects
          ? undefined
          : {
              className: "underline",
              style: {
                textDecorationColor: linkColor,
                textUnderlineOffset: "3px",
              },
            }
      }
      inactiveProps={disableEffects ? undefined : { className: "text-inherit" }}
      activeOptions={{ exact: to === "/" }}
    >
      {children}
    </Link>
  );
};

export default NavLink;
