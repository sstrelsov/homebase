import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
} from "@nextui-org/react";
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

export default NavigationBar;
