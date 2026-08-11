// Generates src/lib/component-stats.json — the "receipts" shown on every
// component docs page: gzipped source size and runtime dependencies.
// Runs as part of `pnpm registry:build` so the numbers can't drift.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const meta = JSON.parse(
  readFileSync(resolve(root, "src/lib/components-meta.json"), "utf8")
);

const stats = {};

for (const component of meta) {
  const file = resolve(root, "src/components/velora", `${component.slug}.tsx`);
  const source = readFileSync(file, "utf8");
  const gzip = gzipSync(Buffer.from(source), { level: 9 }).byteLength;

  // Runtime deps = external imports, minus type-only and internal aliases.
  const imports = [...source.matchAll(/from\s+"([^"]+)"/g)]
    .map((m) => m[1])
    .filter((s) => !s.startsWith("@/") && !s.startsWith("."))
    .filter((s) => s !== "react");
  const runtimeDeps = [...new Set(imports)];

  stats[component.slug] = {
    bytes: Buffer.byteLength(source),
    gzip,
    deps: runtimeDeps,
  };
}

writeFileSync(
  resolve(root, "src/lib/component-stats.json"),
  JSON.stringify(stats, null, 2) + "\n"
);

const zeroDep = Object.values(stats).filter((s) => s.deps.length === 0).length;
console.log(
  `component-stats.json: ${meta.length} components, ${zeroDep} zero-dependency`
);
