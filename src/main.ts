import type { HoloSuiteAppRegistration } from "../../shared/src/index";
import { MODULE_ID } from "./constants.js";
import { registerApi } from "./api.js";
import { MachineStore } from "./machine-store.js";
import { MachineManagerApp } from "./machine-manager-app.js";
import { PurchaseService } from "./purchase-service.js";
import { registerTileIntegration } from "./tile-integration.js";
import { VendingApp } from "./vending-app.js";

function registerWithHoloSuite(): boolean {
  const holosuite = game.modules.get("holosuite-core");
  const api = holosuite?.active ? holosuite.api : null;
  if (!api?.registerApp) return false;

  const registration: HoloSuiteAppRegistration = {
    id: MODULE_ID,
    title: "Vending Machines",
    icon: "fa-solid fa-store",
    premium: false,
    playerVisible: true,
    description: "Create, stock, and place HoloSuite vending machines.",
    open: () => game.user?.isGM
      ? game.holosuiteVending?.openManager?.()
      : game.holosuiteVending?.openSceneMachines?.()
  };

  api.registerApp(registration);
  return true;
}

Hooks.once("init", () => {
  // Foundry settings provide the module's world persistence and GM-facing configuration entry.
  MachineStore.registerSettings();

  game.settings.registerMenu(MODULE_ID, "machineManager", {
    name: game.i18n.localize("HOLOSUITEVENDING.Settings.Manager.Name"),
    label: game.i18n.localize("HOLOSUITEVENDING.Settings.Manager.Label"),
    hint: "Create and configure HoloSuite vending machines.",
    icon: "fas fa-store",
    type: MachineManagerApp,
    restricted: true
  });
});

Hooks.once("ready", () => {
  // Ready-time wiring depends on initialized users, sockets, canvas hooks, and public game APIs.
  registerApi();
  registerWithHoloSuite();
  PurchaseService.registerSocket();
  registerTileIntegration();
  Hooks.on(`${MODULE_ID}.machinesChanged`, () => VendingApp.refreshAll());
  console.log(`${MODULE_ID} | Ready`);
});
