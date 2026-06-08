import 'dotenv/config';
import { connectDatabase } from '../api/config/db.js';
import { syncAllG2BulkCambodiaPackages } from '../api/services/g2bulkCatalogueSync.js';

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  await connectDatabase();

  const summary = await syncAllG2BulkCambodiaPackages();
  for (const result of summary.results) {
    if (result.skipped) {
      console.log(`skip ${result.slug}: ${result.reason}`);
      continue;
    }
    if (result.deleted) {
      console.log(`deleted ${result.deleted} stale ${result.game} packages`);
    }
    console.log(`synced ${result.game} (${result.providerGameCode}): ${result.packages} packages`);
  }

  console.log(`synced ${summary.packages} Cambodia G2Bulk packages across ${summary.games} games`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
