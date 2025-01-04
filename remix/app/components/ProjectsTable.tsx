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
import { useNavigate, useSearchParams } from "@remix-run/react";

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
  const navigate = useNavigate();

  const handleRowAction = (slug: string) => {
    const currentSearchString = searchParams.toString();
    const destination = `/projects/${slug}${
      currentSearchString ? `?${currentSearchString}` : ""
    }`;
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
      <TableBody items={projects}>
        {(item) => {
          return (
            <TableRow key={item.slug} className="cursor-pointer">
              {columns.map((col) => {
                return (
                  <TableCell key={col.key}>
                    {getKeyValue(item, col.key)}
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
