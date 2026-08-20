import { MODULE_ID } from "./constants.js";
import { registerApi } from "./api.js";
import { MachineStore } from "./machine-store.js";
import { MachineManagerApp } from "./machine-manager-app.js";
import { PurchaseService } from "./purchase-service.js";
import { registerRegionBehaviorType, registerRegionIntegration } from "./region/vending-region-handler.js";
import { VendingApp } from "./vending-app.js";

interface HoloSuiteAppRegistration {
  id: string;
  title: string;
  icon: string;
  premium?: boolean;
  playerVisible?: boolean;
  description?: string;
  open: () => unknown | Promise<unknown>;
}

let registeredWithHoloSuite = false;

function getHoloSuiteApi(): any {
  const holosuite = game.modules.get("holosuite-core");
  return (holosuite?.active ? holosuite.api : null)
    ?? game.holosuite
    ?? (globalThis as any).HoloSuiteCoreApi
    ?? null;
}

function registerWithHoloSuite(): boolean {
  if (registeredWithHoloSuite) return true;
  const api = getHoloSuiteApi();
  if (!api?.registerApp) return false;

  const registration: HoloSuiteAppRegistration = {
    id: MODULE_ID,
    title: "Vending Machines",
    icon: "fa-solid fa-store",
    premium: false,
    playerVisible: true,
    description: "Create, stock, and link HoloSuite vending machines to Regions.",
    open: () => game.user?.isGM
      ? game.holosuiteVending?.openManager?.()
      : game.holosuiteVending?.openSceneMachines?.()
  };

  api.registerApp(registration);
  registeredWithHoloSuite = true;
  return true;
}

function registerWithHoloSuiteWhenReady(): void {
  if (registerWithHoloSuite()) return;

  let attempts = 0;
  const retry = () => {
    attempts += 1;
    if (registerWithHoloSuite() || attempts >= 20) return;
    window.setTimeout(retry, 250);
  };

  Hooks.once("holosuite-core.apiReady", () => registerWithHoloSuite());
  window.setTimeout(retry, 250);
}

Hooks.once("init", () => {
  registerRegionBehaviorType();
  // Foundry settings provide the module's world persistence and GM-facing configuration entry.
  MachineStore.registerSettings();

  game.settings.registerMenu(MODULE_ID, "machineManager", {
    name: game.i18n.localize("HOLOSUITEVENDING.Settings.Manager.Name"),
    label: game.i18n.localize("HOLOSUITEVENDING.Settings.Manager.Label"),
    hint: "Create, configure, and link HoloSuite vending machines to scene Regions.",
    icon: "fas fa-store",
    type: MachineManagerApp,
    restricted: true
  });
});

Hooks.once("ready", () => {
  // Ready-time wiring depends on initialized users, sockets, canvas hooks, and public game APIs.
  registerApi();
  registerWithHoloSuiteWhenReady();
  PurchaseService.registerSocket();
  PurchaseService.resumePendingDispenses();
  registerRegionIntegration();
  Hooks.on(`${MODULE_ID}.machinesChanged`, () => VendingApp.refreshAll());
  Hooks.on(`${MODULE_ID}.currencyChanged`, () => VendingApp.refreshAll());
  Hooks.on(`${MODULE_ID}.purchaseResult`, (payload) => VendingApp.handlePurchaseResult(payload));
  Hooks.on(`${MODULE_ID}.collectionResult`, (payload) => VendingApp.handleCollectionResult(payload));
  Hooks.on("updateUser", () => PurchaseService.resumePendingDispenses());
  console.log(`${MODULE_ID} | Ready`);
});
