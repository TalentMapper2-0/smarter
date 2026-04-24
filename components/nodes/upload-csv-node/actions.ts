"use server";

import type { MappedCsvRow } from "./constants";

export async function saveUploadedCsvRows(rows: MappedCsvRow[]) {
  console.log("saveUploadedCsvRows", {
    rowCount: rows.length,
    preview: rows.slice(0, 5),
  });
}
