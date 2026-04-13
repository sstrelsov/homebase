import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
} from "@nextui-org/navbar";
import { useLocation } from "@tanstack/react-router";
import { RoutePath } from "../../config/Routes";
import NavLink from "./NavLink";

const NavigationBar = () => {
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
        <NavLink to={RoutePath.HOME} disableEffects>
          spencer strelsov
        </NavLink>
      </NavbarBrand>
      <NavbarContent className="flex gap-4" justify="center">
        <NavbarItem>
          <NavLink to={RoutePath.ABOUT}>About</NavLink>
        </NavbarItem>
        <NavbarItem>
          <NavLink to={RoutePath.PROJECTS}>Projects</NavLink>
        </NavbarItem>
      </NavbarContent>
    </Navbar>
  );
};

export default NavigationBar;
