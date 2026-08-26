import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("stock-only machine changes do not synchronize Region documents", async () => {
  const source = await readFile(new URL("../src/region/vending-region-handler.ts", import.meta.url), "utf8");

  assert.match(source, /if \(!isResponsibleGM\(\)/);
  assert.match(source, /behaviorNeedsUpdate\(existing, behaviorData\)/);
  assert.match(source, /changes\?\.regionStructureChanged !== false/);
  assert.doesNotMatch(source, /getMachineIdsForRegion/);
});

test("machine reads use a normalized cache and refresh only changed vending apps", async () => {
  const [store, main, app] = await Promise.all([
    readFile(new URL("../src/machine-store.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/main.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/vending-app.ts", import.meta.url), "utf8")
  ]);

  assert.match(store, /static getCachedState\(\)[\s\S]*this\.machineStateCache = normalizeState/);
  assert.match(store, /static getMachines\(\)\s*\{\s*return this\.getCachedState\(\)\.machines;/);
  assert.match(main, /VendingApp\.refreshMachines\(machineIds\)/);
  assert.match(app, /static refreshMachines\(machineIds\)/);
});

test("UUID-backed pending reservations avoid duplicate item snapshots", async () => {
  const source = await readFile(new URL("../src/purchase-service.ts", import.meta.url), "utf8");

  assert.match(source, /items: resolvedItems\.map[\s\S]*entryId: resolved\.line\.entry\.id,[\s\S]*itemUuid: resolved\.line\.entry\.itemUuid/);
  assert.match(source, /resolved\.line\.entry\.itemUuid \? \{\} : \{ itemData: resolved\.itemData \}/);
  assert.match(source, /resolvedReservationItems/);
  assert.match(source, /resolveReservedPurchaseItem/);
});

test("window dragging coalesces position updates and pauses decorative animation", async () => {
  const [app, styles] = await Promise.all([
    readFile(new URL("../src/vending-app.ts", import.meta.url), "utf8"),
    readFile(new URL("../styles/vending.css", import.meta.url), "utf8")
  ]);

  assert.match(app, /pendingPosition = \{ left: Math\.round\(left\), top: Math\.round\(top\) \}/);
  assert.match(app, /dragFrame === null\) dragFrame = window\.requestAnimationFrame\(applyPendingPosition\)/);
  assert.match(app, /classList\?\.add\("hsv-is-dragging"\)[\s\S]*classList\?\.remove\("hsv-is-dragging"\)/);
  assert.match(styles, /\.hsv-is-dragging \.hsv-machine \*[\s\S]*animation-play-state: paused !important;/);
});
