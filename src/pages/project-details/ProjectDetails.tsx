import { useParams, useSearch } from "@tanstack/react-router";
import CafeBelle from "../../content/CafeBelle.mdx";
import TheGlobeProject from "../../projects/globe-project/TheGlobeProject";
import PostTemplate from "../../templates/PostTemplate";
import { components } from "../../utils/mdx";
import useAtOrAboveBreakpoint from "../../utils/useAtOrAboveBreakpoint";

const ProjectDetails = () => {
  const { projectSlug } = useParams({ from: "/projects/$projectSlug" });
  const { showDrafts } = useSearch({ from: "/projects/$projectSlug" });
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
          <PostTemplate
            meta={{
              title: "A Conversation at Cafe Belle",
              date: "12-30-24",
              author: "Spencer Strelsov",
              imageSrc: "/images/cafe-belle-g-3200.jpg",
            }}
          >
            <CafeBelle
              components={components}
              isSmUp={isSmUp}
              isMdUp={isMdUp}
              isLgUp={isLgUp}
              isXLgUp={isXLgUp}
            />
          </PostTemplate>
        );
      }
      return <div>Oops! Project not found.</div>;
    default:
      return <div>Oops! Project not found.</div>;
  }
};

export default ProjectDetails;
