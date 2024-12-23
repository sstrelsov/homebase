import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  getKeyValue,
} from "@nextui-org/react";
import { columns, projects } from "../../data/projects-table";

const ProjectsTable = () => {
  return (
    <Table
      classNames={{
        base: "justify-center h-full flex flex-grow flex-col w-full",
      }}
      hideHeader
      removeWrapper
      selectionMode="single"
      fullWidth
      aria-label="Projects and writings"
    >
      <TableHeader columns={columns}>
        {(column) => <TableColumn key={column.key}>{column.label}</TableColumn>}
      </TableHeader>
      <TableBody items={projects}>
        {(item) => (
          <TableRow key={item.key}>
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
