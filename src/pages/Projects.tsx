import { Outlet } from "@tanstack/react-router";

const ProjectsPage = () => {
  return (
    <div className="flex flex-col w-full h-full justify-center text-center gap-2">
      <Outlet />
    </div>
  );
};

export default ProjectsPage;
