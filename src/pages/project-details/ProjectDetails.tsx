import { useLocation, useParams } from "react-router-dom";
import CafeBelle from "../../content/CafeBelle.mdx";
import TheGlobeProject from "../../projects/globe-project/TheGlobeProject";
import PostTemplate from "../../templates/PostTemplate";
import { components } from "../../utils/mdx";
import useAtOrAboveBreakpoint from "../../utils/useAtOrAboveBreakpoint";
const ProjectDetails = () => {
  const { projectSlug } = useParams();
  const location = useLocation();

  // Check query parameter
  const queryParams = new URLSearchParams(location.search);
  const showDrafts = queryParams.get("showDrafts") === "true";
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
            children={
              <CafeBelle
                components={components}
                isSmUp={isSmUp}
                isMdUp={isMdUp}
                isLgUp={isLgUp}
                isXLgUp={isXLgUp}
              />
            }
            meta={{
              title: "A Conversation at Cafe Belle",
              date: "12-30-24",
              author: "Spencer Strelsov",
              imageSrc: "/images/cafe-belle-g-3200.jpg",
            }}
          />
        );
      }
      return <div>Oops! Project not found.</div>;
    default:
      return <div>Oops! Project not found.</div>;
  }
};

export default ProjectDetails;
