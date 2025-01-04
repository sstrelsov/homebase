// app/components/ProjectsTable.tsx
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  getKeyValue,
} from "@nextui-org/react";
import { Link, useSearchParams } from "@remix-run/react";

interface Project {
  slug: string;
  isDraft?: boolean;
  [key: string]: any;
}

interface ProjectsTableProps {
  columns: { key: string; label: string }[];
  projects: Project[];
}

export default function ProjectsTable({
  columns,
  projects,
}: ProjectsTableProps) {
  const [searchParams] = useSearchParams();

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
    >
      <TableHeader columns={columns}>
        {(column) => <TableColumn key={column.key}>{column.label}</TableColumn>}
      </TableHeader>
      <TableBody items={projects}>
        {(item) => {
          const currentSearchString = searchParams.toString();
          const destination = `/projects/${item.slug}${
            currentSearchString ? `?${currentSearchString}` : ""
          }`;

          return (
            <TableRow key={item.slug} className="cursor-pointer">
              {columns.map((col) => {
                return (
                  <TableCell key={col.key}>
                    {/* Link each cell to the details page for that project */}
                    <Link to={destination}>{getKeyValue(item, col.key)}</Link>
                  </TableCell>
                );
              })}
            </TableRow>
          );
        }}
      </TableBody>
    </Table>
  );
}
