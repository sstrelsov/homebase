import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
} from "@nextui-org/react";
import { RoutePath } from "../../config/Routes";
import NavLink from "./NavLink";

/**
 * Custom main navigation bar component for the website
 *
 * @returns a navigation bar component
 */
const NavigationBar = () => {
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
          <NavLink to={RoutePath.BIO}>Bio</NavLink>
        </NavbarItem>
        <NavbarItem>
          <NavLink to={RoutePath.PROJECTS}>Projects</NavLink>
        </NavbarItem>
      </NavbarContent>
    </Navbar>
  );
};

export default NavigationBar;
