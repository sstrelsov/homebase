import type { MetaFunction } from "@remix-run/node";
import { useParams, useSearchParams } from "@remix-run/react";
import BlogPost from "~/components/BlogPost";
import TheGlobeProject from "~/components/TheGlobeProject";
import CafeBelle, {
  frontmatter as cafeBelleFrontmatter,
} from "~/posts/CafeBelle.mdx";
import useAtOrAboveBreakpoint from "~/utils/useAtOrAboveBreakpoint";

export const meta: MetaFunction = ({ params }) => {
  // Pull projectSlug from route params
  const { projectSlug } = params;

  let tags = [
    { title: "Spencer Strelsov" },
    {
      name: "description",
      content: "Personal site for Spencer",
    },
    { property: "og:title", content: "Spencer Strelsov" },
    {
      property: "og:description",
      content:
        "Sr. Product Manager at Thomson Reuters, building AI for lawyers & journalists.",
    },
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://www.strelsov.me" },
    { property: "og:site_name", content: "Spencer Strelsov" },

    // You can keep a default fallback image:
    { property: "og:image", content: "/images/strelsov-landing.png" },
  ];

  // If user is on the "earth" slug (The Globe Project):
  if (projectSlug === "earth") {
    tags = [
      ...tags.filter(
        (tag) => tag.property !== "og:image" && tag.property !== "og:url"
      ), // remove default if needed
      { property: "og:url", content: "https://www.strelsov.me/projects/earth" },
      { property: "og:image", content: "/images/globe-project.png" },
    ];
  }

  return tags;
};

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

    case "cafe-belle":
      if (showDrafts) {
        return (
          <BlogPost post={<CafeBelle />} frontmatter={cafeBelleFrontmatter} />
        );
      }

    default:
      return <div>Oops! Project not found.</div>;
  }
}
