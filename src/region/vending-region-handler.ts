import { MODULE_ID, MODULE_TITLE, SOCKET_NAME } from "../constants.js";
import { MachineStore } from "../machine-store.js";

const REGION_BEHAVIOR_TYPE = "executeScript";
const LEGACY_REGION_BEHAVIOR_TYPES = new Set(["holosuiteVending", `${MODULE_ID}.openMachine`]);

function getSceneRegions(): any[] {
  return Array.from((canvas?.scene?.regions as any)?.contents ?? canvas?.scene?.regions ?? []) as any[];
}

function getMachineBehavior(region: any, machineId: string): any | null {
  return Array.from(region?.behaviors ?? []).find((behavior: any) => (
    behavior?.type === REGION_BEHAVIOR_TYPE
    && String(behavior?.flags?.[MODULE_ID]?.machineId ?? "") === machineId
  )) ?? null;
}

function getMachineBehaviors(region: any): any[] {
  return Array.from(region?.behaviors ?? []).filter((behavior: any) => (
    behavior?.flags?.[MODULE_ID]?.machineId || LEGACY_REGION_BEHAVIOR_TYPES.has(behavior?.type)
  ));
}

function getMachineIdsForRegion(regionId: string): string[] {
  return MachineStore.getMachines()
    .filter((machine) => machine.regionIds.includes(regionId))
    .map((machine) => machine.id);
}

function getBehaviorName(machine): string {
  return `${MODULE_TITLE}: ${machine.name}`;
}

function getBehaviorSource(machineId: string): string {
  return [
    "const userId = event.user?.id;",
    "if (!userId) return;",
    `game.socket.emit("${SOCKET_NAME}", {`,
    "  action: \"openVendingFromRegion\",",
    `  machineId: ${JSON.stringify(machineId)},`,
    "  userId,",
    "  sceneId: scene?.id,",
    "  regionId: region?.id,",
    "  behaviorId: behavior?.id,",
    "  tokenId: event.data?.token?.id",
    "});",
    "if (game.user?.id === userId && !game.user?.isGM) {",
    `  await game.holosuiteVending?.promptMachineAccess?.(${JSON.stringify(machineId)}, {`,
    "    actor: event.data?.token?.actor,",
    "    context: { source: \"region-behavior\", sceneId: scene?.id, regionId: region?.id, behaviorId: behavior?.id, tokenId: event.data?.token?.id }",
    "  });",
    "}"
  ].join("\n");
}

function resolveRegionActor(message: any): any | null {
  const scene = game.scenes?.get?.(message.sceneId) ?? canvas?.scene;
  const token = scene?.tokens?.get?.(message.tokenId)
    ?? Array.from(scene?.tokens?.contents ?? scene?.tokens ?? []).find((candidate: any) => candidate?.id === message.tokenId);
  return token?.actor ?? null;
}

function registerRegionSocket(): void {
  game.socket?.on?.(SOCKET_NAME, async (message: any) => {
    if (message?.action !== "openVendingFromRegion") return;
    if (message.userId !== game.user?.id || game.user?.isGM) return;
    await game.holosuiteVending?.promptMachineAccess?.(String(message.machineId || ""), {
      actor: resolveRegionActor(message),
      context: {
        source: "region-socket",
        sceneId: message.sceneId,
        regionId: message.regionId,
        behaviorId: message.behaviorId,
        tokenId: message.tokenId
      }
    });
  });
}

export async function syncRegionVendingBehaviors(): Promise<void> {
  if (!game.user?.isGM || !canvas?.scene || !CONFIG.RegionBehavior?.dataModels?.[REGION_BEHAVIOR_TYPE]) return;

  const machines = MachineStore.getMachines();
  for (const region of getSceneRegions()) {
    const regionId = String(region.id ?? "");
    const expectedMachineIds = new Set(getMachineIdsForRegion(regionId));
    const staleBehaviorIds = getMachineBehaviors(region)
      .filter((behavior) => !expectedMachineIds.has(String(behavior.flags?.[MODULE_ID]?.machineId ?? "")))
      .map((behavior) => behavior.id);
    if (staleBehaviorIds.length) await region.deleteEmbeddedDocuments("RegionBehavior", staleBehaviorIds);

    const creates: any[] = [];
    const updates: any[] = [];
    for (const machineId of expectedMachineIds) {
      const machine = machines.find((candidate) => candidate.id === machineId);
      if (!machine) continue;
      const existing = getMachineBehavior(region, machineId);
      const behaviorData = {
        name: getBehaviorName(machine),
        disabled: false,
        "system.events": ["tokenEnter"],
        "system.source": getBehaviorSource(machineId),
        [`flags.${MODULE_ID}.machineId`]: machineId
      };
      if (existing) updates.push({ _id: existing.id, ...behaviorData });
      else {
        creates.push({
          name: getBehaviorName(machine),
          type: REGION_BEHAVIOR_TYPE,
          disabled: false,
          system: { events: ["tokenEnter"], source: getBehaviorSource(machineId) },
          flags: { [MODULE_ID]: { machineId } }
        });
      }
    }

    if (updates.length) await region.updateEmbeddedDocuments("RegionBehavior", updates);
    if (creates.length) await region.createEmbeddedDocuments("RegionBehavior", creates);
  }
}

export function registerRegionBehaviorType(): void {}

export function registerRegionIntegration(): void {
  registerRegionSocket();
  window.setTimeout(() => syncRegionVendingBehaviors(), 250);
  Hooks.on("canvasReady", () => syncRegionVendingBehaviors());
  Hooks.on(`${MODULE_ID}.machinesChanged`, () => syncRegionVendingBehaviors());
  Hooks.on("createRegion", () => syncRegionVendingBehaviors());
  Hooks.on("deleteRegion", () => syncRegionVendingBehaviors());
}
