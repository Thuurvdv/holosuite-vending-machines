import {
  DEFAULT_AUDIO_PATHS,
  DEFAULT_MACHINE_STYLE,
  DEFAULT_MANUFACTURER_NAME,
  MACHINE_STYLES,
  MAX_MACHINE_PRODUCTS,
  MODULE_ID,
  SETTINGS
} from "./constants.js";
import { getMachineDisplayImage, getMachineState, MACHINE_STATES, partitionInventory } from "./vending-domain.mjs";

const MAX_LEDGER_ENTRIES = 250;

function randomId(prefix = "machine") {
  const id = foundry?.utils?.randomID?.() ?? Math.random().toString(36).slice(2, 10);
  return `${prefix}-${id}`;
}

function clone(value) {
  return foundry.utils.deepClone(value ?? {});
}

function asBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "string") return value === "true" || value === "on" || value === "1";
  return Boolean(value);
}

function asNonNegativeInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : fallback;
}

function normalizeIds(value) {
  const values = Array.isArray(value) ? value : String(value ?? "").split(/[\s,]+/);
  return Array.from(new Set(values.map((entry) => String(entry).trim()).filter(Boolean)));
}

function normalizeMachineStyle(value) {
  const styleId = String(value ?? "").trim();
  return MACHINE_STYLES.some((style) => style.id === styleId) ? styleId : DEFAULT_MACHINE_STYLE;
}

function normalizeManufacturerName(value) {
  return (String(value ?? "").trim() || DEFAULT_MANUFACTURER_NAME).slice(0, 48);
}

function normalizeEntry(entry: any = {}) {
  return {
    id: entry.id || randomId("entry"),
    itemUuid: entry.itemUuid || "",
    embeddedData: entry.embeddedData ? clone(entry.embeddedData) : null,
    displayName: entry.displayName || entry.name || entry.embeddedData?.name || "New Item",
    image: entry.image || entry.img || entry.embeddedData?.img || "icons/svg/item-bag.svg",
    price: Math.max(0, Number.isFinite(Number(entry.price)) ? Number(entry.price) : 0),
    stock: asNonNegativeInteger(entry.stock ?? entry.maxStock, 1),
    maxStock: asNonNegativeInteger(entry.maxStock ?? entry.stock, 1),
    description: entry.description || entry.embeddedData?.system?.description?.value || ""
  };
}

function normalizeMachine(machine: any = {}) {
  const sourceInventory = Array.isArray(machine.inventory) ? machine.inventory.map(normalizeEntry) : [];
  const existingOverflow = Array.isArray(machine.overflowInventory) ? machine.overflowInventory.map(normalizeEntry) : [];
  const partitioned = partitionInventory(sourceInventory, MAX_MACHINE_PRODUCTS, existingOverflow);
  const status = machine.status === MACHINE_STATES.OFFLINE ? MACHINE_STATES.OFFLINE : MACHINE_STATES.ONLINE;
  return {
    id: machine.id || randomId("machine"),
    name: machine.name || "New Vending Machine",
    manufacturerName: normalizeManufacturerName(machine.manufacturerName),
    styleId: normalizeMachineStyle(machine.styleId),
    description: machine.description || "",
    image: machine.image || machine.icon || "icons/environment/settlement/stall.webp",
    status,
    regionIds: normalizeIds(machine.regionIds),
    access: {
      requireProximity: asBoolean(machine.access?.requireProximity ?? machine.requireProximity, true)
    },
    inventory: partitioned.active,
    overflowInventory: partitioned.overflow
  };
}

function normalizeState(state: any = {}) {
  return {
    version: 3,
    machines: Array.isArray(state.machines) ? state.machines.map(normalizeMachine) : []
  };
}

function normalizeLedger(ledger: any = {}) {
  return {
    version: 1,
    entries: (Array.isArray(ledger.entries) ? ledger.entries : []).slice(-MAX_LEDGER_ENTRIES)
  };
}

function normalizeDispenseReservation(entry: any = {}) {
  return {
    id: String(entry.id || entry.requestId || randomId("dispense")),
    requestId: String(entry.requestId || entry.id || ""),
    machineId: String(entry.machineId || ""),
    machineName: String(entry.machineName || "Unknown machine"),
    actorUuid: String(entry.actorUuid || ""),
    actorId: String(entry.actorId || ""),
    actorName: String(entry.actorName || "Unknown actor"),
    userId: String(entry.userId || ""),
    userName: String(entry.userName || "Unknown user"),
    currencyName: String(entry.currencyName || "Currency"),
    itemSummary: String(entry.itemSummary || ""),
    itemCount: asNonNegativeInteger(entry.itemCount, 0),
    totalPrice: Math.max(0, Number(entry.totalPrice) || 0),
    items: Array.isArray(entry.items) ? clone(entry.items) : [],
    image: String(entry.image || ""),
    createdAt: Number(entry.createdAt) || Date.now(),
    expiresAt: Number(entry.expiresAt) || Date.now() + 11_000,
    status: entry.status === "delivering" ? "delivering" : "pending"
  };
}

function normalizeDispenseState(state: any = {}) {
  return {
    version: 1,
    entries: Array.isArray(state.entries) ? state.entries.map(normalizeDispenseReservation) : []
  };
}

export class MachineStore {
  static registerSettings() {
    game.settings.register(MODULE_ID, SETTINGS.machines, {
      name: "HoloSuite Vending Machine Data",
      scope: "world",
      config: false,
      type: Object,
      default: { version: 3, machines: [] },
      onChange: () => Hooks.callAll(`${MODULE_ID}.machinesChanged`)
    });

    game.settings.register(MODULE_ID, SETTINGS.currencyName, {
      name: game.i18n.localize("HOLOSUITEVENDING.Settings.CurrencyName.Name"),
      hint: game.i18n.localize("HOLOSUITEVENDING.Settings.CurrencyName.Hint"),
      scope: "world",
      config: true,
      type: String,
      default: "Credits",
      restricted: true
    });

    game.settings.register(MODULE_ID, SETTINGS.currencyMode, {
      name: game.i18n.localize("HOLOSUITEVENDING.Settings.CurrencyMode.Name"),
      hint: game.i18n.localize("HOLOSUITEVENDING.Settings.CurrencyMode.Hint"),
      scope: "world",
      config: true,
      type: String,
      choices: {
        auto: game.i18n.localize("HOLOSUITEVENDING.Settings.CurrencyMode.Auto"),
        actor: game.i18n.localize("HOLOSUITEVENDING.Settings.CurrencyMode.Actor"),
        item: game.i18n.localize("HOLOSUITEVENDING.Settings.CurrencyMode.Item")
      },
      default: "auto",
      restricted: true
    });

    game.settings.register(MODULE_ID, SETTINGS.currencyPath, {
      name: game.i18n.localize("HOLOSUITEVENDING.Settings.CurrencyPath.Name"),
      hint: game.i18n.localize("HOLOSUITEVENDING.Settings.CurrencyPath.Hint"),
      scope: "world",
      config: true,
      type: String,
      default: "",
      restricted: true
    });

    game.settings.register(MODULE_ID, SETTINGS.creditTransformer, {
      name: game.i18n.localize("HOLOSUITEVENDING.Settings.CreditTransformer.Name"),
      hint: game.i18n.localize("HOLOSUITEVENDING.Settings.CreditTransformer.Hint"),
      scope: "world",
      config: false,
      type: Boolean,
      default: false,
      restricted: true,
      onChange: () => Hooks.callAll(`${MODULE_ID}.currencyChanged`)
    });

    game.settings.register(MODULE_ID, SETTINGS.audioEnabled, {
      name: game.i18n.localize("HOLOSUITEVENDING.Settings.AudioEnabled.Name"),
      hint: game.i18n.localize("HOLOSUITEVENDING.Settings.AudioEnabled.Hint"),
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
      restricted: true
    });

    game.settings.register(MODULE_ID, SETTINGS.audioVolume, {
      name: game.i18n.localize("HOLOSUITEVENDING.Settings.AudioVolume.Name"),
      hint: game.i18n.localize("HOLOSUITEVENDING.Settings.AudioVolume.Hint"),
      scope: "world",
      config: true,
      type: Number,
      range: { min: 0, max: 1, step: 0.05 },
      default: 0.35,
      restricted: true
    });

    const soundSettings = [
      [SETTINGS.audioSelect, "Select", DEFAULT_AUDIO_PATHS.select],
      [SETTINGS.audioPurchase, "Purchase", DEFAULT_AUDIO_PATHS.purchase],
      [SETTINGS.audioDispense, "Dispense", DEFAULT_AUDIO_PATHS.dispense],
      [SETTINGS.audioCollect, "Collect", DEFAULT_AUDIO_PATHS.collect],
      [SETTINGS.audioFailure, "Failure", DEFAULT_AUDIO_PATHS.failure]
    ];
    for (const [key, cue, defaultPath] of soundSettings) {
      game.settings.register(MODULE_ID, key, {
        name: game.i18n.localize(`HOLOSUITEVENDING.Settings.Audio${cue}.Name`),
        hint: game.i18n.localize(`HOLOSUITEVENDING.Settings.Audio${cue}.Hint`),
        scope: "world",
        config: true,
        type: String,
        default: defaultPath,
        filePicker: "audio",
        restricted: true
      });
    }

    game.settings.register(MODULE_ID, SETTINGS.ledger, {
      name: "HoloSuite Vending Transaction Ledger",
      scope: "world",
      config: false,
      type: Object,
      default: { version: 1, entries: [] }
    });

    game.settings.register(MODULE_ID, SETTINGS.dispenses, {
      name: "HoloSuite Pending Vending Dispenses",
      scope: "world",
      config: false,
      type: Object,
      default: { version: 1, entries: [] }
    });
  }

  static getState() {
    return normalizeState(game.settings.get(MODULE_ID, SETTINGS.machines));
  }

  static async setState(state) {
    if (!game.user.isGM) throw new Error("Only a GM can update vending machine data.");
    await game.settings.set(MODULE_ID, SETTINGS.machines, normalizeState(state));
  }

  static getMachines() {
    return this.getState().machines;
  }

  static getMachine(machineId) {
    return this.getMachines().find((machine) => machine.id === machineId) ?? null;
  }

  static getMachineState(machineIdOrMachine) {
    const machine = typeof machineIdOrMachine === "string" ? this.getMachine(machineIdOrMachine) : machineIdOrMachine;
    return getMachineState(machine);
  }

  static getMachineDisplayImage(machineIdOrMachine) {
    const machine = typeof machineIdOrMachine === "string" ? this.getMachine(machineIdOrMachine) : machineIdOrMachine;
    return getMachineDisplayImage(machine);
  }

  static getCurrencyName() {
    return game.settings.get(MODULE_ID, SETTINGS.currencyName) || "Credits";
  }

  static getCurrencyMode() {
    const mode = String(game.settings.get(MODULE_ID, SETTINGS.currencyMode) || "auto");
    return ["auto", "actor", "item"].includes(mode) ? mode : "auto";
  }

  static getCurrencyPath() {
    return String(game.settings.get(MODULE_ID, SETTINGS.currencyPath) || "").trim();
  }

  static getCurrencySourceLabel() {
    const mode = this.getCurrencyMode();
    const path = this.getCurrencyPath();
    if (this.getCreditTransformer()) return "Credit Transformer · backed by each actor's system currency";
    if (mode === "actor") return path ? `Actor currency · ${path}` : "Actor currency · automatic detection";
    if (mode === "item") return `Inventory currency item · ${this.getCurrencyName()}`;
    return path ? `Automatic system currency · ${path}` : "Automatic system currency detection with item fallback";
  }

  static getCreditTransformer() {
    return game.settings.get(MODULE_ID, SETTINGS.creditTransformer) === true;
  }

  static async setCreditTransformer(enabled) {
    if (!game.user?.isGM) throw new Error("Only a GM can change the credit transformer.");
    return game.settings.set(MODULE_ID, SETTINGS.creditTransformer, enabled === true);
  }

  static getAudioConfig() {
    return {
      enabled: game.settings.get(MODULE_ID, SETTINGS.audioEnabled) !== false,
      volume: Math.min(1, Math.max(0, Number(game.settings.get(MODULE_ID, SETTINGS.audioVolume)) || 0)),
      select: String(game.settings.get(MODULE_ID, SETTINGS.audioSelect) || "").trim(),
      purchase: String(game.settings.get(MODULE_ID, SETTINGS.audioPurchase) || "").trim(),
      dispense: String(game.settings.get(MODULE_ID, SETTINGS.audioDispense) || "").trim(),
      collect: String(game.settings.get(MODULE_ID, SETTINGS.audioCollect) || "").trim(),
      failure: String(game.settings.get(MODULE_ID, SETTINGS.audioFailure) || "").trim()
    };
  }

  static async upsertMachine(machine) {
    if (Array.isArray(machine?.inventory) && machine.inventory.length > MAX_MACHINE_PRODUCTS) {
      throw new Error(`A vending machine can contain no more than ${MAX_MACHINE_PRODUCTS} products.`);
    }
    const state = this.getState();
    const normalized = normalizeMachine(machine);
    const index = state.machines.findIndex((candidate) => candidate.id === normalized.id);
    if (index >= 0) state.machines[index] = normalized;
    else state.machines.push(normalized);
    await this.setState(state);
    return normalized;
  }

  static async deleteMachine(machineId) {
    const state = this.getState();
    state.machines = state.machines.filter((machine) => machine.id !== machineId);
    await this.setState(state);
  }

  static async updateEntryStocks(machineId, stockByEntryId) {
    const state = this.getState();
    const machine = state.machines.find((candidate) => candidate.id === machineId);
    if (!machine) throw new Error("Vending machine not found.");
    for (const entry of machine.inventory) {
      if (!Object.prototype.hasOwnProperty.call(stockByEntryId, entry.id)) continue;
      entry.stock = Math.max(0, Math.floor(Number(stockByEntryId[entry.id]) || 0));
    }
    await this.setState(state);
    return normalizeMachine(machine);
  }

  static async updateEntryStock(machineId, entryId, stock) {
    return this.updateEntryStocks(machineId, { [entryId]: stock });
  }

  static async restockMachine(machineId) {
    const machine = this.getMachine(machineId);
    if (!machine) throw new Error("Vending machine not found.");
    const stock = Object.fromEntries(machine.inventory.map((entry) => [entry.id, entry.maxStock]));
    return this.updateEntryStocks(machineId, stock);
  }

  static async restockAll() {
    const state = this.getState();
    for (const machine of state.machines) {
      for (const entry of machine.inventory) entry.stock = entry.maxStock;
    }
    await this.setState(state);
    return state.machines;
  }

  static getLedger() {
    return normalizeLedger(game.settings.get(MODULE_ID, SETTINGS.ledger));
  }

  static getDispenseState() {
    return normalizeDispenseState(game.settings.get(MODULE_ID, SETTINGS.dispenses));
  }

  static getPendingDispenses() {
    return this.getDispenseState().entries;
  }

  static getPendingDispense(requestId) {
    return this.getPendingDispenses().find((entry) => entry.requestId === requestId) ?? null;
  }

  static async addPendingDispense(entry) {
    if (!game.user?.isGM) throw new Error("Only a GM can authorize vending-machine delivery.");
    const state = this.getDispenseState();
    const normalized = normalizeDispenseReservation(entry);
    const index = state.entries.findIndex((candidate) => candidate.requestId === normalized.requestId);
    if (index >= 0) state.entries[index] = normalized;
    else state.entries.push(normalized);
    await game.settings.set(MODULE_ID, SETTINGS.dispenses, state);
    return normalized;
  }

  static async updatePendingDispense(requestId, updates) {
    if (!game.user?.isGM) throw new Error("Only a GM can update vending-machine delivery.");
    const state = this.getDispenseState();
    const index = state.entries.findIndex((entry) => entry.requestId === requestId);
    if (index < 0) return null;
    state.entries[index] = normalizeDispenseReservation({ ...state.entries[index], ...updates });
    await game.settings.set(MODULE_ID, SETTINGS.dispenses, state);
    return state.entries[index];
  }

  static async removePendingDispense(requestId) {
    if (!game.user?.isGM) throw new Error("Only a GM can complete vending-machine delivery.");
    const state = this.getDispenseState();
    const previousLength = state.entries.length;
    state.entries = state.entries.filter((entry) => entry.requestId !== requestId);
    if (state.entries.length !== previousLength) {
      await game.settings.set(MODULE_ID, SETTINGS.dispenses, state);
      return true;
    }
    return false;
  }

  static async appendLedger(entry) {
    if (!game.user.isGM) return null;
    const ledger = this.getLedger();
    const normalized = {
      id: entry.id || randomId("transaction"),
      requestId: entry.requestId || "",
      timestamp: entry.timestamp || Date.now(),
      status: entry.status === "failed" ? "failed" : "success",
      machineId: entry.machineId || "",
      machineName: entry.machineName || "Unknown machine",
      actorId: entry.actorId || "",
      actorName: entry.actorName || "Unknown actor",
      userId: entry.userId || "",
      userName: entry.userName || "Unknown user",
      itemSummary: entry.itemSummary || "",
      itemCount: Math.max(0, Number(entry.itemCount) || 0),
      totalPrice: Math.max(0, Number(entry.totalPrice) || 0),
      currencyName: entry.currencyName || this.getCurrencyName(),
      error: entry.error || ""
    };
    ledger.entries.push(normalized);
    ledger.entries = ledger.entries.slice(-MAX_LEDGER_ENTRIES);
    await game.settings.set(MODULE_ID, SETTINGS.ledger, ledger);
    Hooks.callAll(`${MODULE_ID}.ledgerChanged`, normalized);
    return normalized;
  }

  static hasProcessedRequest(requestId) {
    if (!requestId) return false;
    return this.getLedger().entries.some((entry) => entry.requestId === requestId && entry.status === "success");
  }

  static async clearLedger() {
    if (!game.user.isGM) throw new Error("Only a GM can clear the transaction ledger.");
    await game.settings.set(MODULE_ID, SETTINGS.ledger, { version: 1, entries: [] });
    Hooks.callAll(`${MODULE_ID}.ledgerChanged`, null);
  }

  static exportData() {
    return {
      format: "holosuite-vending-machines",
      version: 3,
      exportedAt: new Date().toISOString(),
      currencyName: this.getCurrencyName(),
      machines: clone(this.getMachines())
    };
  }

  static async importData(payload) {
    if (!game.user.isGM) throw new Error("Only a GM can import vending machines.");
    const machines = Array.isArray(payload) ? payload : payload?.machines;
    if (!Array.isArray(machines)) throw new Error("This file does not contain a vending machine list.");
    const oversized = machines.find((machine) => Array.isArray(machine?.inventory) && machine.inventory.length > MAX_MACHINE_PRODUCTS);
    if (oversized) {
      throw new Error(`Cannot import ${oversized.name || "a vending machine"}: it contains ${oversized.inventory.length} products, but the maximum is ${MAX_MACHINE_PRODUCTS}.`);
    }
    const state = this.getState();
    const imported = [];
    for (const source of machines) {
      const machine = normalizeMachine(source);
      imported.push(machine);
      const index = state.machines.findIndex((candidate) => candidate.id === machine.id);
      if (index >= 0) state.machines[index] = machine;
      else state.machines.push(machine);
    }
    await this.setState(state);
    return imported.length;
  }

  static createMachine(seed = {}) {
    return normalizeMachine({ id: randomId("machine"), ...seed });
  }

  static createEntry(seed = {}) {
    return normalizeEntry({ id: randomId("entry"), ...seed });
  }
}
