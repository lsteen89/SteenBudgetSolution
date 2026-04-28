import dotenv from "dotenv";
import { execFileSync } from "node:child_process";
import path from "node:path";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Playwright E2E setup requires ${name}.`);
  }

  return value;
}

async function globalSetup() {
  const frontendRoot = path.resolve(__dirname, "..");
  const repoRoot = path.resolve(frontendRoot, "..");

  dotenv.config({ path: path.join(repoRoot, ".env.e2e"), override: true });

  const databaseName =
    process.env.E2E_DATABASE_NAME ??
    process.env.MARIADB_DATABASE ??
    "steenbudgetE2E";
  const host = process.env.E2E_DB_HOST ?? "127.0.0.1";
  const port = process.env.E2E_DB_PORT ?? "3307";

  const rootPassword = requiredEnv("MARIADB_ROOT_PASSWORD");
  const appUser = process.env.MARIADB_USER ?? "app";
  const appPassword = requiredEnv("MARIADB_PASSWORD");

  const adminConnectionString =
    process.env.E2E_DATABASESETTINGS__CONNECTIONSTRING ??
    [
      `Server=${host}`,
      `Port=${port}`,
      "Uid=root",
      `Pwd=${rootPassword}`,
      "SslMode=None",
      "GuidFormat=Binary16",
    ].join(";");

  const appConnectionString =
    process.env.DATABASESETTINGS__CONNECTIONSTRING ??
    [
      `Server=${host}`,
      `Port=${port}`,
      `Database=${databaseName}`,
      `Uid=${appUser}`,
      `Pwd=${appPassword}`,
      "SslMode=None",
      "GuidFormat=Binary16",
    ].join(";");

  execFileSync(
    "dotnet",
    [
      "run",
      "--project",
      path.join(repoRoot, "Backend.Tools", "Backend.Tools.csproj"),
      "--",
      "seed-e2e",
    ],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        ALLOW_SEEDING: "true",
        DOTNET_ENVIRONMENT: "Development",
        E2E_DATABASE_NAME: databaseName,
        E2E_DATABASESETTINGS__CONNECTIONSTRING: adminConnectionString,
        DATABASESETTINGS__CONNECTIONSTRING: appConnectionString,
        Jwt__ActiveKid: process.env.Jwt__ActiveKid ?? "dev",
        Jwt__Keys__dev:
          process.env.Jwt__Keys__dev ??
          "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
        SEED_CLOCK_UTC: process.env.SEED_CLOCK_UTC ?? "2026-04-26T12:00:00Z",
        WEBSOCKET_SECRET: process.env.WEBSOCKET_SECRET ?? "dev-ws-secret",
      },
      stdio: "inherit",
    },
  );
}

export default globalSetup;
