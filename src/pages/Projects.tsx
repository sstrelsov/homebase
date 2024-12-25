import { Outlet } from "react-router-dom";

const ProjectsPage = () => {
  return (
    <div className="flex flex-col w-full h-full justify-center text-center gap-2 px-6">
      <Outlet />
    </div>
  );
};

export default ProjectsPage;
