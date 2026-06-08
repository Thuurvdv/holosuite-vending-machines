import { MODULE_ID, MACHINE_FLAG } from "./constants.js";
import { MachineStore } from "./machine-store.js";
import { MachineBrowserApp } from "./machine-browser-app.js";
import { MachineManagerApp } from "./machine-manager-app.js";
import { VendingApp } from "./vending-app.js";

function resolveTileDocument(tile) {
  return tile?.document ?? tile;
}

export function registerApi() {
  const api = {
    openManager() {
      if (!game.user.isGM) {
        ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.GMOnly"));
        return null;
      }

      const app = new MachineManagerApp();
      app.render(true);
      return app;
    },

    openSceneMachines() {
      const app = new MachineBrowserApp();
      app.render(true);
      return app;
    },

    openMachine(machineId, actor = null) {
      const machine = MachineStore.getMachine(machineId);
      if (!machine) {
        ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoMachine"));
        return null;
      }

      const app = new VendingApp(machineId, { actor });
      app.render(true);
      return app;
    },

    async attachMachineToTile(tile, machineId) {
      if (!game.user.isGM) {
        ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.GMOnly"));
        return false;
      }

      const document = resolveTileDocument(tile);
      if (!document?.setFlag) return false;
      if (machineId) await document.setFlag(MODULE_ID, MACHINE_FLAG, machineId);
      else await document.unsetFlag(MODULE_ID, MACHINE_FLAG);
      return true;
    },

    getMachines() {
      return foundry.utils.deepClone(MachineStore.getMachines());
    }
  };

  game.holosuiteVending = api;
  const foundryModule = game.modules.get(MODULE_ID);
  if (foundryModule) foundryModule.api = api;
}
