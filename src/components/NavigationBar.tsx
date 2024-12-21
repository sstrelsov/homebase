import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
} from "@nextui-org/react";
import { Link as RouterLink, useLocation } from "react-router-dom";

const NavigationBar = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  return (
    <Navbar>
      <NavbarBrand>
        <RouterLink to="/">spencer strelsov</RouterLink>
      </NavbarBrand>
      <NavbarContent className="hidden sm:flex gap-4" justify="center">
        <NavbarItem>
          <RouterLink
            to="/bio"
            className={isActive("/bio") ? "font-bold" : "text-inherit"}
          >
            Bio
          </RouterLink>
        </NavbarItem>
        <NavbarItem>
          <RouterLink
            to="/projects"
            className={isActive("/projects") ? "font-bold" : "text-inherit"}
          >
            Projects
          </RouterLink>
        </NavbarItem>
      </NavbarContent>
    </Navbar>
  );
};

export default NavigationBar;
