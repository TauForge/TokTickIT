import { config } from "dotenv";
import path from "path";

const result = config({ path: path.resolve(__dirname, "../.env.test"), override: true });

if (result.error) {
  throw new Error(
    `server/tests/setupEnv.ts: failed to load server/.env.test (${result.error.message}). ` +
      "Refusing to run tests against whatever DATABASE_URL happens to already be in the " +
      "environment — create server/.env.test (gitignored, see README) with a DATABASE_URL " +
      "pointing at a dedicated *_test database before running the test suite.",
  );
}

const databaseUrl = process.env.DATABASE_URL ?? "";
const databaseName = databaseUrl.split("?")[0].split("/").pop() ?? "";
if (!databaseName.endsWith("_test")) {
  throw new Error(
    `server/tests/setupEnv.ts: DATABASE_URL from server/.env.test does not look like a test ` +
      `database (resolved database name "${databaseName}", expected it to end with "_test"). ` +
      "Refusing to run tests — several test files perform real deleteMany/create/delete calls " +
      "and must never point at a dev or production database.",
  );
}
