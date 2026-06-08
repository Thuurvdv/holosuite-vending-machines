import { MODULE_ID, MACHINE_FLAG } from "./constants.js";
import { MachineStore } from "./machine-store.js";

let pendingPlacement: { machineId: string } | null = null;
let placementClickHandler: any = null;

function getMachineId(tileOrDocument) {
  const document = tileOrDocument?.document ?? tileOrDocument;
  return document?.getFlag?.(MODULE_ID, MACHINE_FLAG) ?? "";
}

function escapeHtml(value: unknown): string {
  if (foundry?.utils?.escapeHTML) return foundry.utils.escapeHTML(String(value ?? ""));
  const div = document.createElement("div");
  div.textContent = String(value ?? "");
  return div.innerHTML;
}

async function configureTile(tileDocument) {
  if (!game.user.isGM) return;
  const machines = MachineStore.getMachines();
  const current = getMachineId(tileDocument);
  const options = machines.map((machine) => {
    const selected = machine.id === current ? "selected" : "";
    return `<option value="${machine.id}" ${selected}>${escapeHtml(machine.name)}</option>`;
  }).join("");

  const content = `
    <form class="holosuite-vending-tile-dialog">
      <div class="form-group">
        <label>Vending Machine</label>
        <select name="machineId">
          <option value="">None</option>
          ${options}
        </select>
      </div>
    </form>
  `;

  await Dialog.wait({
    title: current ? "Configure Vending Machine" : "Attach Vending Machine",
    content,
    buttons: {
      attach: {
        label: "Save",
        callback: async (html) => {
          const machineId = html.find("[name='machineId']").val();
          await game.holosuiteVending.attachMachineToTile(tileDocument, machineId);
        }
      },
      detach: {
        label: "Detach",
        callback: async () => game.holosuiteVending.attachMachineToTile(tileDocument, "")
      },
      cancel: {
        label: "Cancel"
      }
    },
    default: "attach"
  });
}

function getTokenCenter(tokenDocument: any): { x: number; y: number } {
  const gridSize = canvas?.grid?.size ?? 100;
  const width = Number(tokenDocument?.width ?? 1) * gridSize;
  const height = Number(tokenDocument?.height ?? 1) * gridSize;
  return {
    x: Number(tokenDocument?.x ?? 0) + width / 2,
    y: Number(tokenDocument?.y ?? 0) + height / 2
  };
}

function getCanvasCenter(): { x: number; y: number } {
  const dimensions = canvas?.dimensions;
  if (!dimensions) return { x: 0, y: 0 };
  return {
    x: Number(dimensions.sceneX ?? 0) + Number(dimensions.sceneWidth ?? dimensions.width ?? 0) / 2,
    y: Number(dimensions.sceneY ?? 0) + Number(dimensions.sceneHeight ?? dimensions.height ?? 0) / 2
  };
}

function snapPoint(point: { x: number; y: number }): { x: number; y: number } {
  try {
    const snapped = canvas?.grid?.getSnappedPoint?.(point, { mode: CONST.GRID_SNAPPING_MODES.CENTER });
    if (snapped) return snapped;
  } catch {
    // Older Foundry versions have different grid snapping signatures.
  }

  const gridSize = canvas?.grid?.size ?? 100;
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize
  };
}

async function createMachineTileAtPoint(point: { x: number; y: number }, machineId: string): Promise<any | null> {
  if (!game.user.isGM) return null;
  const machine = MachineStore.getMachine(machineId);
  const scene = canvas?.scene;
  if (!machine || !scene) return null;

  const gridSize = canvas?.grid?.size ?? 100;
  const width = gridSize * 2;
  const height = gridSize * 2;
  const center = snapPoint(point);
  const tileData = {
    x: Math.round(center.x - width / 2),
    y: Math.round(center.y - height / 2),
    width,
    height,
    hidden: false,
    locked: false,
    texture: { src: machine.image || "icons/environment/settlement/stall.webp" },
    flags: {
      [MODULE_ID]: {
        [MACHINE_FLAG]: machine.id
      }
    }
  };

  const created = await scene.createEmbeddedDocuments("Tile", [tileData]);
  ui.notifications.info(`Added vending machine tile: ${machine.name}`);
  return created?.[0] ?? null;
}

export async function createMachineTileNearSelectedToken(machineId: string): Promise<any | null> {
  const tokenDocument = canvas?.tokens?.controlled?.[0]?.document;
  const point = tokenDocument ? getTokenCenter(tokenDocument) : getCanvasCenter();
  return createMachineTileAtPoint(point, machineId);
}

function stopMachinePlacement(): void {
  if (placementClickHandler && canvas?.stage?.off) {
    canvas.stage.off("pointerdown", placementClickHandler);
  }
  placementClickHandler = null;
  pendingPlacement = null;
  document.body.classList.remove("holosuite-vending-placement-active");
}

export function beginMachinePlacement(machineId: string): void {
  if (!game.user.isGM) return;
  const machine = MachineStore.getMachine(machineId);
  if (!machine) {
    ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoMachine"));
    return;
  }
  if (!canvas?.stage?.on) {
    ui.notifications.warn("Canvas placement is not available right now.");
    return;
  }

  stopMachinePlacement();
  pendingPlacement = { machineId };
  document.body.classList.add("holosuite-vending-placement-active");
  ui.notifications.info(`Click the scene to place ${machine.name}. Press Escape to cancel.`);

  placementClickHandler = async (event) => {
    if (!pendingPlacement) return;
    const original = event.data?.originalEvent;
    if (original?.button && original.button !== 0) return;
    const point = event.data?.getLocalPosition?.(canvas.stage) ?? canvas?.canvasCoordinatesFromClient?.({
      x: original?.clientX,
      y: original?.clientY
    }) ?? getCanvasCenter();
    const machineIdToPlace = pendingPlacement.machineId;
    stopMachinePlacement();
    await createMachineTileAtPoint(point, machineIdToPlace);
  };

  canvas.stage.on("pointerdown", placementClickHandler);
}

export async function openAddMachineDialog(): Promise<void> {
  if (!game.user.isGM) return;
  const machines = MachineStore.getMachines();
  if (!machines.length) {
    ui.notifications.warn("Create a vending machine in HoloSuite before placing one.");
    game.holosuiteVending?.openManager?.();
    return;
  }

  const options = machines.map((machine) => {
    return `<option value="${machine.id}">${escapeHtml(machine.name)}</option>`;
  }).join("");

  await Dialog.wait({
    title: "Add Vending Machine",
    content: `
      <form class="holosuite-vending-tile-dialog">
        <div class="form-group">
          <label>Machine Type</label>
          <select name="machineId">${options}</select>
        </div>
      </form>
    `,
    buttons: {
      place: {
        label: "Click to Place",
        callback: async (html) => {
          const machineId = html.find("[name='machineId']").val();
          beginMachinePlacement(machineId);
        }
      },
      selected: {
        label: "At Selected Token",
        callback: async (html) => {
          const machineId = html.find("[name='machineId']").val();
          await createMachineTileNearSelectedToken(machineId);
        }
      },
      manage: {
        label: "Manage Machines",
        callback: () => game.holosuiteVending?.openManager?.()
      },
      cancel: {
        label: "Cancel"
      }
    },
    default: "place"
  });
}

export function registerTileIntegration() {
  Hooks.on("getSceneControlButtons", (controls) => {
    if (!game.user.isGM) return;
    const tool = {
      name: "holosuite-vending-place",
      title: "Add Vending Machine",
      icon: "fa-solid fa-store",
      button: true,
      visible: true,
      onClick: () => openAddMachineDialog(),
      onChange: () => openAddMachineDialog()
    };

    if (Array.isArray(controls)) {
      const tileControls = controls.find((control) => control.name === "tiles" || control.name === "tile")
        ?? controls.find((control) => control.name === "token")
        ?? controls[0];
      if (tileControls?.tools && !tileControls.tools.some?.((candidate) => candidate.name === tool.name)) {
        tileControls.tools.push(tool);
      }
      return;
    }

    const record = controls as Record<string, any>;
    const tileControls = record?.tiles ?? record?.tile ?? record?.tokens ?? record?.token ?? Object.values(record ?? {})[0];
    if (!tileControls?.tools || tileControls.tools[tool.name]) return;
    tileControls.tools[tool.name] = { ...tool, order: Object.keys(tileControls.tools).length };
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && pendingPlacement) stopMachinePlacement();
  });

  Hooks.on("canvasReady", () => {
    stopMachinePlacement();
  });
}
