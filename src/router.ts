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
    meta: [
      { title: "Spencer" },
      {
        name: "description",
        content:
          "Spencer Strelsov's personal site. Projects, writing, and contact.",
      },
    ],
  }),
});

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/about",
  component: lazyRouteComponent(() => import("./pages/About")),
  head: () => ({
    meta: [
      { title: "About | Spencer" },
      {
        name: "description",
        content:
          "Sr. Product Manager at Thomson Reuters, leading R&D for CoCounsel. Former fullstack engineer at Casetext. Yale alumnus.",
      },
    ],
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
    meta: [
      { title: "Projects | Spencer" },
      {
        name: "description",
        content: "Side projects and experiments by Spencer Strelsov.",
      },
    ],
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

// Unlisted: no nav link, not in the sitemap, noindex.
const stachedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/stached",
  component: lazyRouteComponent(() => import("./pages/Stached")),
  head: () => ({
    meta: [
      { title: "Stached" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

const stachedLeaderboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/stached/leaderboard",
  component: lazyRouteComponent(
    () => import("./pages/Stached"),
    "StachedLeaderboardPage",
  ),
  head: () => ({
    meta: [
      { title: "Leaderboard | Stached" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  aboutRoute,
  projectsRoute.addChildren([projectsIndexRoute, projectDetailRoute]),
  stachedRoute,
  stachedLeaderboardRoute,
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
