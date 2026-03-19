import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  stripSearchParams,
} from "@tanstack/react-router";
import App from "./App";
import ProjectsTable from "./components/table/ProjectsTable";

const rootRoute = createRootRoute({
  component: App,
  notFoundComponent: () => "404 - Not Found :(",
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: lazyRouteComponent(() => import("./pages/Landing")),
});

const bioRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/bio",
  component: lazyRouteComponent(() => import("./pages/Bio")),
});

const projectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/projects",
  component: lazyRouteComponent(() => import("./pages/Projects")),
  validateSearch: (
    search: Record<string, unknown>,
  ): { showDrafts?: boolean } => {
    const showDrafts =
      search.showDrafts === true || search.showDrafts === "true";
    return showDrafts ? { showDrafts: true } : {};
  },
  search: {
    middlewares: [stripSearchParams({ showDrafts: false })],
  },
});

const projectsIndexRoute = createRoute({
  getParentRoute: () => projectsRoute,
  path: "/",
  component: ProjectsTable,
});

const projectDetailRoute = createRoute({
  getParentRoute: () => projectsRoute,
  path: "$projectSlug",
  component: lazyRouteComponent(
    () => import("./pages/project-details/ProjectDetails"),
  ),
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  bioRoute,
  projectsRoute.addChildren([projectsIndexRoute, projectDetailRoute]),
]);

const hashHistory = createHashHistory();

export const router = createRouter({
  routeTree,
  history: hashHistory,
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
