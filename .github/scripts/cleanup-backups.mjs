import { list, del } from "@vercel/blob";

const RETENTION_DAYS = 30;
const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
const token = process.env.BLOB_READ_WRITE_TOKEN;

let cursor;
let scanned = 0;
const toDelete = [];

do {
  const page = await list({ prefix: "db-backups/", cursor, token });
  for (const b of page.blobs) {
    scanned++;
    const uploaded = new Date(b.uploadedAt).getTime();
    if (uploaded < cutoff) {
      toDelete.push(b);
    }
  }
  cursor = page.cursor;
} while (cursor);

if (toDelete.length === 0) {
  console.log(`Scanned ${scanned} blob(s). Nothing to delete.`);
  process.exit(0);
}

for (const b of toDelete) {
  await del(b.url, { token });
  console.log(`Deleted ${b.pathname} (uploaded ${b.uploadedAt})`);
}

console.log(`Cleanup complete. Deleted ${toDelete.length} of ${scanned} blob(s) older than ${RETENTION_DAYS} days.`);
