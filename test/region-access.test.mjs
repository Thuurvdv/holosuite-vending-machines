import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { findMachineRegionPresence, findMachineRegionPresences, regionContainsToken } from "../src/region-access.mjs";

const machine = { id: "machine-1", regionIds: ["region-1"], access: { requireProximity: true } };
const actor = { id: "actor-1" };

test("finds an actor token that is currently a member of a linked Region", () => {
  const region = { id: "region-1" };
  const token = { id: "token-1", actorId: actor.id, regions: new Set([region]) };
  const scene = { regions: [region], tokens: [token], grid: { size: 100 } };

  const presence = findMachineRegionPresence({ scene, machine, actor });

  assert.equal(presence?.region, region);
  assert.equal(presence?.token, token);
});

test("does not treat a linked Region by itself as player presence", () => {
  const region = { id: "region-1" };
  const token = { id: "token-1", actorId: actor.id, regions: new Set() };
  const scene = { regions: [region], tokens: [token], grid: { size: 100 } };

  assert.equal(findMachineRegionPresence({ scene, machine, actor }), null);
});

test("falls back to Region point testing on Foundry versions without membership sets", () => {
  const region = { id: "region-1", testPoint: ({ x, y }) => x === 150 && y === 250 };
  const token = { id: "token-1", actorId: actor.id, x: 100, y: 200, width: 1, height: 1 };
  const scene = { grid: { size: 100 } };

  assert.equal(regionContainsToken(region, token, scene), true);
});

test("resolves player presence once for multiple machines linked to the same Region", () => {
  const region = { id: "region-1" };
  const token = { id: "token-1", actorId: actor.id, regions: new Set([region]) };
  const scene = { regions: [region], tokens: [token], grid: { size: 100 } };
  const machines = [machine, { ...machine, id: "machine-2" }];

  const presences = findMachineRegionPresences({ scene, machines, actor });

  assert.equal(presences.get("machine-1")?.region, region);
  assert.equal(presences.get("machine-2")?.token, token);
});

test("the player browser and open API both enforce live Region presence", async () => {
  const [browser, api, store, manager, editor, browserTemplate] = await Promise.all([
    readFile(new URL("../src/machine-browser-app.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/api.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/machine-store.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/machine-manager-app.ts", import.meta.url), "utf8"),
    readFile(new URL("../templates/machine-edit.hbs", import.meta.url), "utf8"),
    readFile(new URL("../templates/machine-browser.hbs", import.meta.url), "utf8")
  ]);

  assert.match(browser, /findMachineRegionPresences\(\{ scene, machines: proximityMachines, actor, tokenId \}\)[\s\S]*requiresLivePresence = machine\.access\?\.requireProximity && !game\.user\?\.isGM;[\s\S]*presenceByMachine\.get\(machine\.id\)[\s\S]*if \(requiresLivePresence && !presence\) continue;/);
  assert.match(api, /PurchaseService\.checkAccess\(\{ machineId, actor, context \}\)[\s\S]*if \(!access\.allowed && !game\.user\.isGM\)/);
  assert.match(store, /requireProximity:\s*asBoolean\([^,]+, true\)/);
  assert.doesNotMatch(store, /requiredItemName/);
  assert.doesNotMatch(manager, /requiredItemName/);
  assert.doesNotMatch(editor, /Required Actor Item|requiredItemName/);
  assert.match(editor, /<label>Linked Regions<\/label>/);
  assert.match(browserTemplate, /data-token-id="\{\{tokenId\}\}"/);
});

test("the header uses an icon-only status value and an always-visible custom close control", async () => {
  const [template, styles] = await Promise.all([
    readFile(new URL("../templates/vending-app.hbs", import.meta.url), "utf8"),
    readFile(new URL("../styles/vending-machine-styles.css", import.meta.url), "utf8")
  ]);

  assert.doesNotMatch(template, /<strong>\{\{connectionStatus\}\}/);
  assert.match(template, /class="hsv-connection-indicator"[^>]+aria-label="\{\{connectionStatus\}\}"[^>]*><i><\/i><i><\/i><i><\/i><i><\/i>/);
  assert.match(template, /class="hsv-machine-close"[\s\S]*?<span aria-hidden="true">&times;<\/span>/);
  assert.match(styles, /\.hsv-machine \.hsv-machine-close\s*\{[^}]*z-index:\s*30;[^}]*display:\s*grid !important;[^}]*visibility:\s*visible;/s);
  assert.match(styles, /\[data-machine-style="industrial"\] \.hsv-machine-close\s*\{[^}]*position:\s*absolute !important;[^}]*right:\s*44px !important;/s);
});
