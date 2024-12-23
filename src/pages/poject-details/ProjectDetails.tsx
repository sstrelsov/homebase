import { useParams } from "react-router-dom";
import Earth from "../../components/earth/Earth";
// import any other components you might need

const ProjectDetail = () => {
  const { projectSlug } = useParams();

  // For demonstration, we’ll just check the projectId directly.
  // In a real scenario, you might fetch or filter your project data by the ID/slug.
  switch (projectSlug) {
    case "earth":
      return <Earth />;
    // case "another-project": return <AnotherProject />;
    // add more cases if needed
    default:
      return <div>Project not found or not implemented yet.</div>;
  }
};

export default ProjectDetail;
