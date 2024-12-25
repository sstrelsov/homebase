import { useParams } from "react-router-dom";
import TheGlobeProject from "../../projects/TheGlobeProjects";

const ProjectDetails = () => {
  const { projectSlug } = useParams();

  switch (projectSlug) {
    case "earth":
      return <TheGlobeProject />;
    default:
      return <div>Oops! Project not found.</div>;
  }
};

export default ProjectDetails;
