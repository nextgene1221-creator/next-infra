import { put } from "@vercel/blob";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const filename = process.argv[2];
if (!filename) {
  console.error("Usage: upload-backup.mjs <filename>");
  process.exit(1);
}

const data = await readFile(filename);
const fileSize = (await stat(filename)).size;
const blobPath = `db-backups/${path.basename(filename)}`;

const result = await put(blobPath, data, {
  access: "private",
  addRandomSuffix: true,
  contentType: "application/gzip",
  token: process.env.BLOB_READ_WRITE_TOKEN,
});

console.log(`Uploaded ${blobPath}`);
console.log(`URL: ${result.url}`);
console.log(`Size: ${(fileSize / 1024).toFixed(1)} KB`);
