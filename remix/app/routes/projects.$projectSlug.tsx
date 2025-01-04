// app/routes/projects.$projectSlug.tsx

import { useParams, useSearchParams } from "@remix-run/react";
import TheGlobeProject from "~/components/TheGlobeProject";
// import CafeBelle from "~/components/CafeBelle";
// import TheGlobeProject from "~/components/TheGlobeProject";
import useAtOrAboveBreakpoint from "~/utils/useAtOrAboveBreakpoint";

export default function ProjectSlugRoute() {
  const { projectSlug } = useParams(); // e.g. "earth", "cafe-belle"
  const [searchParams] = useSearchParams();
  const showDrafts = searchParams.get("showDrafts") === "true";

  // your breakpoints
  const isSmUp = useAtOrAboveBreakpoint("sm");
  const isMdUp = useAtOrAboveBreakpoint("md");
  const isLgUp = useAtOrAboveBreakpoint("lg");
  const isXLgUp = useAtOrAboveBreakpoint("xl");

  switch (projectSlug) {
    case "earth":
      return <TheGlobeProject />;

    default:
      return <div>Oops! Project not found.</div>;
  }
}
