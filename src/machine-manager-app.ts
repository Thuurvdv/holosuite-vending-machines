import { MACHINE_STYLES, MAX_MACHINE_PRODUCTS, MODULE_ID, TEMPLATES } from "./constants.js";
import { MachineStore } from "./machine-store.js";
import { getApplicationBase, getSettingsMenuApplicationBase } from "./application-base.js";
import { VendingApp } from "./vending-app.js";
import { formatCurrencyAmount } from "./vending-domain.mjs";

const BaseApplication = getApplicationBase();
const SettingsMenuApplication = getSettingsMenuApplicationBase();

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

function downloadJson(data, filename) {
  const json = JSON.stringify(data, null, 2);
  const saveDataToFile = (globalThis as any).saveDataToFile;
  if (typeof saveDataToFile === "function") {
    saveDataToFile(json, "application/json", filename);
    return;
  }
  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function chooseJsonFile() {
  return new Promise<any>((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.addEventListener("change", async () => {
      try {
        const file = input.files?.[0];
        if (!file) return resolve(null);
        resolve(JSON.parse(await file.text()));
      } catch (error) {
        reject(error);
      }
    }, { once: true });
    input.click();
  });
}

function getSceneRegionOptions(selectedIds: string[] = []) {
  const selected = new Set(selectedIds);
  return Array.from((canvas?.scene?.regions as any)?.contents ?? canvas?.scene?.regions ?? [])
    .map((region: any) => ({
      id: String(region.id ?? ""),
      name: String(region.name || region.id || "Unnamed Region"),
      selected: selected.has(String(region.id ?? ""))
    }))
    .filter((region) => region.id);
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

export class MachineManagerApp extends SettingsMenuApplication {
  machineChangeHook: any;

  constructor(options: any = {}) {
    super(options);
    this.machineChangeHook = Hooks.on(`${MODULE_ID}.machinesChanged`, () => this.render(false));
  }

  async close(options: any = {}) {
    if (this.machineChangeHook !== undefined) Hooks.off(`${MODULE_ID}.machinesChanged`, this.machineChangeHook);
    return super.close(options);
  }

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
    const ledger = MachineStore.getLedger().entries.slice(-25).reverse().map((entry) => ({
      ...entry,
      totalPriceDisplay: formatCurrencyAmount(entry.totalPrice),
      timeLabel: new Date(entry.timestamp).toLocaleString(),
      failed: entry.status === "failed"
    }));
    return {
      machines: MachineStore.getMachines().map((machine) => ({
        ...machine,
        state: MachineStore.getMachineState(machine),
        stateLabel: MachineStore.getMachineState(machine) === "sold-out"
          ? "Sold Out"
          : MachineStore.getMachineState(machine) === "offline" ? "Offline" : "Online",
        online: machine.status !== "offline",
        toggleLabel: machine.status === "offline" ? "Bring Online" : "Take Offline",
        styleLabel: MACHINE_STYLES.find((style) => style.id === machine.styleId)?.label ?? "Industrial Chassis",
        regionCount: machine.regionIds.length,
        totalStock: machine.inventory.reduce((total, entry) => total + entry.stock, 0),
        totalCapacity: machine.inventory.reduce((total, entry) => total + entry.maxStock, 0)
      })),
      currencyName: MachineStore.getCurrencyName(),
      currencySourceLabel: MachineStore.getCurrencySourceLabel(),
      creditTransformer: MachineStore.getCreditTransformer(),
      ledger,
      hasLedger: ledger.length > 0
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find("[name='creditTransformer']").on("change", async (event) => {
      await MachineStore.setCreditTransformer(event.currentTarget.checked);
      this.render(false);
    });

    html.find("[data-action='open-machine']").on("click", (event) => {
      const machineId = event.currentTarget.dataset.machineId;
      const token = canvas?.tokens?.controlled?.[0] ?? null;
      const actor = token?.actor ?? game.user?.character ?? null;
      if (!actor) {
        ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.SelectTestActor"));
        return;
      }
      new VendingApp(machineId, {
        actor,
        context: {
          source: "gm-test",
          sceneId: canvas?.scene?.id ?? "",
          tokenId: token?.document?.id ?? token?.id ?? ""
        }
      }).render(true);
    });

    html.find("[data-action='create-machine']").on("click", () => {
      const machine = MachineStore.createMachine();
      new MachineEditApp(machine.id, { draft: machine, isNew: true }).render(true);
    });

    html.find("[data-action='duplicate-machine']").on("click", async (event) => {
      const source = MachineStore.getMachine(event.currentTarget.dataset.machineId);
      if (!source) return;
      const duplicate = foundry.utils.deepClone(source);
      delete duplicate.id;
      duplicate.name = `${source.name} Copy`;
      const machine = await MachineStore.upsertMachine(MachineStore.createMachine(duplicate));
      this.render(false);
      new MachineEditApp(machine.id).render(true);
    });

    html.find("[data-action='toggle-machine']").on("click", async (event) => {
      const machine = MachineStore.getMachine(event.currentTarget.dataset.machineId);
      if (!machine) return;
      machine.status = machine.status === "offline" ? "online" : "offline";
      await MachineStore.upsertMachine(machine);
      this.render(false);
    });

    html.find("[data-action='restock-machine']").on("click", async (event) => {
      await MachineStore.restockMachine(event.currentTarget.dataset.machineId);
      ui.notifications.info(game.i18n.localize("HOLOSUITEVENDING.Notifications.Restocked"));
      this.render(false);
    });

    html.find("[data-action='restock-all']").on("click", async () => {
      const confirmed = await Dialog.confirm({
        title: game.i18n.localize("HOLOSUITEVENDING.Manager.RestockAllTitle"),
        content: `<p>${game.i18n.localize("HOLOSUITEVENDING.Manager.RestockAllConfirm")}</p>`
      });
      if (!confirmed) return;
      await MachineStore.restockAll();
      ui.notifications.info(game.i18n.localize("HOLOSUITEVENDING.Notifications.RestockedAll"));
      this.render(false);
    });

    html.find("[data-action='export-machines']").on("click", () => {
      downloadJson(MachineStore.exportData(), "holosuite-vending-machines.json");
    });

    html.find("[data-action='import-machines']").on("click", async () => {
      try {
        const payload = await chooseJsonFile();
        if (!payload) return;
        const count = await MachineStore.importData(payload);
        ui.notifications.info(game.i18n.format("HOLOSUITEVENDING.Notifications.Imported", { count }));
        this.render(false);
      } catch (error) {
        console.error(`${MODULE_ID} | Import failed`, error);
        ui.notifications.error(error?.message || game.i18n.localize("HOLOSUITEVENDING.Notifications.ImportFailed"));
      }
    });

    html.find("[data-action='export-ledger']").on("click", () => {
      downloadJson(MachineStore.getLedger(), "holosuite-vending-ledger.json");
    });

    html.find("[data-action='clear-ledger']").on("click", async () => {
      const confirmed = await Dialog.confirm({
        title: game.i18n.localize("HOLOSUITEVENDING.Ledger.Clear"),
        content: `<p>${game.i18n.localize("HOLOSUITEVENDING.Ledger.ClearConfirm")}</p>`
      });
      if (!confirmed) return;
      await MachineStore.clearLedger();
      this.render(false);
    });

    html.find("[data-action='edit-machine']").on("click", (event) => {
      new MachineEditApp(event.currentTarget.dataset.machineId).render(true);
    });

    html.find("[data-action='delete-machine']").on("click", async (event) => {
      const machineId = event.currentTarget.dataset.machineId;
      const confirmed = await Dialog.confirm({
        title: "Delete Vending Machine",
        content: "<p>Delete this vending machine? Linked Regions and legacy Tiles will no longer open it.</p>"
      });
      if (confirmed) await MachineStore.deleteMachine(machineId);
      this.render(false);
    });
  }
}

export class MachineEditApp extends BaseApplication {
  machineId: string;
  draft: any;
  isDirty: boolean;

  constructor(machineId: string, options: any = {}) {
    super(options);
    this.machineId = machineId;
    this.draft = foundry.utils.deepClone(options.draft ?? MachineStore.getMachine(machineId) ?? MachineStore.createMachine({ id: machineId }));
    this.isDirty = options.isNew === true;
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
    return this.draft?.name ?? "Edit Vending Machine";
  }

  async close(options: any = {}) {
    if (this.isDirty && options.force !== true) {
      const discard = await Dialog.confirm({
        title: game.i18n.localize("HOLOSUITEVENDING.Editor.UnsavedTitle"),
        content: `<p>${game.i18n.localize("HOLOSUITEVENDING.Editor.UnsavedConfirm")}</p>`
      });
      if (!discard) return this;
    }
    return super.close(options);
  }

  async getData() {
    const machine = this.draft;
    return {
      machine,
      entries: machine.inventory.map((entry, index) => ({
        ...entry,
        slotCode: `${String.fromCharCode(65 + Math.floor(index / 3))}${String((index % 3) + 1).padStart(2, "0")}`,
        isFirst: index === 0,
        isLast: index === machine.inventory.length - 1
      })),
      inventoryCount: machine?.inventory.length ?? 0,
      inventoryFull: (machine?.inventory.length ?? 0) >= MAX_MACHINE_PRODUCTS,
      archivedProductCount: machine?.overflowInventory?.length ?? 0,
      hasArchivedProducts: (machine?.overflowInventory?.length ?? 0) > 0,
      maxProducts: MAX_MACHINE_PRODUCTS,
      isDirty: this.isDirty,
      styleOptions: MACHINE_STYLES.map((style) => ({
        ...style,
        selected: machine?.styleId === style.id
      })),
      machineOffline: machine?.status === "offline",
      regionOptions: getSceneRegionOptions(machine?.regionIds ?? []),
      hasSceneRegions: getSceneRegionOptions().length > 0,
      sceneName: canvas?.scene?.name ?? "Current Scene",
      currencyName: MachineStore.getCurrencyName()
    };
  }

  markDirty(html) {
    this.isDirty = true;
    html?.find?.("[data-save-state]")?.text?.(game.i18n.localize("HOLOSUITEVENDING.Editor.DraftChanges"));
  }

  syncDraftFromForm(form) {
    if (!form) return this.draft;
    const formData = readForm(form);
    const source = this.draft;
    const currentSceneRegionIds = new Set(getSceneRegionOptions().map((region) => region.id));
    const selectedRegionIds = new FormData(form).getAll("machine.regionIds").map((value) => String(value)).filter(Boolean);
    const regionIds = [
      ...(source.regionIds ?? []).filter((regionId) => !currentSceneRegionIds.has(regionId)),
      ...selectedRegionIds
    ];
    this.draft = {
      ...source,
      name: formData.machine?.name || source.name,
      manufacturerName: formData.machine?.manufacturerName || source.manufacturerName,
      styleId: formData.machine?.styleId || source.styleId,
      description: formData.machine?.description || "",
      image: formData.machine?.image || "",
      offlineImage: formData.machine?.offlineImage || "",
      soldOutImage: formData.machine?.soldOutImage || "",
      status: formData.machine?.status === "offline" ? "offline" : "online",
      regionIds,
      access: {
        requireProximity: Boolean(form.querySelector("[name='machine.requireProximity']")?.checked),
        proximityDistance: Math.max(1, asNumber(formData.machine?.proximityDistance, source.access?.proximityDistance ?? 2)),
        requiredItemName: formData.machine?.requiredItemName || ""
      },
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
    this.draft.id = this.machineId;
    return this.draft;
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find("form").on("submit", async (event) => {
      event.preventDefault();
      event.stopPropagation();
    });

    html.find("input, textarea, select").on("input change", () => this.markDirty(html));

    html.find("[name='machine.styleId']").on("change", (event) => {
      const option = event.currentTarget.selectedOptions?.[0];
      html.find("[data-style-preview]").attr("data-machine-style", event.currentTarget.value);
      html.find("[data-style-description]").text(option?.dataset?.description || "");
    });
    html.find("[name='machine.name']").on("input", (event) => html.find("[data-preview-name]").text(event.currentTarget.value || "Vending Machine"));
    html.find("[name='machine.manufacturerName']").on("input", (event) => html.find("[data-preview-manufacturer]").text(event.currentTarget.value || "HoloSuite"));

    html.find("[data-action='save-machine'], [data-action='save-and-test']").on("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const form = event.currentTarget.closest("form");
      if (!form) return;
      try {
        await this.save(form);
        ui.notifications.info(game.i18n.localize("HOLOSUITEVENDING.Editor.Saved"));
        html.find("[data-save-state]").text(game.i18n.localize("HOLOSUITEVENDING.Editor.AllChangesSaved"));
        if (event.currentTarget.dataset.action === "save-and-test") {
          const token = canvas?.tokens?.controlled?.[0] ?? null;
          const actor = token?.actor ?? game.user?.character ?? null;
          if (!actor) {
            ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.SelectTestActor"));
            return;
          }
          new VendingApp(this.machineId, {
            actor,
            context: { source: "gm-test", sceneId: canvas?.scene?.id ?? "", tokenId: token?.document?.id ?? token?.id ?? "" }
          }).render(true);
        }
      } catch (error) {
        console.error(`${MODULE_ID} | Failed to save vending machine`, error);
        ui.notifications.error("Could not save vending machine. Check the console for details.");
      }
    });

    html.find("[data-action='cancel-edit']").on("click", () => this.close());

    html.find("[data-action='browse-machine-image']").on("click", (event) => {
      event.preventDefault();
      const target = event.currentTarget.dataset.target || "machine.image";
      const input = event.currentTarget.closest(".holosuite-vending-path-row")?.querySelector(`[name='${target}']`);
      if (!input || typeof FilePicker === "undefined") {
        ui.notifications.warn("Foundry FilePicker is not available.");
        return;
      }

      new FilePicker({
        type: "image",
        current: input.value,
        callback: (path) => {
          input.value = path;
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }).browse();
    });

    html.find("[data-action='add-entry']").on("click", (event) => {
      this.syncDraftFromForm(event.currentTarget.closest("form"));
      if (this.draft.inventory.length >= MAX_MACHINE_PRODUCTS) {
        ui.notifications.warn(game.i18n.format("HOLOSUITEVENDING.Notifications.ProductLimit", { max: MAX_MACHINE_PRODUCTS }));
        return;
      }
      this.draft.inventory.push(MachineStore.createEntry());
      this.isDirty = true;
      this.render(false);
    });

    html.find("[data-action='restore-archived']").on("click", (event) => {
      this.syncDraftFromForm(event.currentTarget.closest("form"));
      if (this.draft.inventory.length >= MAX_MACHINE_PRODUCTS || !this.draft.overflowInventory?.length) return;
      this.draft.inventory.push(this.draft.overflowInventory.shift());
      this.isDirty = true;
      this.render(false);
    });

    html.find("[data-action='discard-archived']").on("click", async (event) => {
      const confirmed = await Dialog.confirm({
        title: game.i18n.localize("HOLOSUITEVENDING.Editor.DiscardArchivedTitle"),
        content: `<p>${game.i18n.localize("HOLOSUITEVENDING.Editor.DiscardArchivedConfirm")}</p>`
      });
      if (!confirmed) return;
      this.syncDraftFromForm(event.currentTarget.closest("form"));
      this.draft.overflowInventory = [];
      this.isDirty = true;
      this.render(false);
    });

    html.find("[data-action='remove-entry']").on("click", async (event) => {
      const confirmed = await Dialog.confirm({
        title: game.i18n.localize("HOLOSUITEVENDING.Editor.RemoveProductTitle"),
        content: `<p>${game.i18n.localize("HOLOSUITEVENDING.Editor.RemoveProductConfirm")}</p>`
      });
      if (!confirmed) return;
      this.syncDraftFromForm(event.currentTarget.closest("form"));
      this.draft.inventory = this.draft.inventory.filter((entry) => entry.id !== event.currentTarget.dataset.entryId);
      this.isDirty = true;
      this.render(false);
    });

    html.find("[data-action='move-entry-up'], [data-action='move-entry-down']").on("click", (event) => {
      this.syncDraftFromForm(event.currentTarget.closest("form"));
      const index = this.draft.inventory.findIndex((entry) => entry.id === event.currentTarget.dataset.entryId);
      const direction = event.currentTarget.dataset.action === "move-entry-up" ? -1 : 1;
      const target = index + direction;
      if (index < 0 || target < 0 || target >= this.draft.inventory.length) return;
      [this.draft.inventory[index], this.draft.inventory[target]] = [this.draft.inventory[target], this.draft.inventory[index]];
      this.isDirty = true;
      this.render(false);
    });

    html.find(".holosuite-vending-entry-editor").on("dragstart", (event) => {
      const nativeEvent = event.originalEvent;
      if (!nativeEvent.target?.closest?.(".hsv-drag-handle")) {
        event.preventDefault();
        return;
      }
      nativeEvent.dataTransfer.effectAllowed = "move";
      nativeEvent.dataTransfer.setData("application/x-holosuite-vending-entry", event.currentTarget.dataset.entryId);
    });
    html.find(".holosuite-vending-entry-editor").on("dragover", (event) => {
      if (Array.from(event.originalEvent.dataTransfer?.types ?? []).includes("application/x-holosuite-vending-entry")) event.preventDefault();
    });
    html.find(".holosuite-vending-entry-editor").on("drop", (event) => {
      const sourceId = event.originalEvent.dataTransfer?.getData("application/x-holosuite-vending-entry");
      if (!sourceId) return;
      event.preventDefault();
      event.stopPropagation();
      this.syncDraftFromForm(event.currentTarget.closest("form"));
      const sourceIndex = this.draft.inventory.findIndex((entry) => entry.id === sourceId);
      const targetIndex = this.draft.inventory.findIndex((entry) => entry.id === event.currentTarget.dataset.entryId);
      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;
      const [entry] = this.draft.inventory.splice(sourceIndex, 1);
      this.draft.inventory.splice(targetIndex, 0, entry);
      this.isDirty = true;
      this.render(false);
    });

    html.find(".holosuite-vending-drop-zone").on("dragover", (event) => event.preventDefault());
    html.find(".holosuite-vending-drop-zone").on("drop", async (event) => {
      event.preventDefault();
      try {
        if (event.originalEvent.dataTransfer?.getData("application/x-holosuite-vending-entry")) return;
        this.syncDraftFromForm(event.currentTarget.closest("form"));
        if (this.draft.inventory.length >= MAX_MACHINE_PRODUCTS) {
          ui.notifications.warn(game.i18n.format("HOLOSUITEVENDING.Notifications.ProductLimit", { max: MAX_MACHINE_PRODUCTS }));
          return;
        }
        const entry = await itemDataFromDrop(event.originalEvent);
        if (!entry) return;
        this.draft.inventory.push(entry);
        this.isDirty = true;
        this.render(false);
      } catch (error) {
        console.warn(`${MODULE_ID} | Item drop failed`, error);
        ui.notifications.warn("Could not add that item to the vending machine.");
      }
    });
  }

  async save(form) {
    this.syncDraftFromForm(form);
    this.draft = foundry.utils.deepClone(await MachineStore.upsertMachine(this.draft));
    this.isDirty = false;
  }
}
