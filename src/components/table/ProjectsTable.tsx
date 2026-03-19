// src/components/ProjectsTable.jsx
import {
  getKeyValue,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@nextui-org/react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useMemo } from "react";
import { columns, projects } from "../../data/projects-table";

const ProjectsTable = () => {
  const navigate = useNavigate();
  const { showDrafts } = useSearch({ from: "/projects/" });

  const visibleProjects = useMemo(
    () =>
      showDrafts ? projects : projects.filter((project) => !project.isDraft),
    [showDrafts],
  );

  const handleRowAction = (slug: string) => {
    navigate({
      to: "/projects/$projectSlug",
      params: { projectSlug: slug },
      search: { showDrafts },
    });
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
