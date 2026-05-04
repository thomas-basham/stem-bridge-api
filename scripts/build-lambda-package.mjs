import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const rootDir = process.cwd();
const packageDir = path.join(rootDir, ".lambda-package");

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? rootDir,
    stdio: "inherit",
    env: process.env
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

rmSync(packageDir, { recursive: true, force: true });
mkdirSync(packageDir, { recursive: true });

cpSync(path.join(rootDir, "dist"), path.join(packageDir, "dist"), { recursive: true });

const rootPackageJson = JSON.parse(readFileSync(path.join(rootDir, "package.json"), "utf8"));
writeFileSync(
  path.join(packageDir, "package.json"),
  `${JSON.stringify(
    {
      name: rootPackageJson.name,
      version: rootPackageJson.version,
      private: true,
      type: rootPackageJson.type,
      dependencies: rootPackageJson.dependencies
    },
    null,
    2
  )}\n`
);

if (existsSync(path.join(rootDir, "prisma", "schema.prisma"))) {
  mkdirSync(path.join(packageDir, "prisma"), { recursive: true });
  cpSync(path.join(rootDir, "prisma", "schema.prisma"), path.join(packageDir, "prisma", "schema.prisma"));
}

run("npm", ["install", "--omit=dev", "--legacy-peer-deps", "--ignore-scripts", "--no-audit", "--no-fund"], {
  cwd: packageDir
});

writeFileSync(
  path.join(packageDir, ".lambda-package-info.json"),
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      handler: "dist/lambda.handler"
    },
    null,
    2
  )}\n`
);
