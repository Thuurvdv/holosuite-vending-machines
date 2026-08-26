import { TEMPLATES } from "./constants.js";
import { MachineStore } from "./machine-store.js";
import { getApplicationBase } from "./application-base.js";
import { findMachineRegionPresences } from "./region-access.mjs";

const BaseApplication = getApplicationBase();

function getActorForUser(): any {
  return canvas?.tokens?.controlled?.[0]?.actor ?? game.user.character ?? null;
}

function getSceneMachineLinks(actor): any[] {
  const links: any[] = [];
  const scene = canvas?.scene;
  const machines = MachineStore.getMachines();
  const regions = Array.from(scene?.regions?.contents ?? scene?.regions ?? []) as any[];
  const regionById = new Map(regions.map((region) => [String(region.id), region]));
  const tokenId = canvas?.tokens?.controlled?.[0]?.document?.id ?? "";
  const proximityMachines = game.user?.isGM
    ? []
    : machines.filter((machine) => machine.access?.requireProximity);
  const presenceByMachine = findMachineRegionPresences({ scene, machines: proximityMachines, actor, tokenId });

  for (const machine of machines) {
    const linkedRegion = machine.regionIds?.map?.((regionId) => regionById.get(String(regionId))).find(Boolean);
    if (!linkedRegion) continue;
    const requiresLivePresence = machine.access?.requireProximity && !game.user?.isGM;
    const presence = requiresLivePresence ? presenceByMachine.get(machine.id) : null;
    if (requiresLivePresence && !presence) continue;
    const region = presence?.region ?? linkedRegion;
    const presenceTokenId = presence?.token?.id ?? tokenId;
    if (!region) continue;
    const state = MachineStore.getMachineState(machine);
    links.push({
      regionId: region.id,
      tokenId: presenceTokenId,
      machineId: machine.id,
      name: machine.name,
      description: machine.description,
      image: MachineStore.getMachineDisplayImage(machine),
      inventoryCount: machine.inventory?.length ?? 0,
      availableProducts: machine.inventory?.filter((entry) => entry.stock > 0).length ?? 0,
      totalStock: machine.inventory?.reduce((total, entry) => total + entry.stock, 0) ?? 0,
      state,
      offline: state === "offline",
      linkLabel: `Region: ${region.name || region.id}`
    });
  }
  return links;
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
      machines: getSceneMachineLinks(actor),
      actorName: actor?.name ?? "",
      sceneName: canvas?.scene?.name ?? "Current Scene"
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find("[data-action='open-machine']").on("click", (event) => {
      const machineId = event.currentTarget.dataset.machineId;
      const regionId = event.currentTarget.dataset.regionId;
      const tokenId = event.currentTarget.dataset.tokenId ?? "";
      game.holosuiteVending.openMachine(machineId, getActorForUser(), {
        source: "region-browser",
        sceneId: canvas?.scene?.id ?? "",
        regionId,
        tokenId
      });
    });
  }
}
