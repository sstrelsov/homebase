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
import { useNavigate } from "react-router-dom";
import { columns, projects } from "../../data/projects-table";

const ProjectsTable = () => {
  const navigate = useNavigate();

  return (
    <Table
      classNames={{
        base: "justify-center flex flex-col w-full",
      }}
      hideHeader
      removeWrapper
      selectionMode="single"
      fullWidth
      aria-label="Projects and writings"
      onRowAction={(slug) => {
        navigate(`/projects/${slug}`);
      }}
    >
      <TableHeader columns={columns}>
        {(column) => <TableColumn key={column.key}>{column.label}</TableColumn>}
      </TableHeader>
      <TableBody items={projects}>
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
