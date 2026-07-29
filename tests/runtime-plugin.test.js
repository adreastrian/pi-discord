import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, writeFile } from "node:fs/promises";
import { createDefaultConfig } from "../lib/config.js";
import { getPaths } from "../lib/paths.js";
import { loadRuntimePlugin } from "../daemon/runtime-plugin.js";

async function fixture(source) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "pi-discord-plugin-"));
  const module = path.join(dir, "plugin.mjs");
  await writeFile(module, source, "utf8");
  const paths = getPaths({ agentDir: dir, workspaceDir: path.join(dir, "workspace") });
  const config = createDefaultConfig(paths);
  config.runtimePlugin = { module, options: { marker: "private" } };
  return { config, paths };
}

test("built-in runtime plugin exposes complete lifecycle adapter", async () => {
  const paths = getPaths({ workspaceDir: path.join(os.tmpdir(), "pi-discord-default-plugin") });
  const adapter = await loadRuntimePlugin({ config: createDefaultConfig(paths), paths, coreVersion: "test" });
  assert.equal(adapter.id, "default");
  assert.equal(typeof adapter.start, "function");
  assert.equal(typeof adapter.stop, "function");
  assert.equal(adapter.slashCommands.length, 1);
});

test("configured runtime plugin receives opaque options", async () => {
  const { config, paths } = await fixture(`
    export const apiVersion = 1;
    export async function createRuntime(input) {
      return { id: input.options.marker, slashCommands: [], async start() {}, async stop() {} };
    }
  `);
  const adapter = await loadRuntimePlugin({ config, paths, coreVersion: "0.3.0" });
  assert.equal(adapter.id, "private");
});

test("runtime plugin rejects incompatible API versions", async () => {
  const { config, paths } = await fixture(`
    export const apiVersion = 2;
    export async function createRuntime() { return {}; }
  `);
  await assert.rejects(
    loadRuntimePlugin({ config, paths, coreVersion: "0.3.0" }),
    /Unsupported runtime plugin API version/,
  );
});

test("runtime plugin validates adapter shape", async () => {
  const { config, paths } = await fixture(`
    export const apiVersion = 1;
    export async function createRuntime() { return { id: "broken" }; }
  `);
  await assert.rejects(
    loadRuntimePlugin({ config, paths, coreVersion: "0.3.0" }),
    /slashCommands/,
  );
});
