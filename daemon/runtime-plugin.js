import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import * as defaultPlugin from "./default-runtime-plugin.js";

export const RUNTIME_PLUGIN_API_VERSION = 1;

function assertAdapter(adapter) {
  if (!adapter || typeof adapter !== "object") throw new Error("Runtime plugin must return an adapter object.");
  if (typeof adapter.id !== "string" || !adapter.id.trim()) throw new Error("Runtime plugin adapter requires a non-empty `id`.");
  if (!Array.isArray(adapter.slashCommands)) throw new Error("Runtime plugin adapter requires a `slashCommands` array.");
  if (typeof adapter.start !== "function") throw new Error("Runtime plugin adapter requires `start()`.");
  if (typeof adapter.stop !== "function") throw new Error("Runtime plugin adapter requires `stop()`.");
  return adapter;
}

async function loadConfiguredPlugin(descriptor) {
  if (!path.isAbsolute(descriptor.module)) throw new Error("Runtime plugin `module` must be an absolute path.");
  if (descriptor.integrity) {
    const source = await readFile(descriptor.module);
    const actual = `sha256-${createHash("sha256").update(source).digest("base64")}`;
    if (actual !== descriptor.integrity) throw new Error("Runtime plugin integrity check failed.");
  }
  return import(pathToFileURL(descriptor.module).href);
}

export async function loadRuntimePlugin({ config, paths, coreVersion }) {
  const descriptor = config.runtimePlugin;
  const plugin = descriptor ? await loadConfiguredPlugin(descriptor) : defaultPlugin;
  if (plugin.apiVersion !== RUNTIME_PLUGIN_API_VERSION) {
    throw new Error(`Unsupported runtime plugin API version: ${String(plugin.apiVersion)}. Expected ${RUNTIME_PLUGIN_API_VERSION}.`);
  }
  if (typeof plugin.createRuntime !== "function") throw new Error("Runtime plugin must export `createRuntime()`.");
  const adapter = await plugin.createRuntime({
    coreVersion,
    config,
    options: descriptor?.options ?? {},
    paths,
  });
  return assertAdapter(adapter);
}
