import { MODULE_ID, MACHINE_FLAG } from "./constants.js";
import { MachineStore } from "./machine-store.js";
import { MachineBrowserApp } from "./machine-browser-app.js";
import { MachineManagerApp } from "./machine-manager-app.js";
import { VendingApp } from "./vending-app.js";
import { syncRegionVendingBehaviors } from "./region/vending-region-handler.js";

function resolveTileDocument(tile) {
  return tile?.document ?? tile;
}

function escapeHtml(value: unknown): string {
  if (foundry?.utils?.escapeHTML) return foundry.utils.escapeHTML(String(value ?? ""));
  const element = document.createElement("div");
  element.textContent = String(value ?? "");
  return element.innerHTML;
}

async function promptMachineAccess(machineId, options: any = {}) {
  const machine = MachineStore.getMachine(machineId);
  if (!machine) {
    ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoMachine"));
    return null;
  }
  const confirmed = await Dialog.wait({
    title: game.i18n.localize("HOLOSUITEVENDING.Region.PromptTitle"),
    content: `
      <form class="holosuite-vending-region-prompt">
        <p class="holosuite-vending-kicker">${game.i18n.localize("HOLOSUITEVENDING.Region.Kicker")}</p>
        <h3>${game.i18n.localize("HOLOSUITEVENDING.Region.PromptQuestion")}</h3>
        <strong>${escapeHtml(machine.name)}</strong>
      </form>
    `,
    buttons: {
      yes: { icon: '<i class="fa-solid fa-store"></i>', label: game.i18n.localize("HOLOSUITEVENDING.Common.Yes"), callback: () => true },
      no: { icon: '<i class="fa-solid fa-xmark"></i>', label: game.i18n.localize("HOLOSUITEVENDING.Common.No"), callback: () => false }
    },
    default: "yes",
    close: () => false
  }, { width: 430, classes: ["holosuite-vending-window", "holosuite-vending-region-dialog"] });
  if (!confirmed) return null;
  return game.holosuiteVending.openMachine(machineId, options.actor ?? null, options.context ?? {});
}

export function registerApi() {
  const api = {
    promptMachineAccess,

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

    openMachine(machineId, actor = null, context = {}) {
      const machine = MachineStore.getMachine(machineId);
      if (!machine) {
        ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoMachine"));
        return null;
      }

      const app = new VendingApp(machineId, { actor, context });
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
      if (machineId) {
        await document.setFlag(MODULE_ID, MACHINE_FLAG, machineId);
        const image = MachineStore.getMachineDisplayImage(machineId);
        if (image && document.update) await document.update({ "texture.src": image });
      } else {
        await document.unsetFlag(MODULE_ID, MACHINE_FLAG);
      }
      return true;
    },

    getMachines() {
      return foundry.utils.deepClone(MachineStore.getMachines());
    },

    getLedger() {
      return foundry.utils.deepClone(MachineStore.getLedger());
    },

    restockMachine(machineId) {
      if (!game.user.isGM) return false;
      return MachineStore.restockMachine(machineId);
    },

    exportMachines() {
      return foundry.utils.deepClone(MachineStore.exportData());
    },

    async syncRegionLinks() {
      if (!game.user.isGM) return false;
      await syncRegionVendingBehaviors();
      return true;
    }
  };

  game.holosuiteVending = api;
  const foundryModule = game.modules.get(MODULE_ID);
  if (foundryModule) foundryModule.api = api;
}
