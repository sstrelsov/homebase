import ProjectsTable from "../components/table/ProjectsTable";

const ProjectsPage = () => {
  return (
    <div className="flex flex-col max-w-sm sm:max-w-lg h-full justify-center text-center gap-2">
      <ProjectsTable />
    </div>
  );
};

export default ProjectsPage;
