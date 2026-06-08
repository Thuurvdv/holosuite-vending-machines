import { MODULE_ID, TEMPLATES } from "./constants.js";
import { MachineStore } from "./machine-store.js";
import { beginMachinePlacement, createMachineTileNearSelectedToken } from "./tile-integration.js";

function readForm(form: HTMLFormElement): any {
  const data: any = {
    machine: {},
    entries: {}
  };

  for (const [name, value] of new FormData(form).entries()) {
    const field = String(name);
    const stringValue = String(value ?? "");
    if (field.startsWith("machine.")) {
      data.machine[field.slice("machine.".length)] = stringValue;
      continue;
    }

    const match = field.match(/^entries\.([^.]+)\.([^.]+)$/);
    if (!match) continue;
    const [, entryId, key] = match;
    data.entries[entryId] ??= {};
    data.entries[entryId][key] = stringValue;
  }

  return data;
}

function asNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

async function itemDataFromDrop(event) {
  const raw = event.dataTransfer?.getData("text/plain");
  if (!raw) return null;

  const data = JSON.parse(raw);
  const document = await Item.fromDropData(data);
  if (!document) return null;
  const embeddedData = document.toObject();
  return MachineStore.createEntry({
    itemUuid: document.uuid ?? data.uuid ?? "",
    embeddedData,
    displayName: document.name,
    image: document.img,
    description: embeddedData.system?.description?.value || "",
    price: 0,
    stock: 1,
    maxStock: 1
  });
}

export class MachineManagerApp extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "holosuite-vending-manager",
      classes: ["holosuite-vending-window", "holosuite-vending-manager-app"],
      template: TEMPLATES.manager,
      width: 880,
      height: 720,
      resizable: true,
      title: "HoloSuite Vending Machines"
    });
  }

  async getData() {
    return {
      machines: MachineStore.getMachines(),
      currencyName: MachineStore.getCurrencyName()
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find("[data-action='create-machine']").on("click", async () => {
      const machine = await MachineStore.upsertMachine(MachineStore.createMachine());
      new MachineEditApp(machine.id).render(true);
    });

    html.find("[data-action='edit-machine']").on("click", (event) => {
      new MachineEditApp(event.currentTarget.dataset.machineId).render(true);
    });

    html.find("[data-action='place-machine']").on("click", (event) => {
      beginMachinePlacement(event.currentTarget.dataset.machineId);
    });

    html.find("[data-action='place-machine-selected']").on("click", async (event) => {
      await createMachineTileNearSelectedToken(event.currentTarget.dataset.machineId);
    });

    html.find("[data-action='delete-machine']").on("click", async (event) => {
      const machineId = event.currentTarget.dataset.machineId;
      const confirmed = await Dialog.confirm({
        title: "Delete Vending Machine",
        content: "<p>Delete this vending machine? Tile attachments will no longer open a machine.</p>"
      });
      if (confirmed) await MachineStore.deleteMachine(machineId);
      this.render(false);
    });
  }
}

export class MachineEditApp extends Application {
  machineId: string;

  constructor(machineId: string, options: any = {}) {
    super(options);
    this.machineId = machineId;
    (this as any).options.id = `holosuite-vending-editor-${machineId}`;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "holosuite-vending-editor",
      classes: ["holosuite-vending-window", "holosuite-vending-editor-app"],
      template: TEMPLATES.editor,
      width: 940,
      height: 760,
      resizable: true,
      title: "Edit Vending Machine"
    });
  }

  get title() {
    return MachineStore.getMachine(this.machineId)?.name ?? "Edit Vending Machine";
  }

  async getData() {
    return {
      machine: MachineStore.getMachine(this.machineId),
      currencyName: MachineStore.getCurrencyName()
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find("form").on("submit", async (event) => {
      event.preventDefault();
      event.stopPropagation();
    });

    html.find("[data-action='save-machine']").on("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const form = event.currentTarget.closest("form");
      if (!form) return;
      try {
        await this.save(form);
        ui.notifications.info("Vending machine saved.");
      } catch (error) {
        console.error(`${MODULE_ID} | Failed to save vending machine`, error);
        ui.notifications.error("Could not save vending machine. Check the console for details.");
      }
    });

    html.find("[data-action='browse-machine-image']").on("click", (event) => {
      event.preventDefault();
      const input = event.currentTarget.closest(".holosuite-vending-path-row")?.querySelector("[name='machine.image']");
      if (!input || typeof FilePicker === "undefined") {
        ui.notifications.warn("Foundry FilePicker is not available.");
        return;
      }

      new FilePicker({
        type: "image",
        current: input.value,
        callback: (path) => {
          input.value = path;
        }
      }).browse();
    });

    html.find("[data-action='add-entry']").on("click", async () => {
      const machine = MachineStore.getMachine(this.machineId);
      machine.inventory.push(MachineStore.createEntry());
      await MachineStore.upsertMachine(machine);
      this.render(false);
    });

    html.find("[data-action='remove-entry']").on("click", async (event) => {
      const machine = MachineStore.getMachine(this.machineId);
      machine.inventory = machine.inventory.filter((entry) => entry.id !== event.currentTarget.dataset.entryId);
      await MachineStore.upsertMachine(machine);
      this.render(false);
    });

    html.find(".holosuite-vending-drop-zone").on("dragover", (event) => event.preventDefault());
    html.find(".holosuite-vending-drop-zone").on("drop", async (event) => {
      event.preventDefault();
      try {
        const entry = await itemDataFromDrop(event.originalEvent);
        if (!entry) return;
        const machine = MachineStore.getMachine(this.machineId);
        machine.inventory.push(entry);
        await MachineStore.upsertMachine(machine);
        this.render(false);
      } catch (error) {
        console.warn(`${MODULE_ID} | Item drop failed`, error);
        ui.notifications.warn("Could not add that item to the vending machine.");
      }
    });
  }

  async save(form) {
    const formData = readForm(form);
    const source = MachineStore.getMachine(this.machineId) ?? MachineStore.createMachine({ id: this.machineId });
    const machine = {
      ...source,
      name: formData.machine?.name || source.name,
      description: formData.machine?.description || "",
      image: formData.machine?.image || "",
      inventory: source.inventory.map((entry) => {
        const updates = formData.entries?.[entry.id] ?? {};
        return MachineStore.createEntry({
          ...entry,
          displayName: updates.displayName || entry.displayName,
          image: updates.image || entry.image,
          itemUuid: updates.itemUuid || entry.itemUuid,
          price: asNumber(updates.price, entry.price),
          stock: asNumber(updates.stock, entry.stock),
          maxStock: asNumber(updates.maxStock, entry.maxStock),
          description: updates.description ?? entry.description
        });
      })
    };

    machine.id = this.machineId;
    await MachineStore.upsertMachine(machine);
  }
}
