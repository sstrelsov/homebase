import { lazy } from "react";
import { Route } from "react-router-dom";
import ProjectsTable from "../components/table/ProjectsTable";

// Lazy load pages (optional)
const LandingPage = lazy(() => import("../pages/Landing"));
const ProjectsPage = lazy(() => import("../pages/Projects"));
const ProjectDetails = lazy(
  () => import("../pages/project-details/ProjectDetails")
);
const BioPage = lazy(() => import("../pages/Bio"));

// You can define an interface if you're using TypeScript:
export interface IRoute {
  name: string; // Display name for nav or breadcrumbs
  path: string; // The base path
  element?: React.ReactNode; // The component to render
  children?: IRoute[]; // Sub-routes
  exact?: boolean;
}

// A small helper to recursively render routes
export const renderRoutes = (routesArray: IRoute[]) => {
  return routesArray.map((route) => {
    if (route.children && route.children.length > 0) {
      return (
        <Route key={route.path} path={route.path} element={route.element}>
          {renderRoutes(route.children)}
        </Route>
      );
    }

    return <Route key={route.path} path={route.path} element={route.element} />;
  });
};

export enum RoutePath {
  HOME = "/",
  PROJECTS = "/projects",
  BIO = "/bio",
}

export const ROUTES: IRoute[] = [
  {
    name: "Home",
    path: "/",
    element: <LandingPage />,
    exact: true,
  },
  {
    name: "Projects",
    path: "/projects",
    element: <ProjectsPage />,
    children: [
      {
        name: "Projects Table",
        path: "", // <== index route
        element: <ProjectsTable />,
      },
      {
        name: "Project Details",
        path: ":projectSlug",
        element: <ProjectDetails />,
      },
    ],
  },
  {
    name: "Bio",
    path: "/bio",
    element: <BioPage />,
  },
];
