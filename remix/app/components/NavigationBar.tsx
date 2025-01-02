import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
} from "@nextui-org/react";
import { useLocation } from "@remix-run/react";
import NavLink from "./NavLink";

export const NavigationBar = () => {
  const location = useLocation();
  const isBlogRoute = location.pathname.includes("cafe-belle");

  if (isBlogRoute) {
    return null;
  }

  return (
    <Navbar
      isBlurred={false}
      className="fixed top-0 w-full bg-transparent z-50"
    >
      <NavbarBrand>
        {/* If you still want to wrap with your custom NavLink, that’s fine—
            but simplest is just to use <Link /> from Remix */}
        <NavLink to="/" disableEffects>
          spencer strelsov
        </NavLink>
      </NavbarBrand>
      <NavbarContent className="flex gap-4" justify="center">
        <NavbarItem>
          <NavLink to="/bio">Bio</NavLink>
        </NavbarItem>
        <NavbarItem>
          <NavLink to="/projects">Projects</NavLink>
        </NavbarItem>
      </NavbarContent>
    </Navbar>
  );
};
