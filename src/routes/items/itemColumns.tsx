import { ItemType } from "@/types/itemTypes";
import { ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router-dom";

export const columns = (): ColumnDef<ItemType>[] => [
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => {
      const item = row.original;
      row.id = item.objectId;

      return (
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-medium leading-none break-words">
            {item.description || ""}
          </p>
          <p
            className="text-xs leading-none text-muted-foreground break-words whitespace-normal"
            style={{ overflowWrap: "anywhere" }}
          >
            {item.location || ""}
          </p>
          <Link to={`/items/${item.objectId}`} className="text-blue-500 underline">
            <p
              className="text-xs leading-none break-words whitespace-normal"
              style={{ overflowWrap: "anywhere" }}
            >
              {item.objectId}
            </p>
          </Link>
        </div>
      );
    },
  },
];
