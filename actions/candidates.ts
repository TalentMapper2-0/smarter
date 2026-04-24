import "server-only";

import type { MappedCsvRow } from "../components/nodes/upload-csv-node/constants";

export async function saveUploadedCsvRows({
  rows,
  userId,
}: {
  rows: MappedCsvRow[];
  userId: string;
}) {
  console.log("saveUploadedCsvRows", {
    userId,
    rowCount: rows.length,
    preview: rows.slice(0, 5),
  });

  return {
    rowCount: rows.length,
  };
}
