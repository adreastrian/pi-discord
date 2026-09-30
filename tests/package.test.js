import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("host SDK is a wildcard peer, not a bundled dependency", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.peerDependencies["@earendil-works/pi-coding-agent"], "*");
  assert.equal(pkg.dependencies["@earendil-works/pi-coding-agent"], undefined);
  assert.equal(pkg.dependencies["@earendil-works/pi-tui"], undefined);
  assert.equal(pkg.peerDependencies.typebox, "*");
  assert.equal(pkg.dependencies.typebox, undefined);
});
