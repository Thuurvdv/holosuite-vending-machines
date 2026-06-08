import { MODULE_ID, SETTINGS } from "./constants.js";

function randomId(prefix = "machine") {
  const id = foundry?.utils?.randomID?.() ?? Math.random().toString(36).slice(2, 10);
  return `${prefix}-${id}`;
}

function clone(value) {
  return foundry.utils.deepClone(value ?? {});
}

function normalizeEntry(entry: any = {}) {
  return {
    id: entry.id || randomId("entry"),
    itemUuid: entry.itemUuid || "",
    embeddedData: entry.embeddedData ? clone(entry.embeddedData) : null,
    displayName: entry.displayName || entry.name || entry.embeddedData?.name || "New Item",
    image: entry.image || entry.img || entry.embeddedData?.img || "icons/svg/item-bag.svg",
    price: Math.max(0, Number(entry.price || 0)),
    stock: Math.max(0, Number(entry.stock ?? entry.maxStock ?? 1)),
    maxStock: Math.max(0, Number(entry.maxStock ?? entry.stock ?? 1)),
    description: entry.description || entry.embeddedData?.system?.description?.value || ""
  };
}

function normalizeMachine(machine: any = {}) {
  const inventory = Array.isArray(machine.inventory) ? machine.inventory.map(normalizeEntry) : [];
  return {
    id: machine.id || randomId("machine"),
    name: machine.name || "New Vending Machine",
    description: machine.description || "",
    image: machine.image || machine.icon || "icons/environment/settlement/stall.webp",
    inventory
  };
}

function normalizeState(state: any = {}) {
  return {
    version: 1,
    machines: Array.isArray(state.machines) ? state.machines.map(normalizeMachine) : []
  };
}

export class MachineStore {
  static registerSettings() {
    game.settings.register(MODULE_ID, SETTINGS.machines, {
      name: "HoloSuite Vending Machine Data",
      scope: "world",
      config: false,
      type: Object,
      default: { version: 1, machines: [] },
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

  static getCurrencyName() {
    return game.settings.get(MODULE_ID, SETTINGS.currencyName) || "Credits";
  }

  static async upsertMachine(machine) {
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

  static async updateEntryStock(machineId, entryId, stock) {
    const state = this.getState();
    const machine = state.machines.find((candidate) => candidate.id === machineId);
    const entry = machine?.inventory?.find((candidate) => candidate.id === entryId);
    if (!entry) throw new Error("Inventory entry not found.");
    entry.stock = Math.max(0, Number(stock || 0));
    await this.setState(state);
    return normalizeMachine(machine);
  }

  static createMachine(seed = {}) {
    return normalizeMachine({ id: randomId("machine"), ...seed });
  }

  static createEntry(seed = {}) {
    return normalizeEntry({ id: randomId("entry"), ...seed });
  }
}
