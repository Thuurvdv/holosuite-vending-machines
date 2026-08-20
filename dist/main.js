var Re = Object.defineProperty;
var Ue = (i, n, e) => n in i ? Re(i, n, { enumerable: !0, configurable: !0, writable: !0, value: e }) : i[n] = e;
var T = (i, n, e) => Ue(i, typeof n != "symbol" ? n + "" : n, e);
const u = "holosuite-vending-machines", Pe = "HoloSuite Vending Machines", W = "machineId", H = `module.${u}`, Ge = "HoloSuite", xe = "industrial", A = 9, ue = [
  {
    id: "industrial",
    label: "Industrial Chassis",
    description: "Armored panels, recessed product bays, and a heavy retrieval assembly."
  },
  {
    id: "corporate-kiosk",
    label: "Corporate Kiosk",
    description: "A clean freestanding kiosk with rounded cards and a simplified service bay."
  }
], I = {
  machines: "machines",
  currencyMode: "currencyMode",
  currencyPath: "currencyActorPath",
  currencyName: "currencyItemName",
  creditTransformer: "creditTransformer",
  audioEnabled: "audioEnabled",
  audioVolume: "audioVolume",
  audioSelect: "audioSelect",
  audioPurchase: "audioPurchase",
  audioDispense: "audioDispense",
  audioCollect: "audioCollect",
  audioFailure: "audioFailure",
  dispenses: "pendingDispenses",
  ledger: "transactionLedger"
}, x = {
  select: `modules/${u}/assets/sounds/vending_select.ogg`,
  purchase: `modules/${u}/assets/sounds/vending_purchase.ogg`,
  dispense: `modules/${u}/assets/sounds/vending_dispense.ogg`,
  collect: `modules/${u}/assets/sounds/vending_collect.ogg`,
  failure: `modules/${u}/assets/sounds/vending_failure.ogg`
}, Y = {
  vending: `modules/${u}/templates/vending-app.hbs`,
  browser: `modules/${u}/templates/machine-browser.hbs`,
  manager: `modules/${u}/templates/machine-manager.hbs`,
  editor: `modules/${u}/templates/machine-edit.hbs`
}, k = Object.freeze({
  ONLINE: "online",
  OFFLINE: "offline",
  SOLD_OUT: "sold-out"
});
function L(i, n) {
  const e = Number(i) || 0;
  return new Intl.NumberFormat(n, { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Math.round((e + Number.EPSILON) * 100) / 100);
}
function Ve(i = [], n = 0) {
  var t, r, s;
  const e = Array.isArray(i) ? i : [];
  return ((t = e.find((a) => Number((a == null ? void 0 : a.stock) ?? 0) > 0 && Number((a == null ? void 0 : a.price) ?? 0) <= Number(n))) == null ? void 0 : t.id) ?? ((r = e.find((a) => Number((a == null ? void 0 : a.stock) ?? 0) > 0)) == null ? void 0 : r.id) ?? ((s = e[0]) == null ? void 0 : s.id) ?? null;
}
function ze(i = [], n = 9, e = []) {
  const t = Array.isArray(i) ? i : [], r = Array.isArray(e) ? e : [], s = Math.max(0, Math.floor(Number(n) || 0));
  return {
    active: t.slice(0, s),
    overflow: [...t.slice(s), ...r]
  };
}
function Me(i = []) {
  const n = /* @__PURE__ */ new Map();
  for (const e of Array.isArray(i) ? i : []) {
    const t = String((e == null ? void 0 : e.entryId) ?? "").trim(), r = Math.min(99, Math.max(0, Math.floor(Number((e == null ? void 0 : e.quantity) ?? 0))));
    !t || r < 1 || n.set(t, Math.min(99, (n.get(t) ?? 0) + r));
  }
  return Array.from(n, ([e, t]) => ({ entryId: e, quantity: t }));
}
function Fe(i, n = []) {
  const e = Me(n), t = Array.isArray(i == null ? void 0 : i.inventory) ? i.inventory : [], r = e.map((s) => {
    const a = t.find((d) => (d == null ? void 0 : d.id) === s.entryId);
    if (!a) throw new Error("Inventory entry not found.");
    const o = Math.max(0, Number(a.stock ?? 0));
    if (s.quantity > o) throw new Error(`${a.displayName ?? "Item"} does not have enough stock.`);
    const c = Math.max(0, Number(a.price ?? 0));
    return {
      entry: a,
      entryId: s.entryId,
      quantity: s.quantity,
      unitPrice: c,
      totalPrice: c * s.quantity
    };
  });
  return {
    lines: r,
    itemCount: r.reduce((s, a) => s + a.quantity, 0),
    totalPrice: r.reduce((s, a) => s + a.totalPrice, 0)
  };
}
function Ce(i) {
  if ((i == null ? void 0 : i.status) === k.OFFLINE) return k.OFFLINE;
  const n = Array.isArray(i == null ? void 0 : i.inventory) ? i.inventory : [];
  return n.length > 0 && n.every((e) => Number((e == null ? void 0 : e.stock) ?? 0) <= 0) ? k.SOLD_OUT : k.ONLINE;
}
function ge(i) {
  const n = Ce(i);
  return n === k.OFFLINE && (i != null && i.offlineImage) ? i.offlineImage : n === k.SOLD_OUT && (i != null && i.soldOutImage) ? i.soldOutImage : (i == null ? void 0 : i.image) || "icons/environment/settlement/stall.webp";
}
function $e(i, n, e = 100) {
  const t = Math.max(1, Number(e) || 100), r = {
    x: Number((i == null ? void 0 : i.x) ?? 0) + Number((i == null ? void 0 : i.width) ?? 1) * t / 2,
    y: Number((i == null ? void 0 : i.y) ?? 0) + Number((i == null ? void 0 : i.height) ?? 1) * t / 2
  }, s = {
    x: Number((n == null ? void 0 : n.x) ?? 0) + Number((n == null ? void 0 : n.width) ?? t) / 2,
    y: Number((n == null ? void 0 : n.y) ?? 0) + Number((n == null ? void 0 : n.height) ?? t) / 2
  };
  return Math.hypot(r.x - s.x, r.y - s.y) / t;
}
function qe(i, n, e, t) {
  return !i || !n ? !1 : $e(i, n, e) <= Math.max(0, Number(t) || 0);
}
function G(i = "machine") {
  var e, t;
  const n = ((t = (e = foundry == null ? void 0 : foundry.utils) == null ? void 0 : e.randomID) == null ? void 0 : t.call(e)) ?? Math.random().toString(36).slice(2, 10);
  return `${i}-${n}`;
}
function de(i) {
  return foundry.utils.deepClone(i ?? {});
}
function _e(i, n = !1) {
  return i == null || i === "" ? n : typeof i == "string" ? i === "true" || i === "on" || i === "1" : !!i;
}
function ie(i, n = 0) {
  const e = Number(i);
  return Number.isFinite(e) ? Math.max(0, Math.floor(e)) : n;
}
function Be(i, n = 1) {
  const e = Number(i);
  return Number.isFinite(e) ? Math.max(1, e) : n;
}
function je(i) {
  const n = Array.isArray(i) ? i : String(i ?? "").split(/[\s,]+/);
  return Array.from(new Set(n.map((e) => String(e).trim()).filter(Boolean)));
}
function We(i) {
  const n = String(i ?? "").trim();
  return ue.some((e) => e.id === n) ? n : xe;
}
function Ye(i) {
  return (String(i ?? "").trim() || Ge).slice(0, 48);
}
function re(i = {}) {
  var n, e, t, r, s;
  return {
    id: i.id || G("entry"),
    itemUuid: i.itemUuid || "",
    embeddedData: i.embeddedData ? de(i.embeddedData) : null,
    displayName: i.displayName || i.name || ((n = i.embeddedData) == null ? void 0 : n.name) || "New Item",
    image: i.image || i.img || ((e = i.embeddedData) == null ? void 0 : e.img) || "icons/svg/item-bag.svg",
    price: Math.max(0, Number.isFinite(Number(i.price)) ? Number(i.price) : 0),
    stock: ie(i.stock ?? i.maxStock, 1),
    maxStock: ie(i.maxStock ?? i.stock, 1),
    description: i.description || ((s = (r = (t = i.embeddedData) == null ? void 0 : t.system) == null ? void 0 : r.description) == null ? void 0 : s.value) || ""
  };
}
function V(i = {}) {
  var s, a, o;
  const n = Array.isArray(i.inventory) ? i.inventory.map(re) : [], e = Array.isArray(i.overflowInventory) ? i.overflowInventory.map(re) : [], t = ze(n, A, e), r = i.status === k.OFFLINE ? k.OFFLINE : k.ONLINE;
  return {
    id: i.id || G("machine"),
    name: i.name || "New Vending Machine",
    manufacturerName: Ye(i.manufacturerName),
    styleId: We(i.styleId),
    description: i.description || "",
    image: i.image || i.icon || "icons/environment/settlement/stall.webp",
    offlineImage: i.offlineImage || "",
    soldOutImage: i.soldOutImage || "",
    status: r,
    regionIds: je(i.regionIds),
    access: {
      requireProximity: _e(((s = i.access) == null ? void 0 : s.requireProximity) ?? i.requireProximity, !1),
      proximityDistance: Be(((a = i.access) == null ? void 0 : a.proximityDistance) ?? i.proximityDistance, 2),
      requiredItemName: String(((o = i.access) == null ? void 0 : o.requiredItemName) ?? i.requiredItemName ?? "").trim()
    },
    inventory: t.active,
    overflowInventory: t.overflow
  };
}
function fe(i = {}) {
  return {
    version: 3,
    machines: Array.isArray(i.machines) ? i.machines.map(V) : []
  };
}
function Qe(i = {}) {
  return {
    version: 1,
    entries: (Array.isArray(i.entries) ? i.entries : []).slice(-250)
  };
}
function se(i = {}) {
  return {
    id: String(i.id || i.requestId || G("dispense")),
    requestId: String(i.requestId || i.id || ""),
    machineId: String(i.machineId || ""),
    machineName: String(i.machineName || "Unknown machine"),
    actorUuid: String(i.actorUuid || ""),
    actorId: String(i.actorId || ""),
    actorName: String(i.actorName || "Unknown actor"),
    userId: String(i.userId || ""),
    userName: String(i.userName || "Unknown user"),
    currencyName: String(i.currencyName || "Currency"),
    itemSummary: String(i.itemSummary || ""),
    itemCount: ie(i.itemCount, 0),
    totalPrice: Math.max(0, Number(i.totalPrice) || 0),
    items: Array.isArray(i.items) ? de(i.items) : [],
    image: String(i.image || ""),
    createdAt: Number(i.createdAt) || Date.now(),
    expiresAt: Number(i.expiresAt) || Date.now() + 11e3,
    status: i.status === "delivering" ? "delivering" : "pending"
  };
}
function Ke(i = {}) {
  return {
    version: 1,
    entries: Array.isArray(i.entries) ? i.entries.map(se) : []
  };
}
class g {
  static registerSettings() {
    game.settings.register(u, I.machines, {
      name: "HoloSuite Vending Machine Data",
      scope: "world",
      config: !1,
      type: Object,
      default: { version: 3, machines: [] },
      onChange: () => Hooks.callAll(`${u}.machinesChanged`)
    }), game.settings.register(u, I.currencyName, {
      name: game.i18n.localize("HOLOSUITEVENDING.Settings.CurrencyName.Name"),
      hint: game.i18n.localize("HOLOSUITEVENDING.Settings.CurrencyName.Hint"),
      scope: "world",
      config: !0,
      type: String,
      default: "Credits",
      restricted: !0
    }), game.settings.register(u, I.currencyMode, {
      name: game.i18n.localize("HOLOSUITEVENDING.Settings.CurrencyMode.Name"),
      hint: game.i18n.localize("HOLOSUITEVENDING.Settings.CurrencyMode.Hint"),
      scope: "world",
      config: !0,
      type: String,
      choices: {
        auto: game.i18n.localize("HOLOSUITEVENDING.Settings.CurrencyMode.Auto"),
        actor: game.i18n.localize("HOLOSUITEVENDING.Settings.CurrencyMode.Actor"),
        item: game.i18n.localize("HOLOSUITEVENDING.Settings.CurrencyMode.Item")
      },
      default: "auto",
      restricted: !0
    }), game.settings.register(u, I.currencyPath, {
      name: game.i18n.localize("HOLOSUITEVENDING.Settings.CurrencyPath.Name"),
      hint: game.i18n.localize("HOLOSUITEVENDING.Settings.CurrencyPath.Hint"),
      scope: "world",
      config: !0,
      type: String,
      default: "",
      restricted: !0
    }), game.settings.register(u, I.creditTransformer, {
      name: game.i18n.localize("HOLOSUITEVENDING.Settings.CreditTransformer.Name"),
      hint: game.i18n.localize("HOLOSUITEVENDING.Settings.CreditTransformer.Hint"),
      scope: "world",
      config: !1,
      type: Boolean,
      default: !1,
      restricted: !0,
      onChange: () => Hooks.callAll(`${u}.currencyChanged`)
    }), game.settings.register(u, I.audioEnabled, {
      name: game.i18n.localize("HOLOSUITEVENDING.Settings.AudioEnabled.Name"),
      hint: game.i18n.localize("HOLOSUITEVENDING.Settings.AudioEnabled.Hint"),
      scope: "world",
      config: !0,
      type: Boolean,
      default: !0,
      restricted: !0
    }), game.settings.register(u, I.audioVolume, {
      name: game.i18n.localize("HOLOSUITEVENDING.Settings.AudioVolume.Name"),
      hint: game.i18n.localize("HOLOSUITEVENDING.Settings.AudioVolume.Hint"),
      scope: "world",
      config: !0,
      type: Number,
      range: { min: 0, max: 1, step: 0.05 },
      default: 0.35,
      restricted: !0
    });
    const n = [
      [I.audioSelect, "Select", x.select],
      [I.audioPurchase, "Purchase", x.purchase],
      [I.audioDispense, "Dispense", x.dispense],
      [I.audioCollect, "Collect", x.collect],
      [I.audioFailure, "Failure", x.failure]
    ];
    for (const [e, t, r] of n)
      game.settings.register(u, e, {
        name: game.i18n.localize(`HOLOSUITEVENDING.Settings.Audio${t}.Name`),
        hint: game.i18n.localize(`HOLOSUITEVENDING.Settings.Audio${t}.Hint`),
        scope: "world",
        config: !0,
        type: String,
        default: r,
        filePicker: "audio",
        restricted: !0
      });
    game.settings.register(u, I.ledger, {
      name: "HoloSuite Vending Transaction Ledger",
      scope: "world",
      config: !1,
      type: Object,
      default: { version: 1, entries: [] }
    }), game.settings.register(u, I.dispenses, {
      name: "HoloSuite Pending Vending Dispenses",
      scope: "world",
      config: !1,
      type: Object,
      default: { version: 1, entries: [] }
    });
  }
  static getState() {
    return fe(game.settings.get(u, I.machines));
  }
  static async setState(n) {
    if (!game.user.isGM) throw new Error("Only a GM can update vending machine data.");
    await game.settings.set(u, I.machines, fe(n));
  }
  static getMachines() {
    return this.getState().machines;
  }
  static getMachine(n) {
    return this.getMachines().find((e) => e.id === n) ?? null;
  }
  static getMachineState(n) {
    const e = typeof n == "string" ? this.getMachine(n) : n;
    return Ce(e);
  }
  static getMachineDisplayImage(n) {
    const e = typeof n == "string" ? this.getMachine(n) : n;
    return ge(e);
  }
  static getCurrencyName() {
    return game.settings.get(u, I.currencyName) || "Credits";
  }
  static getCurrencyMode() {
    const n = String(game.settings.get(u, I.currencyMode) || "auto");
    return ["auto", "actor", "item"].includes(n) ? n : "auto";
  }
  static getCurrencyPath() {
    return String(game.settings.get(u, I.currencyPath) || "").trim();
  }
  static getCurrencySourceLabel() {
    const n = this.getCurrencyMode(), e = this.getCurrencyPath();
    return this.getCreditTransformer() ? "Credit Transformer · backed by each actor's system currency" : n === "actor" ? e ? `Actor currency · ${e}` : "Actor currency · automatic detection" : n === "item" ? `Inventory currency item · ${this.getCurrencyName()}` : e ? `Automatic system currency · ${e}` : "Automatic system currency detection with item fallback";
  }
  static getCreditTransformer() {
    return game.settings.get(u, I.creditTransformer) === !0;
  }
  static async setCreditTransformer(n) {
    var e;
    if (!((e = game.user) != null && e.isGM)) throw new Error("Only a GM can change the credit transformer.");
    return game.settings.set(u, I.creditTransformer, n === !0);
  }
  static getAudioConfig() {
    return {
      enabled: game.settings.get(u, I.audioEnabled) !== !1,
      volume: Math.min(1, Math.max(0, Number(game.settings.get(u, I.audioVolume)) || 0)),
      select: String(game.settings.get(u, I.audioSelect) || "").trim(),
      purchase: String(game.settings.get(u, I.audioPurchase) || "").trim(),
      dispense: String(game.settings.get(u, I.audioDispense) || "").trim(),
      collect: String(game.settings.get(u, I.audioCollect) || "").trim(),
      failure: String(game.settings.get(u, I.audioFailure) || "").trim()
    };
  }
  static async upsertMachine(n) {
    if (Array.isArray(n == null ? void 0 : n.inventory) && n.inventory.length > A)
      throw new Error(`A vending machine can contain no more than ${A} products.`);
    const e = this.getState(), t = V(n), r = e.machines.findIndex((s) => s.id === t.id);
    r >= 0 ? e.machines[r] = t : e.machines.push(t), await this.setState(e);
    try {
      await this.syncMachineTiles(t.id);
    } catch (s) {
      console.warn(`${u} | Could not synchronize vending tile art`, s);
    }
    return t;
  }
  static async deleteMachine(n) {
    const e = this.getState();
    e.machines = e.machines.filter((t) => t.id !== n), await this.setState(e);
  }
  static async updateEntryStocks(n, e) {
    const t = this.getState(), r = t.machines.find((s) => s.id === n);
    if (!r) throw new Error("Vending machine not found.");
    for (const s of r.inventory)
      Object.prototype.hasOwnProperty.call(e, s.id) && (s.stock = Math.max(0, Math.floor(Number(e[s.id]) || 0)));
    await this.setState(t);
    try {
      await this.syncMachineTiles(n);
    } catch (s) {
      console.warn(`${u} | Could not synchronize vending tile art`, s);
    }
    return V(r);
  }
  static async updateEntryStock(n, e, t) {
    return this.updateEntryStocks(n, { [e]: t });
  }
  static async restockMachine(n) {
    const e = this.getMachine(n);
    if (!e) throw new Error("Vending machine not found.");
    const t = Object.fromEntries(e.inventory.map((r) => [r.id, r.maxStock]));
    return this.updateEntryStocks(n, t);
  }
  static async restockAll() {
    const n = this.getState();
    for (const e of n.machines)
      for (const t of e.inventory) t.stock = t.maxStock;
    return await this.setState(n), await Promise.allSettled(n.machines.map((e) => this.syncMachineTiles(e.id))), n.machines;
  }
  static getLedger() {
    return Qe(game.settings.get(u, I.ledger));
  }
  static getDispenseState() {
    return Ke(game.settings.get(u, I.dispenses));
  }
  static getPendingDispenses() {
    return this.getDispenseState().entries;
  }
  static getPendingDispense(n) {
    return this.getPendingDispenses().find((e) => e.requestId === n) ?? null;
  }
  static async addPendingDispense(n) {
    var s;
    if (!((s = game.user) != null && s.isGM)) throw new Error("Only a GM can authorize vending-machine delivery.");
    const e = this.getDispenseState(), t = se(n), r = e.entries.findIndex((a) => a.requestId === t.requestId);
    return r >= 0 ? e.entries[r] = t : e.entries.push(t), await game.settings.set(u, I.dispenses, e), t;
  }
  static async updatePendingDispense(n, e) {
    var s;
    if (!((s = game.user) != null && s.isGM)) throw new Error("Only a GM can update vending-machine delivery.");
    const t = this.getDispenseState(), r = t.entries.findIndex((a) => a.requestId === n);
    return r < 0 ? null : (t.entries[r] = se({ ...t.entries[r], ...e }), await game.settings.set(u, I.dispenses, t), t.entries[r]);
  }
  static async removePendingDispense(n) {
    var r;
    if (!((r = game.user) != null && r.isGM)) throw new Error("Only a GM can complete vending-machine delivery.");
    const e = this.getDispenseState(), t = e.entries.length;
    return e.entries = e.entries.filter((s) => s.requestId !== n), e.entries.length !== t ? (await game.settings.set(u, I.dispenses, e), !0) : !1;
  }
  static async appendLedger(n) {
    if (!game.user.isGM) return null;
    const e = this.getLedger(), t = {
      id: n.id || G("transaction"),
      requestId: n.requestId || "",
      timestamp: n.timestamp || Date.now(),
      status: n.status === "failed" ? "failed" : "success",
      machineId: n.machineId || "",
      machineName: n.machineName || "Unknown machine",
      actorId: n.actorId || "",
      actorName: n.actorName || "Unknown actor",
      userId: n.userId || "",
      userName: n.userName || "Unknown user",
      itemSummary: n.itemSummary || "",
      itemCount: Math.max(0, Number(n.itemCount) || 0),
      totalPrice: Math.max(0, Number(n.totalPrice) || 0),
      currencyName: n.currencyName || this.getCurrencyName(),
      error: n.error || ""
    };
    return e.entries.push(t), e.entries = e.entries.slice(-250), await game.settings.set(u, I.ledger, e), Hooks.callAll(`${u}.ledgerChanged`, t), t;
  }
  static hasProcessedRequest(n) {
    return n ? this.getLedger().entries.some((e) => e.requestId === n && e.status === "success") : !1;
  }
  static async clearLedger() {
    if (!game.user.isGM) throw new Error("Only a GM can clear the transaction ledger.");
    await game.settings.set(u, I.ledger, { version: 1, entries: [] }), Hooks.callAll(`${u}.ledgerChanged`, null);
  }
  static exportData() {
    return {
      format: "holosuite-vending-machines",
      version: 3,
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      currencyName: this.getCurrencyName(),
      machines: de(this.getMachines())
    };
  }
  static async importData(n) {
    if (!game.user.isGM) throw new Error("Only a GM can import vending machines.");
    const e = Array.isArray(n) ? n : n == null ? void 0 : n.machines;
    if (!Array.isArray(e)) throw new Error("This file does not contain a vending machine list.");
    const t = e.find((a) => Array.isArray(a == null ? void 0 : a.inventory) && a.inventory.length > A);
    if (t)
      throw new Error(`Cannot import ${t.name || "a vending machine"}: it contains ${t.inventory.length} products, but the maximum is ${A}.`);
    const r = this.getState(), s = [];
    for (const a of e) {
      const o = V(a);
      s.push(o);
      const c = r.machines.findIndex((d) => d.id === o.id);
      c >= 0 ? r.machines[c] = o : r.machines.push(o);
    }
    return await this.setState(r), await Promise.allSettled(s.map((a) => this.syncMachineTiles(a.id))), s.length;
  }
  static async syncMachineTiles(n) {
    var s, a, o;
    if (!((s = game.user) != null && s.isGM)) return;
    const e = this.getMachine(n);
    if (!e) return;
    const t = ge(e), r = Array.from(((a = game.scenes) == null ? void 0 : a.contents) ?? game.scenes ?? []);
    for (const c of r) {
      const l = Array.from(((o = c == null ? void 0 : c.tiles) == null ? void 0 : o.contents) ?? (c == null ? void 0 : c.tiles) ?? []).filter((m) => {
        var f, S;
        return ((f = m == null ? void 0 : m.getFlag) == null ? void 0 : f.call(m, u, W)) === n && ((S = m == null ? void 0 : m.texture) == null ? void 0 : S.src) !== t;
      }).map((m) => ({ _id: m.id, "texture.src": t }));
      l.length && await c.updateEmbeddedDocuments("Tile", l);
    }
  }
  static createMachine(n = {}) {
    return V({ id: G("machine"), ...n });
  }
  static createEntry(n = {}) {
    return re({ id: G("entry"), ...n });
  }
}
function Ae() {
  var i, n, e;
  return ((n = (i = globalThis.foundry) == null ? void 0 : i.applications) == null ? void 0 : n.api) ?? ((e = foundry == null ? void 0 : foundry.applications) == null ? void 0 : e.api) ?? null;
}
function be() {
  var i, n, e;
  return ((n = (i = globalThis.foundry) == null ? void 0 : i.appv1) == null ? void 0 : n.api) ?? ((e = foundry == null ? void 0 : foundry.appv1) == null ? void 0 : e.api) ?? null;
}
function Je(i = {}, n = {}) {
  var t, r, s;
  const e = ((r = (t = globalThis.foundry) == null ? void 0 : t.utils) == null ? void 0 : r.mergeObject) ?? ((s = foundry == null ? void 0 : foundry.utils) == null ? void 0 : s.mergeObject);
  return typeof e == "function" ? e(i, n, { inplace: !1 }) : { ...i, ...n };
}
function he(i = {}) {
  return {
    id: String(i.id ?? `legacy-application-${Math.random().toString(36).slice(2, 10)}`),
    tag: i.tag ?? "section",
    classes: Array.isArray(i.classes) ? i.classes : [],
    window: { title: i.title ?? "", icon: i.icon, resizable: i.resizable === !0 },
    position: {
      width: Number(i.width ?? 600),
      height: i.height === "auto" ? "auto" : Number(i.height ?? 600)
    }
  };
}
function ke(i) {
  return class extends i {
    constructor(t = {}) {
      const r = Je(new.target.defaultOptions ?? {}, t);
      super(he(r));
      T(this, "_v1Options");
      this._v1Options = r;
    }
    static get defaultOptions() {
      return {};
    }
    static get DEFAULT_OPTIONS() {
      return he(this.defaultOptions ?? {});
    }
    render(t = {}, r = {}) {
      return typeof t == "boolean" ? super.render({ ...r, force: t }) : super.render(t);
    }
    activateListeners(t) {
    }
    async _renderHTML(t, r) {
      var d, l, m;
      const s = typeof this.getData == "function" ? await this.getData() : {}, a = ((d = this._v1Options) == null ? void 0 : d.template) ?? ((l = this.options) == null ? void 0 : l.template) ?? ((m = this.constructor.defaultOptions) == null ? void 0 : m.template);
      if (!a) return document.createDocumentFragment();
      const o = await globalThis.renderTemplate(a, s), c = document.createElement("template");
      return c.innerHTML = o.trim(), c.content;
    }
    _replaceHTML(t, r, s) {
      var l, m, f, S;
      r.replaceChildren(t);
      const a = globalThis.jQuery ?? globalThis.$, o = ((l = r.closest) == null ? void 0 : l.call(r, ".window-app, .app, .application")) ?? r, c = a ? a(o) : o;
      try {
        Object.defineProperty(this, "element", { value: c, configurable: !0, writable: !0 });
      } catch {
        try {
          this.element = c;
        } catch {
        }
      }
      const d = (m = this._v1Options) == null ? void 0 : m.classes;
      Array.isArray(d) && d.length && (r.classList.add(...d), (S = (f = r.closest) == null ? void 0 : f.call(r, ".window-app, .app, .application")) == null || S.classList.add(...d)), typeof this.activateListeners == "function" && this.activateListeners(a ? a(r) : r);
    }
  };
}
function Q() {
  const i = Ae(), n = be(), e = globalThis.Application ?? (n == null ? void 0 : n.Application) ?? (i == null ? void 0 : i.ApplicationV1);
  if (e) return e;
  const t = i == null ? void 0 : i.ApplicationV2;
  return t ? ke(t) : null;
}
function Ze() {
  const i = Ae(), n = be(), e = globalThis.FormApplication ?? (n == null ? void 0 : n.FormApplication) ?? (i == null ? void 0 : i.FormApplication) ?? globalThis.Application ?? (n == null ? void 0 : n.Application) ?? (i == null ? void 0 : i.ApplicationV1);
  if (e) return e;
  const t = i == null ? void 0 : i.ApplicationV2;
  return t ? ke(t) : Q();
}
const Xe = Q();
function pe() {
  var i, n, e;
  return ((e = (n = (i = canvas == null ? void 0 : canvas.tokens) == null ? void 0 : i.controlled) == null ? void 0 : n[0]) == null ? void 0 : e.actor) ?? game.user.character ?? null;
}
function et() {
  var s, a, o, c, d, l, m, f, S;
  const i = [], n = /* @__PURE__ */ new Set(), e = Array.from(((a = (s = canvas == null ? void 0 : canvas.scene) == null ? void 0 : s.regions) == null ? void 0 : a.contents) ?? ((o = canvas == null ? void 0 : canvas.scene) == null ? void 0 : o.regions) ?? []);
  for (const p of g.getMachines()) {
    const N = e.find((y) => {
      var E, O;
      return (O = (E = p.regionIds) == null ? void 0 : E.includes) == null ? void 0 : O.call(E, String(y.id));
    });
    N && (n.add(p.id), i.push({
      regionId: N.id,
      machineId: p.id,
      name: p.name,
      description: p.description,
      image: g.getMachineDisplayImage(p),
      inventoryCount: ((c = p.inventory) == null ? void 0 : c.length) ?? 0,
      availableProducts: ((d = p.inventory) == null ? void 0 : d.filter((y) => y.stock > 0).length) ?? 0,
      totalStock: ((l = p.inventory) == null ? void 0 : l.reduce((y, E) => y + E.stock, 0)) ?? 0,
      state: g.getMachineState(p),
      offline: g.getMachineState(p) === "offline",
      linkLabel: `Region: ${N.name || N.id}`
    }));
  }
  const t = ((f = (m = canvas == null ? void 0 : canvas.scene) == null ? void 0 : m.tiles) == null ? void 0 : f.contents) ?? ((S = canvas == null ? void 0 : canvas.scene) == null ? void 0 : S.tiles) ?? [], r = Array.from(t).map((p) => {
    var E, O, C, w;
    const N = (E = p == null ? void 0 : p.getFlag) == null ? void 0 : E.call(p, u, W), y = N ? g.getMachine(N) : null;
    return !y || n.has(N) ? null : {
      tileId: p.id,
      machineId: N,
      name: y.name,
      description: y.description,
      image: g.getMachineDisplayImage(y),
      inventoryCount: ((O = y.inventory) == null ? void 0 : O.length) ?? 0,
      availableProducts: ((C = y.inventory) == null ? void 0 : C.filter((D) => D.stock > 0).length) ?? 0,
      totalStock: ((w = y.inventory) == null ? void 0 : w.reduce((D, h) => D + h.stock, 0)) ?? 0,
      state: g.getMachineState(y),
      offline: g.getMachineState(y) === "offline",
      linkLabel: "Legacy Tile"
    };
  }).filter(Boolean);
  return [...i, ...r];
}
class tt extends Xe {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "holosuite-vending-browser",
      classes: ["holosuite-vending-window", "holosuite-vending-browser-app"],
      template: Y.browser,
      width: 620,
      height: "auto",
      resizable: !0,
      title: "Vending Access"
    });
  }
  async getData() {
    var e;
    const n = pe();
    return {
      machines: et(),
      actorName: (n == null ? void 0 : n.name) ?? "",
      sceneName: ((e = canvas == null ? void 0 : canvas.scene) == null ? void 0 : e.name) ?? "Current Scene"
    };
  }
  activateListeners(n) {
    super.activateListeners(n), n.find("[data-action='open-machine']").on("click", (e) => {
      var o, c, d, l, m;
      const t = e.currentTarget.dataset.machineId, r = e.currentTarget.dataset.tileId, s = e.currentTarget.dataset.regionId, a = ((l = (d = (c = (o = canvas == null ? void 0 : canvas.tokens) == null ? void 0 : o.controlled) == null ? void 0 : c[0]) == null ? void 0 : d.document) == null ? void 0 : l.id) ?? "";
      game.holosuiteVending.openMachine(t, pe(), {
        source: s ? "region-browser" : "legacy-tile-browser",
        sceneId: ((m = canvas == null ? void 0 : canvas.scene) == null ? void 0 : m.id) ?? "",
        tileId: r,
        regionId: s,
        tokenId: a
      });
    });
  }
}
const K = Object.freeze({
  cp: 0.01,
  sp: 0.1,
  ep: 0.5,
  gp: 1,
  pp: 10
});
function z(i) {
  return Math.round((Number(i) + Number.EPSILON) * 1e8) / 1e8;
}
function B(i, n = K) {
  return Number(n[String(i).toLocaleLowerCase()]) || 1;
}
function ae(i = [], n = K) {
  return z((Array.isArray(i) ? i : []).reduce((e, t) => e + (Number(t == null ? void 0 : t.amount) || 0) * B(t == null ? void 0 : t.key, n), 0));
}
function nt(i = [], n = 0, e = K) {
  const t = Array.isArray(i) ? i : [], r = ae(t, e);
  let s = z(Math.max(0, r - Math.max(0, Number(n) || 0)));
  const a = [...t].sort((c, d) => B(d == null ? void 0 : d.key, e) - B(c == null ? void 0 : c.key, e)), o = {};
  return a.forEach((c, d) => {
    const l = B(c == null ? void 0 : c.key, e), f = d === a.length - 1 ? z(s / l) : Math.floor(z(s / l));
    o[c.path] = f, s = z(Math.max(0, s - f * l));
  }), {
    updates: o,
    totalBefore: r,
    totalAfter: ae(
      t.map((c) => ({ ...c, amount: o[c.path] ?? c.amount })),
      e
    )
  };
}
function it(i, n = null) {
  return i ? n && !n.isGM && i.userId !== n.id ? "forbidden" : i.status === "delivering" ? "busy" : "deliver" : "missing";
}
function rt(i, n = Date.now()) {
  return Math.max(0, Number(i) - Number(n));
}
const st = [
  "system.quantity",
  "system.qty",
  "system.amount",
  "system.count",
  "system.stack",
  "system.uses.value"
], ye = [
  "system.currency",
  "system.currencies",
  "system.money",
  "system.wealth",
  "system.resources.currency"
], at = K, ot = {
  cp: "CP",
  sp: "SP",
  ep: "EP",
  gp: "GP",
  pp: "PP",
  credits: "Credits",
  credit: "Credits",
  creds: "Credits",
  currency: "Currency",
  funds: "Funds",
  wealth: "Wealth"
};
function F(i) {
  for (const n of st) {
    const e = foundry.utils.getProperty(i, n);
    if (Number.isFinite(Number(e))) return { path: n, value: Number(e) };
  }
  return { path: null, value: 1 };
}
function le(i) {
  return Array.from((i == null ? void 0 : i.items) ?? []);
}
function ct(i, n) {
  const e = String(n).trim().toLocaleLowerCase();
  return le(i).find((t) => String(t.name).trim().toLocaleLowerCase() === e);
}
function ut(i, n) {
  return i == null || i === "" ? [] : Number.isFinite(Number(i)) ? [{ key: n.split(".").at(-1) || "currency", path: n, amount: Number(i) }] : typeof i != "object" || Array.isArray(i) ? [] : Object.entries(i).filter(([, e]) => e !== null && e !== "" && Number.isFinite(Number(e))).map(([e, t]) => ({ key: e, path: `${n}.${e}`, amount: Number(t) }));
}
function dt(i) {
  if (!i) return [];
  const n = g.getCurrencyPath(), e = n ? [n, ...ye] : ye, t = /* @__PURE__ */ new Set();
  for (const r of e) {
    if (!r || t.has(r)) continue;
    t.add(r);
    const s = ut(foundry.utils.getProperty(i, r), r);
    if (s.length) return s;
  }
  return [];
}
function lt(i) {
  return ae(i);
}
function mt(i) {
  const n = i.map((e) => String(e.key).toLocaleLowerCase());
  return n.some((e) => Object.hasOwn(at, e)) ? "GP" : n.length === 1 ? ot[n[0]] ?? String(i[0].key).toLocaleUpperCase() : g.getCurrencyName();
}
function J(i) {
  const n = g.getCurrencyMode(), e = dt(i);
  if ((n === "auto" || n === "actor") && e.length)
    return {
      kind: "actor",
      actor: i,
      entries: e,
      value: lt(e),
      label: g.getCreditTransformer() ? "Credits" : mt(e)
    };
  if (n === "actor") return { kind: "invalid", actor: i, value: 0, label: g.getCurrencyName() };
  const t = ct(i, g.getCurrencyName());
  return t ? { kind: "item", item: t, value: F(t).value, label: t.name || g.getCurrencyName() } : { kind: "missing", value: 0, label: g.getCurrencyName() };
}
function Ie(i, n) {
  var e;
  return !n || !i ? !1 : i.isGM ? !0 : ((e = n.testUserPermission) == null ? void 0 : e.call(n, i, "OWNER")) ?? !1;
}
function j(i, n) {
  var t;
  if (!i || !n) return null;
  const e = Array.from(i.contents ?? i);
  return ((t = i.get) == null ? void 0 : t.call(i, n)) ?? e.find((r) => (r == null ? void 0 : r.id) === n) ?? null;
}
function gt(i, n, e = "") {
  var s, a;
  const t = Array.from(((s = i == null ? void 0 : i.tokens) == null ? void 0 : s.contents) ?? (i == null ? void 0 : i.tokens) ?? []), r = e ? j(i == null ? void 0 : i.tokens, e) : null;
  return (r == null ? void 0 : r.actorId) === (n == null ? void 0 : n.id) || ((a = r == null ? void 0 : r.actor) == null ? void 0 : a.id) === (n == null ? void 0 : n.id) ? r : t.find((o) => {
    var c;
    return (o == null ? void 0 : o.actorId) === (n == null ? void 0 : n.id) || ((c = o == null ? void 0 : o.actor) == null ? void 0 : c.id) === (n == null ? void 0 : n.id);
  }) ?? null;
}
function Ne({ machine: i, actor: n, user: e, context: t = {} }) {
  var s, a, o, c, d, l;
  if (!i) return { allowed: !1, reason: game.i18n.localize("HOLOSUITEVENDING.Notifications.NoMachine") };
  if (g.getMachineState(i) === k.OFFLINE)
    return { allowed: !1, reason: game.i18n.localize("HOLOSUITEVENDING.Notifications.Offline") };
  if (e != null && e.isGM) return { allowed: !0, reason: "" };
  const r = String(((s = i.access) == null ? void 0 : s.requiredItemName) ?? "").trim();
  if (r && !le(n).find((f) => String((f == null ? void 0 : f.name) ?? "").trim().toLocaleLowerCase() === r.toLocaleLowerCase() && F(f).value > 0))
    return {
      allowed: !1,
      reason: game.i18n.format("HOLOSUITEVENDING.Notifications.RequiredItem", { item: r })
    };
  if ((a = i.access) != null && a.requireProximity) {
    const m = j(game.scenes, t.sceneId) ?? (canvas == null ? void 0 : canvas.scene), f = gt(m, n, t.tokenId);
    if (t.regionId) {
      const S = j(m == null ? void 0 : m.regions, t.regionId), p = t.source === "region-behavior" || t.source === "region-socket", N = (c = (o = i.regionIds) == null ? void 0 : o.includes) == null ? void 0 : c.call(o, String(t.regionId));
      if (!p || !S || !N || !f)
        return { allowed: !1, reason: game.i18n.localize("HOLOSUITEVENDING.Notifications.TooFar") };
    } else {
      const S = j(m == null ? void 0 : m.tiles, t.tileId), p = ((d = m == null ? void 0 : m.grid) == null ? void 0 : d.size) ?? ((l = canvas == null ? void 0 : canvas.grid) == null ? void 0 : l.size) ?? 100;
      if (!qe(f, S, p, i.access.proximityDistance))
        return { allowed: !1, reason: game.i18n.localize("HOLOSUITEVENDING.Notifications.TooFar") };
    }
    if (!f)
      return { allowed: !1, reason: game.i18n.localize("HOLOSUITEVENDING.Notifications.TooFar") };
  }
  return { allowed: !0, reason: "" };
}
async function ft(i) {
  var e, t, r;
  if (i.itemUuid) {
    const s = await fromUuid(i.itemUuid);
    if (s) return s.toObject ? s.toObject() : foundry.utils.deepClone(s);
  }
  if (i.embeddedData) return foundry.utils.deepClone(i.embeddedData);
  const n = ((r = (t = (e = game.system) == null ? void 0 : e.documentTypes) == null ? void 0 : t.Item) == null ? void 0 : r[0]) ?? "loot";
  return {
    name: i.displayName,
    type: n,
    img: i.image,
    system: {}
  };
}
async function ht(i, n) {
  if (!i || n <= 0) return null;
  if (i.kind === "actor") {
    const a = Object.fromEntries(i.entries.map((c) => [c.path, c.amount])), { updates: o } = nt(i.entries, n);
    return await i.actor.update(o), { type: "actor", actor: i.actor, previous: a };
  }
  if (i.kind !== "item") return null;
  const e = i.item, t = F(e), r = e.toObject ? e.toObject() : foundry.utils.deepClone(e), s = t.value - n;
  return s <= 0 ? (await e.delete(), { type: "deleted", actor: e.parent, snapshot: r }) : (await e.update({ [t.path]: s }), { type: "updated", item: e, path: t.path, previous: t.value });
}
async function pt(i) {
  if (!i) return;
  if (i.type === "actor") {
    await i.actor.update(i.previous);
    return;
  }
  if (i.type === "updated") {
    await i.item.update({ [i.path]: i.previous });
    return;
  }
  const n = foundry.utils.deepClone(i.snapshot);
  delete n._id, await i.actor.createEmbeddedDocuments("Item", [n]);
}
async function yt(i, n, e) {
  const t = foundry.utils.deepClone(n);
  delete t._id, t.name = t.name || "Vended Item", t.img = t.img || "icons/svg/item-bag.svg";
  const r = F(t), s = le(i).find((c) => c.name === t.name && c.type === t.type);
  if (s) {
    const c = F(s);
    if (c.path) {
      const d = Math.max(1, r.value) * e;
      return await s.update({ [c.path]: c.value + d }), { type: "updated", item: s, path: c.path, previous: c.value };
    }
  }
  if (r.path) {
    foundry.utils.setProperty(t, r.path, Math.max(1, r.value) * e);
    const c = await i.createEmbeddedDocuments("Item", [t]);
    return { type: "created", actor: i, ids: c.map((d) => d.id) };
  }
  const a = Array.from({ length: e }, () => foundry.utils.deepClone(t)), o = await i.createEmbeddedDocuments("Item", a);
  return { type: "created", actor: i, ids: o.map((c) => c.id) };
}
async function It(i) {
  var n;
  for (const e of [...i].reverse())
    e.type === "updated" ? await e.item.update({ [e.path]: e.previous }) : (n = e.ids) != null && n.length && await e.actor.deleteEmbeddedDocuments("Item", e.ids);
}
async function Z(i, n, e) {
  var t, r;
  if (game.user.id === i) {
    (r = (t = ui.notifications)[n]) == null || r.call(t, e);
    return;
  }
  game.socket.emit(H, { type: "notify", moduleId: u, userId: i, level: n, message: e });
}
function we(i, n) {
  const e = { type: "purchase-result", moduleId: u, userId: i, ...n };
  if (game.user.id === i) {
    Hooks.callAll(`${u}.purchaseResult`, e);
    return;
  }
  game.socket.emit(H, e);
}
function X(i, n) {
  const e = { type: "collection-result", moduleId: u, userId: i, ...n };
  if (game.user.id === i) {
    Hooks.callAll(`${u}.collectionResult`, e);
    return;
  }
  game.socket.emit(H, e);
}
async function Nt({ actor: i, itemSummary: n, totalPrice: e, currencyName: t }) {
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: i }),
    content: game.i18n.format("HOLOSUITEVENDING.Notifications.Purchased", {
      actor: i.name,
      item: n,
      price: L(e),
      currency: t
    })
  });
}
async function Se(i) {
  try {
    return await g.appendLedger(i);
  } catch (n) {
    return console.warn(`${u} | Could not update transaction ledger`, n), null;
  }
}
class b {
  static registerSocket() {
    game.socket.on(H, async (n) => {
      var e, t;
      if (!(!n || n.moduleId && n.moduleId !== u)) {
        if (n.type === "notify" && n.userId === game.user.id) {
          (t = (e = ui.notifications)[n.level || "info"]) == null || t.call(e, n.message);
          return;
        }
        if (n.type === "purchase-result" && n.userId === game.user.id) {
          Hooks.callAll(`${u}.purchaseResult`, n);
          return;
        }
        if (n.type === "collection-result" && n.userId === game.user.id) {
          Hooks.callAll(`${u}.collectionResult`, n);
          return;
        }
        if (n.type === "purchase" && game.user.isGM && this.isResponsibleGM()) {
          await this.handlePurchaseRequest(n);
          return;
        }
        n.type === "collection" && game.user.isGM && this.isResponsibleGM() && await this.handleCollectionRequest(n);
      }
    });
  }
  static isResponsibleGM() {
    const n = game.users.find((e) => e.active && e.isGM);
    return (n == null ? void 0 : n.id) === game.user.id;
  }
  static checkAccess({ machineId: n, actor: e, user: t = game.user, context: r = {} }) {
    return Ne({ machine: g.getMachine(n), actor: e, user: t, context: r });
  }
  static getCurrencyBalance(n) {
    return J(n).value;
  }
  static getCurrencyProfile(n) {
    const e = J(n);
    return { balance: e.value, label: e.label, source: e.kind };
  }
  static enqueue(n) {
    const e = this.transactionQueue.then(() => this.processPurchase(n));
    return this.transactionQueue = e.catch(() => {
    }), e;
  }
  static enqueueCollection(n) {
    const e = this.transactionQueue.then(() => this.finalizeDispense(n));
    return this.transactionQueue = e.catch(() => {
    }), e;
  }
  static scheduleDispense(n) {
    var a;
    const e = n == null ? void 0 : n.requestId;
    if (!e || !((a = game.user) != null && a.isGM) || !this.isResponsibleGM()) return;
    const t = this.dispenseTimers.get(e);
    t && window.clearTimeout(t);
    const r = rt(n.expiresAt), s = window.setTimeout(async () => {
      this.dispenseTimers.delete(e);
      try {
        await this.enqueueCollection({ requestId: e, automatic: !0 });
      } catch (o) {
        console.warn(`${u} | Automatic vending collection failed`, o);
      }
    }, Math.min(r, 2147e6));
    this.dispenseTimers.set(e, s);
  }
  static resumePendingDispenses() {
    var n;
    if (!(!((n = game.user) != null && n.isGM) || !this.isResponsibleGM()))
      for (const e of g.getPendingDispenses()) this.scheduleDispense(e);
  }
  static async requestPurchase({ machineId: n, entryId: e = "", lines: t = [], actor: r, context: s = {} }) {
    var l, m;
    const a = Me(t.length ? t : [{ entryId: e, quantity: 1 }]);
    if (!r)
      return ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoActor")), !1;
    if (!a.length) return !1;
    const o = this.checkAccess({ machineId: n, actor: r, context: s });
    if (!o.allowed)
      return ui.notifications.warn(o.reason), !1;
    const c = ((m = (l = foundry == null ? void 0 : foundry.utils) == null ? void 0 : l.randomID) == null ? void 0 : m.call(l, 16)) ?? `${game.user.id}-${Date.now()}-${Math.random()}`;
    if (game.user.isGM && this.isResponsibleGM())
      try {
        const f = await this.enqueue({ requestId: c, machineId: n, lines: a, actor: r, user: game.user, context: s });
        return { accepted: !0, pending: !1, requestId: c, result: f };
      } catch (f) {
        return ui.notifications.warn(f.message), !1;
      }
    return Ie(game.user, r) ? game.users.find((f) => f.active && f.isGM) ? (game.socket.emit(H, {
      type: "purchase",
      moduleId: u,
      requestId: c,
      userId: game.user.id,
      machineId: n,
      lines: a,
      actorUuid: r.uuid,
      context: s
    }), ui.notifications.info(game.i18n.localize("HOLOSUITEVENDING.Notifications.Processing")), { accepted: !0, pending: !0, requestId: c }) : (ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoGM")), !1) : (ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoActor")), !1);
  }
  static async handlePurchaseRequest(n) {
    var r, s, a;
    const e = game.users.get(n.userId), t = await fromUuid(n.actorUuid);
    try {
      const o = await this.enqueue({
        requestId: n.requestId,
        machineId: n.machineId,
        lines: n.lines,
        actor: t,
        user: e,
        context: n.context ?? {}
      });
      we(n.userId, {
        status: "success",
        requestId: n.requestId,
        machineId: n.machineId,
        reservationId: ((r = o == null ? void 0 : o.reservation) == null ? void 0 : r.requestId) ?? n.requestId,
        itemCount: ((s = o == null ? void 0 : o.cart) == null ? void 0 : s.itemCount) ?? 0,
        image: ((a = o == null ? void 0 : o.reservation) == null ? void 0 : a.image) ?? ""
      });
    } catch (o) {
      console.warn(`${u} | Purchase failed`, o), await Z(n.userId, "warn", o.message), we(n.userId, {
        status: "failed",
        requestId: n.requestId,
        machineId: n.machineId,
        message: o.message
      });
    }
  }
  static async requestCollection({ requestId: n, automatic: e = !1 }) {
    if (!n) return !1;
    if (game.user.isGM && this.isResponsibleGM())
      try {
        return { accepted: !0, pending: !1, result: await this.enqueueCollection({ requestId: n, user: game.user, automatic: e }) };
      } catch (r) {
        return ui.notifications.warn(r.message), !1;
      }
    return game.users.find((r) => r.active && r.isGM) ? (game.socket.emit(H, {
      type: "collection",
      moduleId: u,
      requestId: n,
      userId: game.user.id,
      automatic: e
    }), { accepted: !0, pending: !0 }) : (ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoGM")), !1);
  }
  static async handleCollectionRequest(n) {
    var e;
    try {
      const t = game.users.get(n.userId), r = await this.enqueueCollection({
        requestId: n.requestId,
        user: t,
        automatic: n.automatic === !0,
        notifyResult: !1
      });
      X(n.userId, {
        status: "success",
        requestId: n.requestId,
        machineId: ((e = r == null ? void 0 : r.reservation) == null ? void 0 : e.machineId) ?? "",
        automatic: (r == null ? void 0 : r.automatic) === !0
      });
    } catch (t) {
      console.warn(`${u} | Collection failed`, t), await Z(n.userId, "warn", t.message), X(n.userId, {
        status: "failed",
        requestId: n.requestId,
        message: t.message
      });
    }
  }
  static async processPurchase({ requestId: n, machineId: e, lines: t, actor: r, user: s, context: a = {} }) {
    var f, S, p;
    const o = g.getPendingDispense(n);
    if (o)
      return {
        duplicate: !0,
        reservation: o,
        cart: { itemCount: o.itemCount, totalPrice: o.totalPrice, lines: [] }
      };
    if (this.processedRequests.has(n) || g.hasProcessedRequest(n)) return { duplicate: !0 };
    const c = J(r), d = c.label;
    let l = g.getMachine(e);
    const m = {
      requestId: n,
      machineId: e,
      machineName: (l == null ? void 0 : l.name) ?? "Unknown machine",
      actorId: (r == null ? void 0 : r.id) ?? "",
      actorName: (r == null ? void 0 : r.name) ?? "Unknown actor",
      userId: (s == null ? void 0 : s.id) ?? "",
      userName: (s == null ? void 0 : s.name) ?? "Unknown user",
      currencyName: d
    };
    try {
      if (!Ie(s, r))
        throw new Error(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoActor"));
      l = g.getMachine(e);
      const N = Ne({ machine: l, actor: r, user: s, context: a });
      if (!N.allowed) throw new Error(N.reason);
      const y = Fe(l, t);
      if (!y.lines.length) throw new Error(game.i18n.localize("HOLOSUITEVENDING.Notifications.EmptyCart"));
      if (y.totalPrice > 0 && c.kind === "invalid")
        throw new Error(game.i18n.format("HOLOSUITEVENDING.Notifications.CurrencyPathInvalid", {
          path: g.getCurrencyPath() || "automatic detection"
        }));
      if (y.totalPrice > 0 && c.value < y.totalPrice)
        throw new Error(game.i18n.format("HOLOSUITEVENDING.Notifications.NoCurrency", { currency: d }));
      const E = [];
      for (const h of y.lines)
        E.push({ line: h, itemData: await ft(h.entry) });
      let O = null;
      const C = Object.fromEntries(y.lines.map((h) => [h.entryId, h.entry.stock]));
      let w = !1, D = null;
      try {
        O = await ht(c, y.totalPrice);
        const h = Object.fromEntries(y.lines.map((M) => [M.entryId, M.entry.stock - M.quantity]));
        await g.updateEntryStocks(e, h), w = !0;
        const v = y.lines.map((M) => `${M.quantity}× ${M.entry.displayName}`).join(", ");
        D = await g.addPendingDispense({
          id: n,
          requestId: n,
          machineId: e,
          machineName: l.name,
          actorUuid: r.uuid,
          actorId: r.id,
          actorName: r.name,
          userId: s.id,
          userName: s.name,
          currencyName: d,
          itemSummary: v,
          itemCount: y.itemCount,
          totalPrice: y.totalPrice,
          items: E.map((M) => ({
            itemData: M.itemData,
            quantity: M.line.quantity,
            displayName: M.line.entry.displayName,
            image: M.line.entry.image
          })),
          image: y.itemCount > 1 ? "icons/svg/item-bag.svg" : ((p = (S = (f = E[0]) == null ? void 0 : f.line) == null ? void 0 : S.entry) == null ? void 0 : p.image) ?? "",
          createdAt: Date.now(),
          expiresAt: Date.now() + 10850,
          status: "pending"
        });
      } catch (h) {
        if (w)
          try {
            await g.updateEntryStocks(e, C);
          } catch (v) {
            console.error(`${u} | Reserved-stock rollback failed`, v);
          }
        try {
          await pt(O);
        } catch (v) {
          console.error(`${u} | Currency rollback failed`, v);
        }
        throw h;
      }
      return this.processedRequests.add(n), this.processedRequests.size > 500 && this.processedRequests.delete(this.processedRequests.values().next().value), this.scheduleDispense(D), { cart: y, reservation: D };
    } catch (N) {
      throw await Se({ ...m, status: "failed", error: N.message }), N;
    }
  }
  static async finalizeDispense({ requestId: n, user: e = null, automatic: t = !1, notifyResult: r = !0 }) {
    const s = g.getPendingDispense(n), a = it(s, e);
    if (a === "missing") return { duplicate: !0, automatic: t };
    if (a === "forbidden")
      throw new Error(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoActor"));
    if (a === "busy")
      throw new Error(game.i18n.localize("HOLOSUITEVENDING.Notifications.CollectionBusy"));
    const o = await fromUuid(s.actorUuid);
    if (!o) throw new Error(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoActor"));
    await g.updatePendingDispense(n, { status: "delivering" });
    const c = [];
    try {
      for (const l of s.items)
        c.push(await yt(o, l.itemData, l.quantity));
      await g.removePendingDispense(n);
    } catch (l) {
      try {
        await It(c);
      } catch (m) {
        console.error(`${u} | Collected-item rollback failed`, m);
      }
      throw await g.updatePendingDispense(n, { status: "pending" }), this.scheduleDispense({ ...s, expiresAt: Date.now() + 5e3 }), l;
    }
    const d = this.dispenseTimers.get(n);
    d && window.clearTimeout(d), this.dispenseTimers.delete(n), await Se({
      requestId: n,
      machineId: s.machineId,
      machineName: s.machineName,
      actorId: s.actorId,
      actorName: s.actorName,
      userId: s.userId,
      userName: s.userName,
      currencyName: s.currencyName,
      status: "success",
      itemSummary: s.itemSummary,
      itemCount: s.itemCount,
      totalPrice: s.totalPrice
    });
    try {
      await Nt({
        actor: o,
        itemSummary: s.itemSummary,
        totalPrice: s.totalPrice,
        currencyName: s.currencyName
      });
    } catch (l) {
      console.warn(`${u} | Could not create purchase chat message`, l);
    }
    return await Z(s.userId, "info", game.i18n.format("HOLOSUITEVENDING.Notifications.Purchased", {
      actor: s.actorName,
      item: s.itemSummary,
      price: L(s.totalPrice),
      currency: s.currencyName
    })), t && r && X(s.userId, {
      status: "success",
      requestId: n,
      machineId: s.machineId,
      automatic: !0
    }), { reservation: s, automatic: t };
  }
  static async purchase({ machineId: n, entryId: e, actor: t, user: r, context: s = {} }) {
    var a, o;
    return this.enqueue({
      requestId: ((o = (a = foundry == null ? void 0 : foundry.utils) == null ? void 0 : a.randomID) == null ? void 0 : o.call(a, 16)) ?? `${Date.now()}-${Math.random()}`,
      machineId: n,
      lines: [{ entryId: e, quantity: 1 }],
      actor: t,
      user: r,
      context: s
    });
  }
}
T(b, "transactionQueue", Promise.resolve()), T(b, "processedRequests", /* @__PURE__ */ new Set()), T(b, "dispenseTimers", /* @__PURE__ */ new Map());
const wt = Q(), U = /* @__PURE__ */ new Set();
function St(i) {
  var n, e, t;
  return i || ((t = (e = (n = canvas == null ? void 0 : canvas.tokens) == null ? void 0 : n.controlled) == null ? void 0 : e[0]) != null && t.actor ? canvas.tokens.controlled[0].actor : game.user.character ?? null);
}
function oe(i) {
  const n = document.createElement("div");
  return n.innerHTML = String(i ?? ""), String(n.textContent ?? "").replace(/\s+/g, " ").trim();
}
function vt(i, n = 180) {
  const e = oe(i);
  if (e.length <= n) return e;
  const t = e.slice(0, Math.max(1, n - 1)), r = t.lastIndexOf(" "), s = r >= Math.floor(n * 0.65) ? r : t.length;
  return `${t.slice(0, s).trimEnd()}…`;
}
function Et(i) {
  const n = document.createElement("div");
  return n.textContent = String(i ?? ""), n.innerHTML;
}
async function Dt(i, n) {
  var t, r;
  if (!i) return null;
  const e = globalThis.AudioHelper ?? ((r = (t = globalThis.foundry) == null ? void 0 : t.audio) == null ? void 0 : r.AudioHelper);
  if (e != null && e.play)
    try {
      return await e.play({ src: i, volume: n, loop: !1 }, !1);
    } catch (s) {
      console.warn(`${u} | AudioHelper playback failed`, s);
    }
  try {
    const s = new Audio(i);
    return s.volume = n, await s.play(), s;
  } catch (s) {
    return console.warn(`${u} | Browser audio playback failed`, s), null;
  }
}
function ve(i) {
  try {
    typeof (i == null ? void 0 : i.stop) == "function" ? i.stop() : typeof (i == null ? void 0 : i.pause) == "function" && i.pause();
  } catch (n) {
    console.warn(`${u} | Could not stop vending audio`, n);
  }
}
class R extends wt {
  constructor(e, t = {}) {
    super(t);
    T(this, "machineId");
    T(this, "actor");
    T(this, "selectedEntryId");
    T(this, "context");
    T(this, "cart");
    T(this, "lastDispense");
    T(this, "pendingRequestId");
    T(this, "pendingDispense");
    T(this, "activeReservationId");
    T(this, "checkoutPending");
    T(this, "pendingFocusSelector");
    T(this, "dispenseTimers");
    T(this, "audioHandles");
    T(this, "viewportResizeHandler");
    this.machineId = e, this.actor = St(t.actor), this.selectedEntryId = t.selectedEntryId ?? null, this.context = t.context ?? {}, this.cart = /* @__PURE__ */ new Map(), this.lastDispense = null, this.pendingRequestId = null, this.pendingDispense = null, this.activeReservationId = null, this.checkoutPending = !1, this.pendingFocusSelector = "", this.dispenseTimers = /* @__PURE__ */ new Set(), this.audioHandles = /* @__PURE__ */ new Map(), this.viewportResizeHandler = () => this.applyViewportScale(), window.addEventListener("resize", this.viewportResizeHandler), this.options.id = `holosuite-vending-machine-${e}`, U.add(this);
  }
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "holosuite-vending-machine",
      classes: ["holosuite-vending-window", "holosuite-vending-app"],
      template: Y.vending,
      width: 1050,
      height: "auto",
      resizable: !1,
      minimizable: !1,
      title: "HoloSuite Vending Machine"
    });
  }
  get title() {
    var e;
    return ((e = g.getMachine(this.machineId)) == null ? void 0 : e.name) ?? "HoloSuite Vending Machine";
  }
  async close(e = {}) {
    this.clearDispenseTimers();
    for (const t of this.audioHandles.values()) ve(t);
    return this.audioHandles.clear(), window.removeEventListener("resize", this.viewportResizeHandler), U.delete(this), super.close(e);
  }
  get machine() {
    return g.getMachine(this.machineId);
  }
  playAudio(e) {
    const t = g.getAudioConfig(), r = t[e];
    !t.enabled || !r || t.volume <= 0 || (ve(this.audioHandles.get(e)), Dt(r, t.volume).then((s) => {
      s && this.audioHandles.set(e, s);
    }));
  }
  async openProductDetails(e) {
    var s, a, o;
    const t = (a = (s = this.machine) == null ? void 0 : s.inventory) == null ? void 0 : a.find((c) => c.id === e);
    if (!t) return;
    if (t.itemUuid)
      try {
        const c = await fromUuid(t.itemUuid);
        if ((o = c == null ? void 0 : c.sheet) != null && o.render) {
          c.sheet.render(!0);
          return;
        }
      } catch (c) {
        console.warn(`${u} | Could not open source item ${t.itemUuid}`, c);
      }
    const r = oe(t.description);
    new Dialog({
      title: t.displayName || "Product Details",
      content: `<div class="hsv-product-dialog"><p>${Et(r || "No product description supplied.")}</p></div>`,
      buttons: { close: { label: "Close" } },
      default: "close"
    }).render(!0);
  }
  clearDispenseTimers() {
    for (const e of this.dispenseTimers) window.clearTimeout(e);
    this.dispenseTimers.clear();
  }
  scheduleDispense(e, t) {
    const r = window.setTimeout(() => {
      this.dispenseTimers.delete(r), e();
    }, t);
    this.dispenseTimers.add(r);
  }
  beginDispenseSequence(e, t = "", r = "") {
    this.clearDispenseTimers(), this.pendingRequestId = null, this.pendingDispense = null, this.activeReservationId = r, this.checkoutPending = !1, this.lastDispense = { state: "dispensing", message: "ITEM TRANSFER IN PROGRESS", image: t }, this.playAudio("dispense"), this.render(!1), this.scheduleDispense(() => {
      this.lastDispense = {
        state: "ready",
        message: `${e} ITEM${e === 1 ? "" : "S"} — CLICK TO RETRIEVE`,
        image: t
      }, this.render(!1);
    }, 850);
  }
  async finishRetrieval(e = !1) {
    var s, a;
    if (((s = this.lastDispense) == null ? void 0 : s.state) !== "ready" || !this.activeReservationId) return;
    const t = this.lastDispense.image ?? "";
    this.lastDispense = { state: "collecting", message: e ? "AUTOMATIC TRANSFER" : "SECURING ITEM", image: t }, this.render(!1);
    const r = await b.requestCollection({ requestId: this.activeReservationId, automatic: e });
    if (!r) {
      this.lastDispense = { state: "ready", message: "CLICK TO RETRY COLLECTION", image: t }, this.render(!1);
      return;
    }
    r.pending || this.showCollectionComplete(((a = r.result) == null ? void 0 : a.automatic) === !0, t);
  }
  showCollectionComplete(e = !1, t = "") {
    this.clearDispenseTimers(), this.playAudio("collect"), this.activeReservationId = null, this.lastDispense = {
      state: e ? "automatic" : "collected",
      message: game.i18n.localize(e ? "HOLOSUITEVENDING.Retrieval.Automatic" : "HOLOSUITEVENDING.Retrieval.Collected"),
      image: t
    }, this.render(!1), this.scheduleDispense(() => {
      this.lastDispense = null, this.render(!1);
    }, 2400);
  }
  showDispenseFailure(e = "AUTHORIZATION FAILED") {
    this.clearDispenseTimers(), this.pendingRequestId = null, this.pendingDispense = null, this.checkoutPending = !1, this.playAudio("failure"), this.lastDispense = { state: "failure", message: e }, this.render(!1), this.scheduleDispense(() => {
      this.lastDispense = null, this.render(!1);
    }, 3500);
  }
  handlePurchaseResult(e) {
    if (e.machineId !== this.machineId || e.requestId !== this.pendingRequestId) return;
    const t = this.pendingDispense ?? { itemCount: Number(e.itemCount) || 1, image: "" };
    if (e.status === "success") {
      this.cart.clear(), this.beginDispenseSequence(
        Number(e.itemCount) || t.itemCount,
        e.image || t.image,
        e.reservationId || e.requestId
      );
      return;
    }
    this.showDispenseFailure(e.message || "AUTHORIZATION FAILED");
  }
  handleCollectionResult(e) {
    var r;
    if (e.requestId !== this.activeReservationId) return;
    const t = ((r = this.lastDispense) == null ? void 0 : r.image) ?? "";
    if (e.status === "success") {
      this.showCollectionComplete(e.automatic === !0, t);
      return;
    }
    this.lastDispense = { state: "ready", message: e.message || "CLICK TO RETRY COLLECTION", image: t }, this.render(!1);
  }
  pruneCart(e) {
    const t = new Map(e.map((r) => [r.id, r]));
    for (const [r, s] of this.cart) {
      const a = t.get(r);
      !a || a.stock <= 0 ? this.cart.delete(r) : this.cart.set(r, Math.min(s, a.stock));
    }
  }
  renderWithFocus(e = "") {
    this.pendingFocusSelector = e, this.render(!1);
  }
  applyViewportScale() {
    var d, l, m;
    const e = ((d = this.element) == null ? void 0 : d[0]) ?? this.element, t = (l = e == null ? void 0 : e.querySelector) == null ? void 0 : l.call(e, ".hsv-machine"), r = (m = t == null ? void 0 : t.querySelector) == null ? void 0 : m.call(t, ".hsv-machine-chassis");
    if (!t || !r) return;
    t.style.zoom = "1";
    const s = r.getBoundingClientRect();
    if (!s.width || !s.height) return;
    const a = Math.max(320, window.innerWidth - 28), o = Math.max(320, window.innerHeight - 28), c = Math.max(0.56, Math.min(1, a / s.width, o / s.height));
    t.style.zoom = String(Math.floor(c * 100) / 100), t.dataset.viewportScale = String(Math.round(c * 100));
  }
  async getData() {
    var w, D;
    const e = this.machine, t = (e == null ? void 0 : e.inventory) ?? [];
    this.pruneCart(t);
    const r = b.getCurrencyProfile(this.actor), s = r.balance;
    !this.selectedEntryId && t.length && (this.selectedEntryId = Ve(t, s));
    const a = t.find((h) => h.id === this.selectedEntryId) ?? t[0] ?? null;
    this.selectedEntryId = (a == null ? void 0 : a.id) ?? null;
    const o = t.filter((h) => this.cart.has(h.id)).map((h) => {
      const v = this.cart.get(h.id) ?? 0, M = h.price * v;
      return { ...h, quantity: v, lineTotal: M, lineTotalDisplay: L(M) };
    }), c = o.reduce((h, v) => h + v.quantity, 0), d = o.reduce((h, v) => h + v.lineTotal, 0), l = b.checkAccess({ machineId: this.machineId, actor: this.actor, context: this.context }), m = g.getMachineState(e), f = t.map((h, v) => {
      const M = h.maxStock > 0 ? h.stock / h.maxStock : 0, $ = h.stock > 0 ? Math.max(1, Math.ceil(M * 10)) : 0, q = oe(h.description);
      return {
        ...h,
        slotCode: `${String.fromCharCode(65 + Math.floor(v / 3))}${String(v % 3 + 1).padStart(2, "0")}`,
        selected: (a == null ? void 0 : a.id) === h.id,
        soldOut: h.stock <= 0,
        affordable: h.price <= s,
        priceDisplay: L(h.price),
        cartQuantity: this.cart.get(h.id) ?? 0,
        descriptionPreview: vt(h.description) || "No product profile supplied.",
        descriptionCanOpen: !!(h.itemUuid || q),
        stockSegments: Array.from({ length: 10 }, (me, He) => ({ active: He < $ }))
      };
    }), S = Math.max(6, Math.ceil(f.length / 3) * 3), p = Array.from({ length: S }, (h, v) => f[v] ? f[v] : {
      empty: !0,
      slotCode: `${String.fromCharCode(65 + Math.floor(v / 3))}${String(v % 3 + 1).padStart(2, "0")}`
    }), N = f.find((h) => h.id === (a == null ? void 0 : a.id)) ?? null, y = d > s, E = String((e == null ? void 0 : e.id) ?? this.machineId).replace(/[^a-z0-9]/gi, "").toUpperCase(), O = this.lastDispense ?? {
      state: "standby",
      message: m === "offline" ? "OUTPUT BAY LOCKED" : "AWAITING PURCHASE"
    }, C = {
      standby: m === "offline" ? "LOCKED" : "READY",
      authorizing: "AUTHORIZING",
      dispensing: "DISPENSING",
      ready: "COLLECT ITEM",
      collecting: "TRANSFERRING",
      collected: "ITEM COLLECTED",
      automatic: "AUTO DISPENSED",
      failure: "TRANSACTION FAILED"
    };
    return {
      machine: e,
      manufacturerName: (e == null ? void 0 : e.manufacturerName) ?? "HoloSuite",
      machineStyleId: (e == null ? void 0 : e.styleId) ?? "industrial",
      machineDisplayImage: g.getMachineDisplayImage(e),
      machineState: m,
      machineOffline: m === "offline",
      machineSoldOut: m === "sold-out",
      displaySlots: p,
      selected: N,
      selectedSoldOut: !N || N.stock <= 0,
      actorName: ((w = this.actor) == null ? void 0 : w.name) ?? "",
      currencyName: r.label,
      currencyBalance: s,
      currencyBalanceDisplay: L(s),
      accessAllowed: l.allowed,
      accessReason: l.reason,
      cartLines: o,
      cartCount: c,
      cartTotal: d,
      cartTotalDisplay: L(d),
      insufficientBalance: y,
      canCheckout: l.allowed && c > 0 && !y && !this.checkoutPending && !["authorizing", "dispensing", "ready", "collecting"].includes(((D = this.lastDispense) == null ? void 0 : D.state) ?? ""),
      checkoutPending: this.checkoutPending,
      unitNumber: `HSV-${E.slice(-6).padStart(6, "0")}`,
      systemStatus: m === "online" ? "NOMINAL" : m === "sold-out" ? "DEPLETED" : "OFFLINE",
      telemetryTemperature: m === "offline" ? "--" : "04 C",
      telemetryBus: m === "offline" ? "0 V" : "48 V",
      retrievalState: O.state,
      retrievalMessage: O.message,
      retrievalLabel: C[O.state] ?? "READY",
      retrievalImage: O.image ?? "",
      retrievalCanCollect: O.state === "ready"
    };
  }
  activateListeners(e) {
    var a;
    super.activateListeners(e), e.find("[data-action='close-machine']").on("click", () => this.close()), e.find("[data-action='collect-dispensed']").on("click", () => this.finishRetrieval(!1)), e.find("[data-action='open-product-details']").on("click", async (o) => {
      o.preventDefault(), await this.openProductDetails(o.currentTarget.dataset.entryId);
    });
    const t = (e == null ? void 0 : e[0]) ?? e, r = this.pendingFocusSelector;
    this.pendingFocusSelector = "", window.requestAnimationFrame(() => {
      var o, c, d;
      this.applyViewportScale(), r && ((d = (c = (o = t == null ? void 0 : t.querySelector) == null ? void 0 : o.call(t, r)) == null ? void 0 : c.focus) == null || d.call(c));
    });
    const s = (a = t == null ? void 0 : t.querySelector) == null ? void 0 : a.call(t, "[data-drag-handle]");
    s == null || s.addEventListener("pointerdown", (o) => {
      var N, y;
      const c = o.target;
      if (o.button !== 0 || c.closest("button, input, select, textarea, a")) return;
      const d = ((N = this.element) == null ? void 0 : N[0]) ?? this.element ?? ((y = t.closest) == null ? void 0 : y.call(t, ".window-app, .application, .app"));
      if (!(d != null && d.getBoundingClientRect)) return;
      o.preventDefault();
      const l = d.getBoundingClientRect(), m = o.clientX, f = o.clientY, S = (E) => {
        var h;
        const O = l.left + E.clientX - m, C = l.top + E.clientY - f, w = Math.min(window.innerWidth - 80, Math.max(80 - l.width, O)), D = Math.min(window.innerHeight - 40, Math.max(0, C));
        (h = this.setPosition) == null || h.call(this, { left: Math.round(w), top: Math.round(D) });
      }, p = () => {
        document.removeEventListener("pointermove", S), document.removeEventListener("pointerup", p), document.removeEventListener("pointercancel", p);
      };
      document.addEventListener("pointermove", S), document.addEventListener("pointerup", p), document.addEventListener("pointercancel", p);
    }), e.find("[data-action='select-entry']").on("click", (o) => {
      var d, l;
      this.selectedEntryId !== o.currentTarget.dataset.entryId && this.playAudio("select"), this.selectedEntryId = o.currentTarget.dataset.entryId;
      const c = ((l = (d = globalThis.CSS) == null ? void 0 : d.escape) == null ? void 0 : l.call(d, this.selectedEntryId)) ?? this.selectedEntryId;
      this.renderWithFocus(`[data-action='select-entry'][data-entry-id='${c}']`);
    }), e.find("[data-action='decrease-quantity'], [data-action='increase-quantity']").on("click", (o) => {
      const c = e.find("[name='purchaseQuantity']"), d = Math.max(1, Number(c.attr("min")) || 1), l = Math.max(d, Number(c.attr("max")) || d), m = o.currentTarget.dataset.action === "increase-quantity" ? 1 : -1, f = Math.min(l, Math.max(d, (Number(c.val()) || d) + m));
      c.val(f).trigger("change");
    }), e.find("[data-action='add-to-cart']").on("click", () => {
      var l, m;
      const o = (m = (l = this.machine) == null ? void 0 : l.inventory) == null ? void 0 : m.find((f) => f.id === this.selectedEntryId);
      if (!o || o.stock <= 0) return;
      const c = Math.max(1, Math.floor(Number(e.find("[name='purchaseQuantity']").val()) || 1)), d = Math.min(o.stock, (this.cart.get(o.id) ?? 0) + c);
      this.cart.set(o.id, d), this.renderWithFocus("[data-action='add-to-cart']");
    }), e.find("[data-action='remove-from-cart']").on("click", (o) => {
      this.cart.delete(o.currentTarget.dataset.entryId), this.renderWithFocus("[data-action='add-to-cart']");
    }), e.find("[data-action='clear-cart']").on("click", () => {
      var c, d;
      this.cart.clear();
      const o = ((d = (c = globalThis.CSS) == null ? void 0 : c.escape) == null ? void 0 : d.call(c, this.selectedEntryId ?? "")) ?? this.selectedEntryId;
      this.renderWithFocus(`[data-action='select-entry'][data-entry-id='${o}']`);
    }), e.find("[data-action='checkout']").on("click", async () => {
      var S, p, N, y, E, O, C, w, D;
      if (!this.actor) {
        ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoActor"));
        return;
      }
      const o = Array.from(this.cart, ([h, v]) => ({ entryId: h, quantity: v }));
      if (!o.length) return;
      const c = o.reduce((h, v) => h + v.quantity, 0), d = o.reduce((h, v) => {
        var $, q;
        const M = (q = ($ = this.machine) == null ? void 0 : $.inventory) == null ? void 0 : q.find((me) => me.id === v.entryId);
        return h + ((M == null ? void 0 : M.price) ?? 0) * v.quantity;
      }, 0), l = c > 1 ? "icons/svg/item-bag.svg" : ((N = (p = (S = this.machine) == null ? void 0 : S.inventory) == null ? void 0 : p.find((h) => h.id === o[0].entryId)) == null ? void 0 : N.image) ?? "";
      if (!await Dialog.confirm({
        title: game.i18n.localize("HOLOSUITEVENDING.Cart.Checkout"),
        content: `<p>${game.i18n.format("HOLOSUITEVENDING.Cart.Confirm", {
          count: c,
          total: L(d),
          currency: b.getCurrencyProfile(this.actor).label
        })}</p>`
      })) return;
      this.checkoutPending = !0, this.lastDispense = { state: "authorizing", message: "SUBMITTING PURCHASE" }, this.render(!1), this.playAudio("purchase");
      const f = await b.requestPurchase({
        machineId: this.machineId,
        lines: o,
        actor: this.actor,
        context: this.context
      });
      if (f)
        if (f.pending) {
          this.clearDispenseTimers(), this.pendingRequestId = f.requestId, this.pendingDispense = { itemCount: c, image: l }, this.lastDispense = { state: "authorizing", message: "AWAITING GM AUTHORIZATION" }, this.render(!1);
          const h = f.requestId;
          this.scheduleDispense(() => {
            this.pendingRequestId === h && this.showDispenseFailure("AUTHORIZATION TIMED OUT");
          }, 15e3);
        } else
          this.cart.clear(), this.beginDispenseSequence(
            ((E = (y = f.result) == null ? void 0 : y.cart) == null ? void 0 : E.itemCount) ?? c,
            ((C = (O = f.result) == null ? void 0 : O.reservation) == null ? void 0 : C.image) || l,
            ((D = (w = f.result) == null ? void 0 : w.reservation) == null ? void 0 : D.requestId) || f.requestId
          );
      else
        this.showDispenseFailure("AUTHORIZATION FAILED — CART PRESERVED");
    });
  }
  static refreshMachine(e) {
    for (const t of U)
      t.machineId === e && t.render(!1);
  }
  static refreshAll() {
    for (const e of U) e.render(!1);
  }
  static handlePurchaseResult(e) {
    for (const t of U) t.handlePurchaseResult(e);
  }
  static handleCollectionResult(e) {
    for (const t of U) t.handleCollectionResult(e);
  }
}
const Tt = Q(), Ot = Ze();
function Mt(i) {
  var e;
  const n = {
    machine: {},
    entries: {}
  };
  for (const [t, r] of new FormData(i).entries()) {
    const s = String(t), a = String(r ?? "");
    if (s.startsWith("machine.")) {
      n.machine[s.slice(8)] = a;
      continue;
    }
    const o = s.match(/^entries\.([^.]+)\.([^.]+)$/);
    if (!o) continue;
    const [, c, d] = o;
    (e = n.entries)[c] ?? (e[c] = {}), n.entries[c][d] = a;
  }
  return n;
}
function _(i, n = 0) {
  const e = Number(i);
  return Number.isFinite(e) ? e : n;
}
function Ee(i, n) {
  const e = JSON.stringify(i, null, 2), t = globalThis.saveDataToFile;
  if (typeof t == "function") {
    t(e, "application/json", n);
    return;
  }
  const r = URL.createObjectURL(new Blob([e], { type: "application/json" })), s = document.createElement("a");
  s.href = r, s.download = n, s.click(), URL.revokeObjectURL(r);
}
async function Ct() {
  return new Promise((i, n) => {
    const e = document.createElement("input");
    e.type = "file", e.accept = ".json,application/json", e.addEventListener("change", async () => {
      var t;
      try {
        const r = (t = e.files) == null ? void 0 : t[0];
        if (!r) return i(null);
        i(JSON.parse(await r.text()));
      } catch (r) {
        n(r);
      }
    }, { once: !0 }), e.click();
  });
}
function ee(i = []) {
  var e, t, r;
  const n = new Set(i);
  return Array.from(((t = (e = canvas == null ? void 0 : canvas.scene) == null ? void 0 : e.regions) == null ? void 0 : t.contents) ?? ((r = canvas == null ? void 0 : canvas.scene) == null ? void 0 : r.regions) ?? []).map((s) => ({
    id: String(s.id ?? ""),
    name: String(s.name || s.id || "Unnamed Region"),
    selected: n.has(String(s.id ?? ""))
  })).filter((s) => s.id);
}
async function At(i) {
  var s, a, o;
  const n = (s = i.dataTransfer) == null ? void 0 : s.getData("text/plain");
  if (!n) return null;
  const e = JSON.parse(n), t = await Item.fromDropData(e);
  if (!t) return null;
  const r = t.toObject();
  return g.createEntry({
    itemUuid: t.uuid ?? e.uuid ?? "",
    embeddedData: r,
    displayName: t.name,
    image: t.img,
    description: ((o = (a = r.system) == null ? void 0 : a.description) == null ? void 0 : o.value) || "",
    price: 0,
    stock: 1,
    maxStock: 1
  });
}
class Le extends Ot {
  constructor(e = {}) {
    super(e);
    T(this, "machineChangeHook");
    this.machineChangeHook = Hooks.on(`${u}.machinesChanged`, () => this.render(!1));
  }
  async close(e = {}) {
    return this.machineChangeHook !== void 0 && Hooks.off(`${u}.machinesChanged`, this.machineChangeHook), super.close(e);
  }
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "holosuite-vending-manager",
      classes: ["holosuite-vending-window", "holosuite-vending-manager-app"],
      template: Y.manager,
      width: 880,
      height: 720,
      resizable: !0,
      title: "HoloSuite Vending Machines"
    });
  }
  async getData() {
    const e = g.getLedger().entries.slice(-25).reverse().map((t) => ({
      ...t,
      totalPriceDisplay: L(t.totalPrice),
      timeLabel: new Date(t.timestamp).toLocaleString(),
      failed: t.status === "failed"
    }));
    return {
      machines: g.getMachines().map((t) => {
        var r;
        return {
          ...t,
          state: g.getMachineState(t),
          stateLabel: g.getMachineState(t) === "sold-out" ? "Sold Out" : g.getMachineState(t) === "offline" ? "Offline" : "Online",
          online: t.status !== "offline",
          toggleLabel: t.status === "offline" ? "Bring Online" : "Take Offline",
          styleLabel: ((r = ue.find((s) => s.id === t.styleId)) == null ? void 0 : r.label) ?? "Industrial Chassis",
          regionCount: t.regionIds.length,
          totalStock: t.inventory.reduce((s, a) => s + a.stock, 0),
          totalCapacity: t.inventory.reduce((s, a) => s + a.maxStock, 0)
        };
      }),
      currencyName: g.getCurrencyName(),
      currencySourceLabel: g.getCurrencySourceLabel(),
      creditTransformer: g.getCreditTransformer(),
      ledger: e,
      hasLedger: e.length > 0
    };
  }
  activateListeners(e) {
    super.activateListeners(e), e.find("[name='creditTransformer']").on("change", async (t) => {
      await g.setCreditTransformer(t.currentTarget.checked), this.render(!1);
    }), e.find("[data-action='open-machine']").on("click", (t) => {
      var o, c, d, l, m;
      const r = t.currentTarget.dataset.machineId, s = ((c = (o = canvas == null ? void 0 : canvas.tokens) == null ? void 0 : o.controlled) == null ? void 0 : c[0]) ?? null, a = (s == null ? void 0 : s.actor) ?? ((d = game.user) == null ? void 0 : d.character) ?? null;
      if (!a) {
        ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.SelectTestActor"));
        return;
      }
      new R(r, {
        actor: a,
        context: {
          source: "gm-test",
          sceneId: ((l = canvas == null ? void 0 : canvas.scene) == null ? void 0 : l.id) ?? "",
          tokenId: ((m = s == null ? void 0 : s.document) == null ? void 0 : m.id) ?? (s == null ? void 0 : s.id) ?? ""
        }
      }).render(!0);
    }), e.find("[data-action='create-machine']").on("click", () => {
      const t = g.createMachine();
      new te(t.id, { draft: t, isNew: !0 }).render(!0);
    }), e.find("[data-action='duplicate-machine']").on("click", async (t) => {
      const r = g.getMachine(t.currentTarget.dataset.machineId);
      if (!r) return;
      const s = foundry.utils.deepClone(r);
      delete s.id, s.name = `${r.name} Copy`;
      const a = await g.upsertMachine(g.createMachine(s));
      this.render(!1), new te(a.id).render(!0);
    }), e.find("[data-action='toggle-machine']").on("click", async (t) => {
      const r = g.getMachine(t.currentTarget.dataset.machineId);
      r && (r.status = r.status === "offline" ? "online" : "offline", await g.upsertMachine(r), this.render(!1));
    }), e.find("[data-action='restock-machine']").on("click", async (t) => {
      await g.restockMachine(t.currentTarget.dataset.machineId), ui.notifications.info(game.i18n.localize("HOLOSUITEVENDING.Notifications.Restocked")), this.render(!1);
    }), e.find("[data-action='restock-all']").on("click", async () => {
      await Dialog.confirm({
        title: game.i18n.localize("HOLOSUITEVENDING.Manager.RestockAllTitle"),
        content: `<p>${game.i18n.localize("HOLOSUITEVENDING.Manager.RestockAllConfirm")}</p>`
      }) && (await g.restockAll(), ui.notifications.info(game.i18n.localize("HOLOSUITEVENDING.Notifications.RestockedAll")), this.render(!1));
    }), e.find("[data-action='export-machines']").on("click", () => {
      Ee(g.exportData(), "holosuite-vending-machines.json");
    }), e.find("[data-action='import-machines']").on("click", async () => {
      try {
        const t = await Ct();
        if (!t) return;
        const r = await g.importData(t);
        ui.notifications.info(game.i18n.format("HOLOSUITEVENDING.Notifications.Imported", { count: r })), this.render(!1);
      } catch (t) {
        console.error(`${u} | Import failed`, t), ui.notifications.error((t == null ? void 0 : t.message) || game.i18n.localize("HOLOSUITEVENDING.Notifications.ImportFailed"));
      }
    }), e.find("[data-action='export-ledger']").on("click", () => {
      Ee(g.getLedger(), "holosuite-vending-ledger.json");
    }), e.find("[data-action='clear-ledger']").on("click", async () => {
      await Dialog.confirm({
        title: game.i18n.localize("HOLOSUITEVENDING.Ledger.Clear"),
        content: `<p>${game.i18n.localize("HOLOSUITEVENDING.Ledger.ClearConfirm")}</p>`
      }) && (await g.clearLedger(), this.render(!1));
    }), e.find("[data-action='edit-machine']").on("click", (t) => {
      new te(t.currentTarget.dataset.machineId).render(!0);
    }), e.find("[data-action='delete-machine']").on("click", async (t) => {
      const r = t.currentTarget.dataset.machineId;
      await Dialog.confirm({
        title: "Delete Vending Machine",
        content: "<p>Delete this vending machine? Linked Regions and legacy Tiles will no longer open it.</p>"
      }) && await g.deleteMachine(r), this.render(!1);
    });
  }
}
class te extends Tt {
  constructor(e, t = {}) {
    super(t);
    T(this, "machineId");
    T(this, "draft");
    T(this, "isDirty");
    this.machineId = e, this.draft = foundry.utils.deepClone(t.draft ?? g.getMachine(e) ?? g.createMachine({ id: e })), this.isDirty = t.isNew === !0, this.options.id = `holosuite-vending-editor-${e}`;
  }
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "holosuite-vending-editor",
      classes: ["holosuite-vending-window", "holosuite-vending-editor-app"],
      template: Y.editor,
      width: 940,
      height: 760,
      resizable: !0,
      title: "Edit Vending Machine"
    });
  }
  get title() {
    var e;
    return ((e = this.draft) == null ? void 0 : e.name) ?? "Edit Vending Machine";
  }
  async close(e = {}) {
    return this.isDirty && e.force !== !0 && !await Dialog.confirm({
      title: game.i18n.localize("HOLOSUITEVENDING.Editor.UnsavedTitle"),
      content: `<p>${game.i18n.localize("HOLOSUITEVENDING.Editor.UnsavedConfirm")}</p>`
    }) ? this : super.close(e);
  }
  async getData() {
    var t, r, s;
    const e = this.draft;
    return {
      machine: e,
      entries: e.inventory.map((a, o) => ({
        ...a,
        slotCode: `${String.fromCharCode(65 + Math.floor(o / 3))}${String(o % 3 + 1).padStart(2, "0")}`,
        isFirst: o === 0,
        isLast: o === e.inventory.length - 1
      })),
      inventoryCount: (e == null ? void 0 : e.inventory.length) ?? 0,
      inventoryFull: ((e == null ? void 0 : e.inventory.length) ?? 0) >= A,
      archivedProductCount: ((t = e == null ? void 0 : e.overflowInventory) == null ? void 0 : t.length) ?? 0,
      hasArchivedProducts: (((r = e == null ? void 0 : e.overflowInventory) == null ? void 0 : r.length) ?? 0) > 0,
      maxProducts: A,
      isDirty: this.isDirty,
      styleOptions: ue.map((a) => ({
        ...a,
        selected: (e == null ? void 0 : e.styleId) === a.id
      })),
      machineOffline: (e == null ? void 0 : e.status) === "offline",
      regionOptions: ee((e == null ? void 0 : e.regionIds) ?? []),
      hasSceneRegions: ee().length > 0,
      sceneName: ((s = canvas == null ? void 0 : canvas.scene) == null ? void 0 : s.name) ?? "Current Scene",
      currencyName: g.getCurrencyName()
    };
  }
  markDirty(e) {
    var t, r, s;
    this.isDirty = !0, (s = (r = (t = e == null ? void 0 : e.find) == null ? void 0 : t.call(e, "[data-save-state]")) == null ? void 0 : r.text) == null || s.call(r, game.i18n.localize("HOLOSUITEVENDING.Editor.DraftChanges"));
  }
  syncDraftFromForm(e) {
    var c, d, l, m, f, S, p, N, y, E, O, C;
    if (!e) return this.draft;
    const t = Mt(e), r = this.draft, s = new Set(ee().map((w) => w.id)), a = new FormData(e).getAll("machine.regionIds").map((w) => String(w)).filter(Boolean), o = [
      ...(r.regionIds ?? []).filter((w) => !s.has(w)),
      ...a
    ];
    return this.draft = {
      ...r,
      name: ((c = t.machine) == null ? void 0 : c.name) || r.name,
      manufacturerName: ((d = t.machine) == null ? void 0 : d.manufacturerName) || r.manufacturerName,
      styleId: ((l = t.machine) == null ? void 0 : l.styleId) || r.styleId,
      description: ((m = t.machine) == null ? void 0 : m.description) || "",
      image: ((f = t.machine) == null ? void 0 : f.image) || "",
      offlineImage: ((S = t.machine) == null ? void 0 : S.offlineImage) || "",
      soldOutImage: ((p = t.machine) == null ? void 0 : p.soldOutImage) || "",
      status: ((N = t.machine) == null ? void 0 : N.status) === "offline" ? "offline" : "online",
      regionIds: o,
      access: {
        requireProximity: !!((y = e.querySelector("[name='machine.requireProximity']")) != null && y.checked),
        proximityDistance: Math.max(1, _((E = t.machine) == null ? void 0 : E.proximityDistance, ((O = r.access) == null ? void 0 : O.proximityDistance) ?? 2)),
        requiredItemName: ((C = t.machine) == null ? void 0 : C.requiredItemName) || ""
      },
      inventory: r.inventory.map((w) => {
        var h;
        const D = ((h = t.entries) == null ? void 0 : h[w.id]) ?? {};
        return g.createEntry({
          ...w,
          displayName: D.displayName || w.displayName,
          image: D.image || w.image,
          itemUuid: D.itemUuid || w.itemUuid,
          price: _(D.price, w.price),
          stock: _(D.stock, w.stock),
          maxStock: _(D.maxStock, w.maxStock),
          description: D.description ?? w.description
        });
      })
    }, this.draft.id = this.machineId, this.draft;
  }
  activateListeners(e) {
    super.activateListeners(e), e.find("form").on("submit", async (t) => {
      t.preventDefault(), t.stopPropagation();
    }), e.find("input, textarea, select").on("input change", () => this.markDirty(e)), e.find("[name='machine.styleId']").on("change", (t) => {
      var s, a;
      const r = (s = t.currentTarget.selectedOptions) == null ? void 0 : s[0];
      e.find("[data-style-preview]").attr("data-machine-style", t.currentTarget.value), e.find("[data-style-description]").text(((a = r == null ? void 0 : r.dataset) == null ? void 0 : a.description) || "");
    }), e.find("[name='machine.name']").on("input", (t) => e.find("[data-preview-name]").text(t.currentTarget.value || "Vending Machine")), e.find("[name='machine.manufacturerName']").on("input", (t) => e.find("[data-preview-manufacturer]").text(t.currentTarget.value || "HoloSuite")), e.find("[data-action='save-machine'], [data-action='save-and-test']").on("click", async (t) => {
      var s, a, o, c, d;
      t.preventDefault(), t.stopPropagation();
      const r = t.currentTarget.closest("form");
      if (r)
        try {
          if (await this.save(r), ui.notifications.info(game.i18n.localize("HOLOSUITEVENDING.Editor.Saved")), e.find("[data-save-state]").text(game.i18n.localize("HOLOSUITEVENDING.Editor.AllChangesSaved")), t.currentTarget.dataset.action === "save-and-test") {
            const l = ((a = (s = canvas == null ? void 0 : canvas.tokens) == null ? void 0 : s.controlled) == null ? void 0 : a[0]) ?? null, m = (l == null ? void 0 : l.actor) ?? ((o = game.user) == null ? void 0 : o.character) ?? null;
            if (!m) {
              ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.SelectTestActor"));
              return;
            }
            new R(this.machineId, {
              actor: m,
              context: { source: "gm-test", sceneId: ((c = canvas == null ? void 0 : canvas.scene) == null ? void 0 : c.id) ?? "", tokenId: ((d = l == null ? void 0 : l.document) == null ? void 0 : d.id) ?? (l == null ? void 0 : l.id) ?? "" }
            }).render(!0);
          }
        } catch (l) {
          console.error(`${u} | Failed to save vending machine`, l), ui.notifications.error("Could not save vending machine. Check the console for details.");
        }
    }), e.find("[data-action='cancel-edit']").on("click", () => this.close()), e.find("[data-action='browse-machine-image']").on("click", (t) => {
      var a;
      t.preventDefault();
      const r = t.currentTarget.dataset.target || "machine.image", s = (a = t.currentTarget.closest(".holosuite-vending-path-row")) == null ? void 0 : a.querySelector(`[name='${r}']`);
      if (!s || typeof FilePicker > "u") {
        ui.notifications.warn("Foundry FilePicker is not available.");
        return;
      }
      new FilePicker({
        type: "image",
        current: s.value,
        callback: (o) => {
          s.value = o, s.dispatchEvent(new Event("input", { bubbles: !0 }));
        }
      }).browse();
    }), e.find("[data-action='add-entry']").on("click", (t) => {
      if (this.syncDraftFromForm(t.currentTarget.closest("form")), this.draft.inventory.length >= A) {
        ui.notifications.warn(game.i18n.format("HOLOSUITEVENDING.Notifications.ProductLimit", { max: A }));
        return;
      }
      this.draft.inventory.push(g.createEntry()), this.isDirty = !0, this.render(!1);
    }), e.find("[data-action='restore-archived']").on("click", (t) => {
      var r;
      this.syncDraftFromForm(t.currentTarget.closest("form")), !(this.draft.inventory.length >= A || !((r = this.draft.overflowInventory) != null && r.length)) && (this.draft.inventory.push(this.draft.overflowInventory.shift()), this.isDirty = !0, this.render(!1));
    }), e.find("[data-action='discard-archived']").on("click", async (t) => {
      await Dialog.confirm({
        title: game.i18n.localize("HOLOSUITEVENDING.Editor.DiscardArchivedTitle"),
        content: `<p>${game.i18n.localize("HOLOSUITEVENDING.Editor.DiscardArchivedConfirm")}</p>`
      }) && (this.syncDraftFromForm(t.currentTarget.closest("form")), this.draft.overflowInventory = [], this.isDirty = !0, this.render(!1));
    }), e.find("[data-action='remove-entry']").on("click", async (t) => {
      await Dialog.confirm({
        title: game.i18n.localize("HOLOSUITEVENDING.Editor.RemoveProductTitle"),
        content: `<p>${game.i18n.localize("HOLOSUITEVENDING.Editor.RemoveProductConfirm")}</p>`
      }) && (this.syncDraftFromForm(t.currentTarget.closest("form")), this.draft.inventory = this.draft.inventory.filter((s) => s.id !== t.currentTarget.dataset.entryId), this.isDirty = !0, this.render(!1));
    }), e.find("[data-action='move-entry-up'], [data-action='move-entry-down']").on("click", (t) => {
      this.syncDraftFromForm(t.currentTarget.closest("form"));
      const r = this.draft.inventory.findIndex((o) => o.id === t.currentTarget.dataset.entryId), s = t.currentTarget.dataset.action === "move-entry-up" ? -1 : 1, a = r + s;
      r < 0 || a < 0 || a >= this.draft.inventory.length || ([this.draft.inventory[r], this.draft.inventory[a]] = [this.draft.inventory[a], this.draft.inventory[r]], this.isDirty = !0, this.render(!1));
    }), e.find(".holosuite-vending-entry-editor").on("dragstart", (t) => {
      var s, a;
      const r = t.originalEvent;
      if (!((a = (s = r.target) == null ? void 0 : s.closest) != null && a.call(s, ".hsv-drag-handle"))) {
        t.preventDefault();
        return;
      }
      r.dataTransfer.effectAllowed = "move", r.dataTransfer.setData("application/x-holosuite-vending-entry", t.currentTarget.dataset.entryId);
    }), e.find(".holosuite-vending-entry-editor").on("dragover", (t) => {
      var r;
      Array.from(((r = t.originalEvent.dataTransfer) == null ? void 0 : r.types) ?? []).includes("application/x-holosuite-vending-entry") && t.preventDefault();
    }), e.find(".holosuite-vending-entry-editor").on("drop", (t) => {
      var c;
      const r = (c = t.originalEvent.dataTransfer) == null ? void 0 : c.getData("application/x-holosuite-vending-entry");
      if (!r) return;
      t.preventDefault(), t.stopPropagation(), this.syncDraftFromForm(t.currentTarget.closest("form"));
      const s = this.draft.inventory.findIndex((d) => d.id === r), a = this.draft.inventory.findIndex((d) => d.id === t.currentTarget.dataset.entryId);
      if (s < 0 || a < 0 || s === a) return;
      const [o] = this.draft.inventory.splice(s, 1);
      this.draft.inventory.splice(a, 0, o), this.isDirty = !0, this.render(!1);
    }), e.find(".holosuite-vending-drop-zone").on("dragover", (t) => t.preventDefault()), e.find(".holosuite-vending-drop-zone").on("drop", async (t) => {
      var r;
      t.preventDefault();
      try {
        if ((r = t.originalEvent.dataTransfer) != null && r.getData("application/x-holosuite-vending-entry")) return;
        if (this.syncDraftFromForm(t.currentTarget.closest("form")), this.draft.inventory.length >= A) {
          ui.notifications.warn(game.i18n.format("HOLOSUITEVENDING.Notifications.ProductLimit", { max: A }));
          return;
        }
        const s = await At(t.originalEvent);
        if (!s) return;
        this.draft.inventory.push(s), this.isDirty = !0, this.render(!1);
      } catch (s) {
        console.warn(`${u} | Item drop failed`, s), ui.notifications.warn("Could not add that item to the vending machine.");
      }
    });
  }
  async save(e) {
    this.syncDraftFromForm(e), this.draft = foundry.utils.deepClone(await g.upsertMachine(this.draft)), this.isDirty = !1;
  }
}
const ce = "executeScript", bt = /* @__PURE__ */ new Set(["holosuiteVending", `${u}.openMachine`]);
function kt() {
  var i, n, e;
  return Array.from(((n = (i = canvas == null ? void 0 : canvas.scene) == null ? void 0 : i.regions) == null ? void 0 : n.contents) ?? ((e = canvas == null ? void 0 : canvas.scene) == null ? void 0 : e.regions) ?? []);
}
function Lt(i, n) {
  return Array.from((i == null ? void 0 : i.behaviors) ?? []).find((e) => {
    var t, r;
    return (e == null ? void 0 : e.type) === ce && String(((r = (t = e == null ? void 0 : e.flags) == null ? void 0 : t[u]) == null ? void 0 : r.machineId) ?? "") === n;
  }) ?? null;
}
function Ht(i) {
  return Array.from((i == null ? void 0 : i.behaviors) ?? []).filter((n) => {
    var e, t;
    return ((t = (e = n == null ? void 0 : n.flags) == null ? void 0 : e[u]) == null ? void 0 : t.machineId) || bt.has(n == null ? void 0 : n.type);
  });
}
function Rt(i) {
  return g.getMachines().filter((n) => n.regionIds.includes(i)).map((n) => n.id);
}
function De(i) {
  return `${Pe}: ${i.name}`;
}
function Te(i) {
  return [
    "const userId = event.user?.id;",
    "if (!userId) return;",
    `game.socket.emit("${H}", {`,
    '  action: "openVendingFromRegion",',
    `  machineId: ${JSON.stringify(i)},`,
    "  userId,",
    "  sceneId: scene?.id,",
    "  regionId: region?.id,",
    "  behaviorId: behavior?.id,",
    "  tokenId: event.data?.token?.id",
    "});",
    "if (game.user?.id === userId && !game.user?.isGM) {",
    `  await game.holosuiteVending?.promptMachineAccess?.(${JSON.stringify(i)}, {`,
    "    actor: event.data?.token?.actor,",
    '    context: { source: "region-behavior", sceneId: scene?.id, regionId: region?.id, behaviorId: behavior?.id, tokenId: event.data?.token?.id }',
    "  });",
    "}"
  ].join(`
`);
}
function Ut(i) {
  var t, r, s, a, o;
  const n = ((r = (t = game.scenes) == null ? void 0 : t.get) == null ? void 0 : r.call(t, i.sceneId)) ?? (canvas == null ? void 0 : canvas.scene), e = ((a = (s = n == null ? void 0 : n.tokens) == null ? void 0 : s.get) == null ? void 0 : a.call(s, i.tokenId)) ?? Array.from(((o = n == null ? void 0 : n.tokens) == null ? void 0 : o.contents) ?? (n == null ? void 0 : n.tokens) ?? []).find((c) => (c == null ? void 0 : c.id) === i.tokenId);
  return (e == null ? void 0 : e.actor) ?? null;
}
function Pt() {
  var i, n;
  (n = (i = game.socket) == null ? void 0 : i.on) == null || n.call(i, H, async (e) => {
    var t, r, s, a;
    (e == null ? void 0 : e.action) === "openVendingFromRegion" && (e.userId !== ((t = game.user) == null ? void 0 : t.id) || (r = game.user) != null && r.isGM || await ((a = (s = game.holosuiteVending) == null ? void 0 : s.promptMachineAccess) == null ? void 0 : a.call(s, String(e.machineId || ""), {
      actor: Ut(e),
      context: {
        source: "region-socket",
        sceneId: e.sceneId,
        regionId: e.regionId,
        behaviorId: e.behaviorId,
        tokenId: e.tokenId
      }
    })));
  });
}
async function P() {
  var n, e, t;
  if (!((n = game.user) != null && n.isGM) || !(canvas != null && canvas.scene) || !((t = (e = CONFIG.RegionBehavior) == null ? void 0 : e.dataModels) != null && t[ce])) return;
  const i = g.getMachines();
  for (const r of kt()) {
    const s = String(r.id ?? ""), a = new Set(Rt(s)), o = Ht(r).filter((l) => {
      var m, f;
      return !a.has(String(((f = (m = l.flags) == null ? void 0 : m[u]) == null ? void 0 : f.machineId) ?? ""));
    }).map((l) => l.id);
    o.length && await r.deleteEmbeddedDocuments("RegionBehavior", o);
    const c = [], d = [];
    for (const l of a) {
      const m = i.find((p) => p.id === l);
      if (!m) continue;
      const f = Lt(r, l), S = {
        name: De(m),
        disabled: !1,
        "system.events": ["tokenEnter"],
        "system.source": Te(l),
        [`flags.${u}.machineId`]: l
      };
      f ? d.push({ _id: f.id, ...S }) : c.push({
        name: De(m),
        type: ce,
        disabled: !1,
        system: { events: ["tokenEnter"], source: Te(l) },
        flags: { [u]: { machineId: l } }
      });
    }
    d.length && await r.updateEmbeddedDocuments("RegionBehavior", d), c.length && await r.createEmbeddedDocuments("RegionBehavior", c);
  }
}
function Gt() {
  Pt(), window.setTimeout(() => P(), 250), Hooks.on("canvasReady", () => P()), Hooks.on(`${u}.machinesChanged`, () => P()), Hooks.on("createRegion", () => P()), Hooks.on("deleteRegion", () => P());
}
function xt(i) {
  return (i == null ? void 0 : i.document) ?? i;
}
function Vt(i) {
  var e;
  if ((e = foundry == null ? void 0 : foundry.utils) != null && e.escapeHTML) return foundry.utils.escapeHTML(String(i ?? ""));
  const n = document.createElement("div");
  return n.textContent = String(i ?? ""), n.innerHTML;
}
async function zt(i, n = {}) {
  const e = g.getMachine(i);
  return e ? await Dialog.wait({
    title: game.i18n.localize("HOLOSUITEVENDING.Region.PromptTitle"),
    content: `
      <form class="holosuite-vending-region-prompt">
        <p class="holosuite-vending-kicker">${game.i18n.localize("HOLOSUITEVENDING.Region.Kicker")}</p>
        <h3>${game.i18n.localize("HOLOSUITEVENDING.Region.PromptQuestion")}</h3>
        <strong>${Vt(e.name)}</strong>
      </form>
    `,
    buttons: {
      yes: { icon: '<i class="fa-solid fa-store"></i>', label: game.i18n.localize("HOLOSUITEVENDING.Common.Yes"), callback: () => !0 },
      no: { icon: '<i class="fa-solid fa-xmark"></i>', label: game.i18n.localize("HOLOSUITEVENDING.Common.No"), callback: () => !1 }
    },
    default: "yes",
    close: () => !1
  }, { width: 430, classes: ["holosuite-vending-window", "holosuite-vending-region-dialog"] }) ? game.holosuiteVending.openMachine(i, n.actor ?? null, n.context ?? {}) : null : (ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoMachine")), null);
}
function Ft() {
  const i = {
    promptMachineAccess: zt,
    openManager() {
      if (!game.user.isGM)
        return ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.GMOnly")), null;
      const e = new Le();
      return e.render(!0), e;
    },
    openSceneMachines() {
      const e = new tt();
      return e.render(!0), e;
    },
    openMachine(e, t = null, r = {}) {
      if (!g.getMachine(e))
        return ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoMachine")), null;
      const a = new R(e, { actor: t, context: r });
      return a.render(!0), a;
    },
    async attachMachineToTile(e, t) {
      if (!game.user.isGM)
        return ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.GMOnly")), !1;
      const r = xt(e);
      if (!(r != null && r.setFlag)) return !1;
      if (t) {
        await r.setFlag(u, W, t);
        const s = g.getMachineDisplayImage(t);
        s && r.update && await r.update({ "texture.src": s });
      } else
        await r.unsetFlag(u, W);
      return !0;
    },
    getMachines() {
      return foundry.utils.deepClone(g.getMachines());
    },
    getLedger() {
      return foundry.utils.deepClone(g.getLedger());
    },
    restockMachine(e) {
      return game.user.isGM ? g.restockMachine(e) : !1;
    },
    exportMachines() {
      return foundry.utils.deepClone(g.exportData());
    },
    async syncRegionLinks() {
      return game.user.isGM ? (await P(), !0) : !1;
    }
  };
  game.holosuiteVending = i;
  const n = game.modules.get(u);
  n && (n.api = i);
}
let Oe = !1;
function $t() {
  const i = game.modules.get("holosuite-core");
  return (i != null && i.active ? i.api : null) ?? game.holosuite ?? globalThis.HoloSuiteCoreApi ?? null;
}
function ne() {
  if (Oe) return !0;
  const i = $t();
  if (!(i != null && i.registerApp)) return !1;
  const n = {
    id: u,
    title: "Vending Machines",
    icon: "fa-solid fa-store",
    premium: !1,
    playerVisible: !0,
    description: "Create, stock, and link HoloSuite vending machines to Regions.",
    open: () => {
      var e, t, r, s, a;
      return (e = game.user) != null && e.isGM ? (r = (t = game.holosuiteVending) == null ? void 0 : t.openManager) == null ? void 0 : r.call(t) : (a = (s = game.holosuiteVending) == null ? void 0 : s.openSceneMachines) == null ? void 0 : a.call(s);
    }
  };
  return i.registerApp(n), Oe = !0, !0;
}
function qt() {
  if (ne()) return;
  let i = 0;
  const n = () => {
    i += 1, !(ne() || i >= 20) && window.setTimeout(n, 250);
  };
  Hooks.once("holosuite-core.apiReady", () => ne()), window.setTimeout(n, 250);
}
Hooks.once("init", () => {
  g.registerSettings(), game.settings.registerMenu(u, "machineManager", {
    name: game.i18n.localize("HOLOSUITEVENDING.Settings.Manager.Name"),
    label: game.i18n.localize("HOLOSUITEVENDING.Settings.Manager.Label"),
    hint: "Create, configure, and link HoloSuite vending machines to scene Regions.",
    icon: "fas fa-store",
    type: Le,
    restricted: !0
  });
});
Hooks.once("ready", () => {
  Ft(), qt(), b.registerSocket(), b.resumePendingDispenses(), Gt(), Hooks.on(`${u}.machinesChanged`, () => R.refreshAll()), Hooks.on(`${u}.currencyChanged`, () => R.refreshAll()), Hooks.on(`${u}.purchaseResult`, (i) => R.handlePurchaseResult(i)), Hooks.on(`${u}.collectionResult`, (i) => R.handleCollectionResult(i)), Hooks.on("updateUser", () => b.resumePendingDispenses()), console.log(`${u} | Ready`);
});
