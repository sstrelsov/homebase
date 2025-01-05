// app/routes/projects.$projectSlug.tsx

import { useParams } from "@remix-run/react";
import BlogPost from "~/components/BlogPost";
import TheGlobeProject from "~/components/TheGlobeProject";
import CafeBelle, {
  frontmatter as cafeBelleFrontmatter,
} from "~/posts/CafeBelle.mdx";
import useAtOrAboveBreakpoint from "~/utils/useAtOrAboveBreakpoint";

export default function ProjectSlugRoute() {
  const { projectSlug } = useParams(); // e.g. "earth", "cafe-belle"

  // your breakpoints
  const isSmUp = useAtOrAboveBreakpoint("sm");
  const isMdUp = useAtOrAboveBreakpoint("md");
  const isLgUp = useAtOrAboveBreakpoint("lg");
  const isXLgUp = useAtOrAboveBreakpoint("xl");

  switch (projectSlug) {
    case "earth":
      return <TheGlobeProject />;
    case "cafe-belle":
      return (
        <BlogPost post={<CafeBelle />} frontMatter={cafeBelleFrontmatter} />
      );
    default:
      return <div>Oops! Project not found.</div>;
  }
}
