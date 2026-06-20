import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const prismaDir = path.join(root, "prisma");
const envPath = path.join(root, ".env");

ensureEnvFile();

const databaseUrl = process.env.DATABASE_URL ?? readDatabaseUrlFromEnvFile();

if (!databaseUrl?.startsWith("file:")) {
  process.exit(0);
}

const sqlitePath = databaseUrl.slice("file:".length);
const absolutePath = path.isAbsolute(sqlitePath)
  ? sqlitePath
  : path.resolve(prismaDir, sqlitePath);

fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
fs.closeSync(fs.openSync(absolutePath, "a"));

function readDatabaseUrlFromEnvFile() {
  if (!fs.existsSync(envPath)) {
    return "file:./dev.db";
  }

  const env = fs.readFileSync(envPath, "utf8");
  const line = env
    .split(/\r?\n/)
    .find((entry) => entry.trim().startsWith("DATABASE_URL="));

  if (!line) {
    return "file:./dev.db";
  }

  return line
    .slice("DATABASE_URL=".length)
    .trim()
    .replace(/^['"]|['"]$/g, "");
}

function ensureEnvFile() {
  if (fs.existsSync(envPath)) {
    return;
  }

  const examplePath = path.join(root, ".env.example");
  const defaultEnv = 'DATABASE_URL="file:./dev.db"\n';
  const envContent = fs.existsSync(examplePath) ? fs.readFileSync(examplePath, "utf8") : defaultEnv;

  fs.writeFileSync(envPath, envContent.endsWith("\n") ? envContent : `${envContent}\n`);
}
