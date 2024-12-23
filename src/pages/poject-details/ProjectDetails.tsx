import { useParams } from "react-router-dom";
import Earth from "../../components/earth/Earth";

const ProjectDetail = () => {
  const { projectSlug } = useParams();

  switch (projectSlug) {
    case "earth":
      return <Earth />;
    default:
      return <div>Oops! Project not found.</div>;
  }
};

export default ProjectDetail;
