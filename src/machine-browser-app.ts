import { MODULE_ID, MACHINE_FLAG, TEMPLATES } from "./constants.js";
import { MachineStore } from "./machine-store.js";

function getActorForUser(): any {
  return canvas?.tokens?.controlled?.[0]?.actor ?? game.user.character ?? null;
}

function getSceneMachineTiles(): any[] {
  const tiles = canvas?.scene?.tiles?.contents ?? canvas?.scene?.tiles ?? [];
  return Array.from(tiles)
    .map((tile: any) => {
      const machineId = tile?.getFlag?.(MODULE_ID, MACHINE_FLAG);
      const machine = machineId ? MachineStore.getMachine(machineId) : null;
      if (!machine) return null;
      return {
        tileId: tile.id,
        machineId,
        name: machine.name,
        description: machine.description,
        image: machine.image,
        inventoryCount: machine.inventory?.length ?? 0
      };
    })
    .filter(Boolean);
}

export class MachineBrowserApp extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "holosuite-vending-browser",
      classes: ["holosuite-vending-window", "holosuite-vending-browser-app"],
      template: TEMPLATES.browser,
      width: 620,
      height: "auto",
      resizable: true,
      title: "Vending Access"
    });
  }

  async getData() {
    const actor = getActorForUser();
    return {
      machines: getSceneMachineTiles(),
      actorName: actor?.name ?? "",
      sceneName: canvas?.scene?.name ?? "Current Scene"
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find("[data-action='open-machine']").on("click", (event) => {
      const machineId = event.currentTarget.dataset.machineId;
      game.holosuiteVending.openMachine(machineId, getActorForUser());
    });
  }
}

