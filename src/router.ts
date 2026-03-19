import {
  createRootRoute,
  createRoute,
  createRouter,
  HeadContent,
  lazyRouteComponent,
  stripSearchParams,
} from "@tanstack/react-router";
import App from "./App";
import ProjectsTable from "./components/table/ProjectsTable";

export { HeadContent };

const rootRoute = createRootRoute({
  component: App,
  notFoundComponent: () => "404 - Not Found :(",
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: lazyRouteComponent(() => import("./pages/Landing")),
  head: () => ({
    meta: [{ title: "Spencer" }],
  }),
});

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/about",
  component: lazyRouteComponent(() => import("./pages/About")),
  head: () => ({
    meta: [{ title: "About | Spencer" }],
  }),
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
  head: () => ({
    meta: [{ title: "Projects | Spencer" }],
  }),
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
  head: ({ params }) => ({
    meta: [
      {
        title: `${params.projectSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} | Spencer`,
      },
    ],
  }),
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  aboutRoute,
  projectsRoute.addChildren([projectsIndexRoute, projectDetailRoute]),
]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
