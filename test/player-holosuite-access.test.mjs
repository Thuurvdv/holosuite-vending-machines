import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectUrl = new URL("../", import.meta.url);
const readProjectFile = (path) => readFile(new URL(path, projectUrl), "utf8");

test("player HoloSuite access is a default-off GM world setting", async () => {
  const [constants, store, translations] = await Promise.all([
    readProjectFile("src/constants.ts"),
    readProjectFile("src/machine-store.ts"),
    readProjectFile("lang/en.json").then(JSON.parse)
  ]);

  assert.match(constants, /playerHoloSuiteAccess:\s*"playerHoloSuiteAccess"/);
  assert.match(store, /SETTINGS\.playerHoloSuiteAccess,[\s\S]*?scope:\s*"world"[\s\S]*?config:\s*true[\s\S]*?type:\s*Boolean[\s\S]*?default:\s*false[\s\S]*?restricted:\s*true/);
  assert.equal(
    translations["HOLOSUITEVENDING.Settings.PlayerHoloSuiteAccess.Name"],
    "Show Vending Machines in Player HoloSuite"
  );
});

test("HoloSuite registration follows the setting and refreshes live", async () => {
  const main = await readProjectFile("src/main.ts");

  assert.match(main, /function registerWithHoloSuite\(force = false\)/);
  assert.match(main, /registeredWithHoloSuite && !force/);
  assert.match(main, /playerVisible:\s*MachineStore\.getPlayerHoloSuiteAccess\(\)/);
  assert.match(main, /playerHoloSuiteAccessChanged[^\n]*registerWithHoloSuite\(true\)/);
});
