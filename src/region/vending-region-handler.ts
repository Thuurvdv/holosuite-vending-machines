import { MODULE_ID, MODULE_TITLE, SOCKET_NAME } from "../constants.js";
import { MachineStore } from "../machine-store.js";

const REGION_BEHAVIOR_TYPE = "executeScript";
const LEGACY_REGION_BEHAVIOR_TYPES = new Set(["holosuiteVending", `${MODULE_ID}.openMachine`]);
let regionSyncTimer: number | null = null;
let regionSyncInFlight: Promise<void> | null = null;
let regionSyncRequested = false;

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

function isResponsibleGM(): boolean {
  const gm = game.users?.find?.((user: any) => user.active && user.isGM);
  return Boolean(gm && gm.id === game.user?.id);
}

function behaviorNeedsUpdate(existing: any, behaviorData: any): boolean {
  const events = Array.from(existing?.system?.events ?? []).map(String);
  return existing?.name !== behaviorData.name
    || existing?.disabled !== false
    || events.length !== 1
    || events[0] !== "tokenEnter"
    || existing?.system?.source !== behaviorData["system.source"]
    || String(existing?.flags?.[MODULE_ID]?.machineId ?? "") !== behaviorData[`flags.${MODULE_ID}.machineId`];
}

function scheduleRegionSync(delay = 75): void {
  if (!isResponsibleGM()) return;
  if (regionSyncTimer !== null) window.clearTimeout(regionSyncTimer);
  regionSyncTimer = window.setTimeout(() => {
    regionSyncTimer = null;
    syncRegionVendingBehaviors();
  }, delay);
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

async function performRegionVendingBehaviorSync(): Promise<void> {
  const machines = MachineStore.getMachines();
  const machinesByRegion = new Map<string, any[]>();
  for (const machine of machines) {
    for (const linkedRegionId of machine.regionIds) {
      const regionId = String(linkedRegionId);
      const linkedMachines = machinesByRegion.get(regionId) ?? [];
      linkedMachines.push(machine);
      machinesByRegion.set(regionId, linkedMachines);
    }
  }

  for (const region of getSceneRegions()) {
    const regionId = String(region.id ?? "");
    const expectedMachines = machinesByRegion.get(regionId) ?? [];
    const expectedMachineIds = new Set(expectedMachines.map((machine) => machine.id));
    const staleBehaviorIds = getMachineBehaviors(region)
      .filter((behavior) => !expectedMachineIds.has(String(behavior.flags?.[MODULE_ID]?.machineId ?? "")))
      .map((behavior) => behavior.id);
    if (staleBehaviorIds.length) await region.deleteEmbeddedDocuments("RegionBehavior", staleBehaviorIds);

    const creates: any[] = [];
    const updates: any[] = [];
    for (const machine of expectedMachines) {
      const machineId = machine.id;
      const existing = getMachineBehavior(region, machineId);
      const behaviorData = {
        name: getBehaviorName(machine),
        disabled: false,
        "system.events": ["tokenEnter"],
        "system.source": getBehaviorSource(machineId),
        [`flags.${MODULE_ID}.machineId`]: machineId
      };
      if (existing && behaviorNeedsUpdate(existing, behaviorData)) {
        updates.push({ _id: existing.id, ...behaviorData });
      } else if (!existing) {
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

export async function syncRegionVendingBehaviors(): Promise<void> {
  if (!isResponsibleGM() || !canvas?.scene || !CONFIG.RegionBehavior?.dataModels?.[REGION_BEHAVIOR_TYPE]) return;
  if (regionSyncInFlight) {
    regionSyncRequested = true;
    return regionSyncInFlight;
  }

  const task = (async () => {
    do {
      regionSyncRequested = false;
      await performRegionVendingBehaviorSync();
    } while (regionSyncRequested);
  })();
  regionSyncInFlight = task;
  try {
    await task;
  } finally {
    if (regionSyncInFlight === task) regionSyncInFlight = null;
  }
}

export function registerRegionBehaviorType(): void {}

export function registerRegionIntegration(): void {
  registerRegionSocket();
  scheduleRegionSync(250);
  Hooks.on("canvasReady", () => scheduleRegionSync());
  Hooks.on(`${MODULE_ID}.machinesChanged`, (changes) => {
    if (changes?.regionStructureChanged !== false) scheduleRegionSync();
  });
  Hooks.on("createRegion", () => scheduleRegionSync());
  Hooks.on("deleteRegion", () => scheduleRegionSync());
}
