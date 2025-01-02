// src/components/ProjectsTable.jsx
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  getKeyValue,
} from "@nextui-org/react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { columns, projects } from "../../data/projects-table";

const ProjectsTable = () => {
  const navigate = useNavigate();
  // React Router's built-in hook for reading/parsing the query string
  const [searchParams] = useSearchParams();

  const [visibleProjects, setVisibleProjects] = useState(projects);

  useEffect(() => {
    // Reactively filter projects based on "showDrafts" query param
    const showDrafts = searchParams.get("showDrafts") === "true";
    const filteredProjects = showDrafts
      ? projects
      : projects.filter((project) => !project.isDraft);

    setVisibleProjects(filteredProjects);
  }, [searchParams]);

  const handleRowAction = (slug: string) => {
    // Preserve all existing query parameters when navigating
    const currentSearchString = searchParams.toString();
    const destination = `/projects/${slug}${currentSearchString ? `?${currentSearchString}` : ""}`;
    navigate(destination);
  };

  return (
    <Table
      classNames={{
        wrapper:
          "self-center flex flex-col max-w-xs bg-transparent shadow-none",
        td: "text-center",
      }}
      hideHeader
      selectionMode="single"
      fullWidth
      aria-label="Projects and writings"
      onRowAction={(slug) => handleRowAction(slug as string)}
    >
      <TableHeader columns={columns}>
        {(column) => <TableColumn key={column.key}>{column.label}</TableColumn>}
      </TableHeader>
      <TableBody items={visibleProjects}>
        {(item) => (
          <TableRow key={item.slug} className="cursor-pointer">
            {(columnKey) => (
              <TableCell>{getKeyValue(item, columnKey)}</TableCell>
            )}
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};

export default ProjectsTable;
