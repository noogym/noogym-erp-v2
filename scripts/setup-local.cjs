const { existsSync, mkdirSync, writeFileSync } = require("node:fs");
const { dirname, join } = require("node:path");
const { spawnSync } = require("node:child_process");

const root = join(__dirname, "..");
const apiPackage = "@noogym/noogym-erp-api";
const composeFiles = ["-f", "docker-compose.yml", "-f", "docker-compose.local.yml"];

const localFiles = [
  {
    path: join(root, "apps", "noogym-erp-api", ".env"),
    content: [
      'DATABASE_URL="postgresql://noogym:noogym_password@localhost:5432/noogymsoftware?schema=public"',
      'AUTH_PROVIDER="local"',
      'JWT_SECRET="change-this-local-jwt-secret-with-at-least-32-chars"',
      'JWT_EXPIRES_IN="1d"',
      'JWT_REFRESH_SECRET="change-this-local-refresh-secret-with-at-least-32-chars"',
      'JWT_REFRESH_EXPIRES_IN="7d"',
      'PASSWORD_RESET_BASE_URL="http://localhost:3000"',
      'PASSWORD_RESET_TTL_MINUTES="30"',
      'PASSWORD_RESET_EXPOSE_TOKEN="true"',
      'CORS_ORIGINS="http://localhost:3000"',
      "PORT=3333",
      "DATABASE_RETRY_DELAY_MS=2000",
      "",
    ].join("\n"),
  },
  {
    path: join(root, "apps", "web-admin", ".env.local"),
    content: [
      "NOOGYM_API_URL=http://localhost:3333",
      "NEXT_PUBLIC_NOOGYM_API_URL=http://localhost:3333",
      "NEXT_PUBLIC_NOOGYM_WEB_URL=http://localhost:3000/register",
      "NEXT_PUBLIC_NOOGYM_HTTP_ONLY_AUTH=true",
      "",
    ].join("\n"),
  },
];

function log(message) {
  process.stdout.write(`\n[setup:local] ${message}\n`);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: options.stdio ?? "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, ...options.env },
  });

  if (result.status !== 0) {
    const joined = [command, ...args].join(" ");
    throw new Error(`${joined} failed with exit code ${result.status}`);
  }

  return result;
}

function output(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32",
  });

  return {
    ok: result.status === 0,
    text: `${result.stdout ?? ""}${result.stderr ?? ""}`.trim(),
  };
}

function ensureLocalFiles() {
  for (const file of localFiles) {
    if (existsSync(file.path)) {
      log(`mantido ${relative(file.path)}`);
      continue;
    }

    mkdirSync(dirname(file.path), { recursive: true });
    writeFileSync(file.path, file.content, "utf8");
    log(`criado ${relative(file.path)}`);
  }
}

function waitForPostgres() {
  const retries = Number(process.env.NOOGYM_SETUP_DB_RETRIES ?? 45);

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const result = output("docker", [
      "compose",
      ...composeFiles,
      "exec",
      "-T",
      "postgres",
      "pg_isready",
      "-h",
      "127.0.0.1",
      "-U",
      "noogym",
      "-d",
      "noogymsoftware",
    ]);

    if (result.ok && result.text.includes("accepting connections")) {
      log("PostgreSQL pronto em localhost:5432");
      return;
    }

    process.stdout.write(".");
    runSleep(2000);
  }

  throw new Error("PostgreSQL nao ficou pronto dentro do tempo esperado.");
}

function assertNoBlockingDevProcesses() {
  const blockers = listBlockingDevProcesses();

  if (!blockers.length) return;

  if (process.env.NOOGYM_SETUP_STOP_DEV === "true") {
    log("encerrando processos dev do workspace");
    stopProcesses(blockers.map((line) => line.split(/\s+/, 1)[0]).filter(Boolean));
    return;
  }

  process.stderr.write("\nProcessos dev ainda estao a usar ficheiros do projeto:\n");
  blockers.forEach((line) => process.stderr.write(`- ${line}\n`));
  throw new Error(
    "Pare o pnpm run dev antes de rodar setup:local, ou use NOOGYM_SETUP_STOP_DEV=true para encerrar automaticamente.",
  );
}

function listBlockingDevProcesses() {
  if (process.platform !== "win32") return [];

  const escapedRoot = root.replace(/'/g, "''");
  const script = [
    "$patterns = @('turbo dev','next dev','nest start','dist\\\\src\\\\main','vite --host','electron.exe .')",
    `$root = '${escapedRoot}'`,
    "Get-CimInstance Win32_Process | Where-Object {",
    "  $cmd = $_.CommandLine",
    "  $cmd -and -not $cmd.Contains('Get-CimInstance Win32_Process') -and $cmd.Contains($root) -and ($patterns | Where-Object { $cmd.Contains($_) })",
    "} | ForEach-Object { \"$($_.ProcessId) $($_.CommandLine)\" }",
  ].join("; ");
  const result = spawnSync("powershell.exe", ["-NoProfile", "-Command", script], {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });

  if (result.status !== 0) return [];
  return String(result.stdout ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function stopProcesses(processIds) {
  if (process.platform !== "win32" || !processIds.length) return;

  const quotedIds = processIds.map((id) => Number(id)).filter(Number.isFinite);
  if (!quotedIds.length) return;

  const script = quotedIds
    .map((id) => `Stop-Process -Id ${id} -Force -ErrorAction SilentlyContinue`)
    .join("; ");
  spawnSync("powershell.exe", ["-NoProfile", "-Command", script], {
    cwd: root,
    stdio: "inherit",
    shell: false,
  });
}

function hasDemoSeed() {
  const result = output("docker", [
    "compose",
    ...composeFiles,
    "exec",
    "-T",
    "postgres",
    "psql",
    "-U",
    "noogym",
    "-d",
    "noogymsoftware",
    "-tAc",
    'select count(*) from "Organization" where slug = \'noogym-demo\';',
  ]);

  return result.ok && Number(result.text.split(/\s+/).find(Boolean)) > 0;
}

function runSleep(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
  }
}

function relative(path) {
  return path.replace(`${root}\\`, "").replace(`${root}/`, "");
}

async function main() {
  ensureLocalFiles();

  log("subindo PostgreSQL local");
  run("docker", ["compose", ...composeFiles, "up", "-d", "postgres"]);

  log("aguardando PostgreSQL");
  waitForPostgres();

  assertNoBlockingDevProcesses();

  log("gerando Prisma Client");
  run("pnpm", ["--filter", apiPackage, "prisma:generate"]);

  log("aplicando migrations");
  run("pnpm", ["--filter", apiPackage, "exec", "prisma", "migrate", "deploy"]);

  if (process.env.NOOGYM_SETUP_SEED === "false") {
    log("seed ignorado por NOOGYM_SETUP_SEED=false");
  } else if (hasDemoSeed()) {
    log("seed demo ja existe, nada a fazer");
  } else {
    log("criando seed demo");
    run("pnpm", ["--filter", apiPackage, "prisma:seed"]);
  }

  log("ambiente local pronto");
  process.stdout.write("\nCredenciais demo: admin@noogym.com / Noogym@123\n");
  process.stdout.write("Agora rode: pnpm run dev\n\n");
}

main().catch((error) => {
  process.stderr.write(`\n[setup:local] ${error.message}\n`);
  process.exit(1);
});
