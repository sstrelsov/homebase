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
import { parseMockupSearch } from "./stached/mockups/search";

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

// Unlisted: no nav link, not in the sitemap, noindex. The page holds the
// session, and its screens render inside it, all from one lazy chunk.
const stachedPage = () => import("./pages/Stached");

const stachedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/stached",
  component: lazyRouteComponent(stachedPage),
  head: () => ({
    meta: [
      { title: "Stached" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

const stachedHomeRoute = createRoute({
  getParentRoute: () => stachedRoute,
  path: "/",
  component: lazyRouteComponent(stachedPage, "StachedHome"),
});

const stachedLeaderboardRoute = createRoute({
  getParentRoute: () => stachedRoute,
  path: "leaderboard",
  component: lazyRouteComponent(stachedPage, "StachedLeaderboard"),
  head: () => ({ meta: [{ title: "Leaderboard | Stached" }] }),
});

// Players and turnout, for the admin only. Unlinked except on the admin's home.
const stachedAdminRoute = createRoute({
  getParentRoute: () => stachedRoute,
  path: "admin",
  component: lazyRouteComponent(stachedPage, "StachedAdmin"),
  head: () => ({ meta: [{ title: "Admin | Stached" }] }),
});

const stachedPastRoute = createRoute({
  getParentRoute: () => stachedRoute,
  path: "past",
  component: lazyRouteComponent(stachedPage, "StachedPast"),
  head: () => ({ meta: [{ title: "Past games | Stached" }] }),
});

// One day's game: /stached/2026-09-29. Each date gets a fresh game screen.
const stachedDayRoute = createRoute({
  getParentRoute: () => stachedRoute,
  path: "$date",
  component: lazyRouteComponent(stachedPage, "StachedDay"),
  remountDeps: ({ params }) => params.date,
  head: ({ params }) => ({ meta: [{ title: `Stached · ${params.date}` }] }),
});

// Dev only: the admin's past runs and puzzle staging, on made-up data
// (src/stached/mockups/). Made inside the check, so a production build leaves
// them out entirely.
const devRoutes = import.meta.env.DEV
  ? [
      createRoute({
        getParentRoute: () => rootRoute,
        path: "/stached/admin-mockups",
        component: lazyRouteComponent(
          () => import("./stached/mockups/AdminMockups"),
        ),
        validateSearch: parseMockupSearch,
        head: () => ({
          meta: [
            { title: "Admin mockups | Stached" },
            { name: "robots", content: "noindex, nofollow" },
          ],
        }),
      }),
    ]
  : [];

const routeTree = rootRoute.addChildren([
  homeRoute,
  aboutRoute,
  projectsRoute.addChildren([projectsIndexRoute, projectDetailRoute]),
  stachedRoute.addChildren([
    stachedHomeRoute,
    stachedLeaderboardRoute,
    stachedAdminRoute,
    stachedPastRoute,
    stachedDayRoute,
  ]),
  ...devRoutes,
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
