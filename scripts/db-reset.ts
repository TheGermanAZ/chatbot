import "dotenv/config";
import postgres from "postgres";

const client = postgres(process.env.DATABASE_URL!);

async function main() {
  await client.unsafe("DROP TABLE IF EXISTS messages");
  await client.unsafe("DROP TABLE IF EXISTS conversations");
  console.log("Tables dropped. Run 'bun db:push' to recreate with UUID schema.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => client.end());
