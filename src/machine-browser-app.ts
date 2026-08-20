import { MODULE_ID, MACHINE_FLAG, TEMPLATES } from "./constants.js";
import { MachineStore } from "./machine-store.js";
import { getApplicationBase } from "./application-base.js";

const BaseApplication = getApplicationBase();

function getActorForUser(): any {
  return canvas?.tokens?.controlled?.[0]?.actor ?? game.user.character ?? null;
}

function getSceneMachineLinks(): any[] {
  const links: any[] = [];
  const linkedMachineIds = new Set<string>();
  const regions = Array.from(canvas?.scene?.regions?.contents ?? canvas?.scene?.regions ?? []) as any[];
  for (const machine of MachineStore.getMachines()) {
    const region = regions.find((candidate) => machine.regionIds?.includes?.(String(candidate.id)));
    if (!region) continue;
    linkedMachineIds.add(machine.id);
    links.push({
      regionId: region.id,
      machineId: machine.id,
      name: machine.name,
      description: machine.description,
      image: MachineStore.getMachineDisplayImage(machine),
      inventoryCount: machine.inventory?.length ?? 0,
      availableProducts: machine.inventory?.filter((entry) => entry.stock > 0).length ?? 0,
      totalStock: machine.inventory?.reduce((total, entry) => total + entry.stock, 0) ?? 0,
      state: MachineStore.getMachineState(machine),
      offline: MachineStore.getMachineState(machine) === "offline",
      linkLabel: `Region: ${region.name || region.id}`
    });
  }

  // Keep old tile-linked worlds usable while Region links replace tile placement.
  const tiles = canvas?.scene?.tiles?.contents ?? canvas?.scene?.tiles ?? [];
  const legacyLinks = Array.from(tiles)
    .map((tile: any) => {
      const machineId = tile?.getFlag?.(MODULE_ID, MACHINE_FLAG);
      const machine = machineId ? MachineStore.getMachine(machineId) : null;
      if (!machine || linkedMachineIds.has(machineId)) return null;
      return {
        tileId: tile.id,
        machineId,
        name: machine.name,
        description: machine.description,
        image: MachineStore.getMachineDisplayImage(machine),
        inventoryCount: machine.inventory?.length ?? 0,
        availableProducts: machine.inventory?.filter((entry) => entry.stock > 0).length ?? 0,
        totalStock: machine.inventory?.reduce((total, entry) => total + entry.stock, 0) ?? 0,
        state: MachineStore.getMachineState(machine),
        offline: MachineStore.getMachineState(machine) === "offline",
        linkLabel: "Legacy Tile"
      };
    })
    .filter(Boolean);
  return [...links, ...legacyLinks];
}

export class MachineBrowserApp extends BaseApplication {
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
      machines: getSceneMachineLinks(),
      actorName: actor?.name ?? "",
      sceneName: canvas?.scene?.name ?? "Current Scene"
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find("[data-action='open-machine']").on("click", (event) => {
      const machineId = event.currentTarget.dataset.machineId;
      const tileId = event.currentTarget.dataset.tileId;
      const regionId = event.currentTarget.dataset.regionId;
      const tokenId = canvas?.tokens?.controlled?.[0]?.document?.id ?? "";
      game.holosuiteVending.openMachine(machineId, getActorForUser(), {
        source: regionId ? "region-browser" : "legacy-tile-browser",
        sceneId: canvas?.scene?.id ?? "",
        tileId,
        regionId,
        tokenId
      });
    });
  }
}
