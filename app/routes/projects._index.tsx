// app/routes/projects/_index.tsx

import { useSearchParams } from "@remix-run/react";
import ProjectsTable from "~/components/ProjectsTable";
import { columns, projects } from "~/data/projects";

export default function ProjectsIndexRoute() {
  const [searchParams] = useSearchParams();
  const showDrafts = searchParams.get("showDrafts") === "true";

  // Filter the projects entirely on the client side:
  const filteredProjects = showDrafts
    ? projects
    : projects.filter((p) => !p.isDraft);

  return <ProjectsTable columns={columns} projects={filteredProjects} />;
}
