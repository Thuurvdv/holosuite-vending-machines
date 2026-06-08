var R = Object.defineProperty;
var _ = (t, n, e) => n in t ? R(t, n, { enumerable: !0, configurable: !0, writable: !0, value: e }) : t[n] = e;
var g = (t, n, e) => _(t, typeof n != "symbol" ? n + "" : n, e);
const u = "holosuite-vending-machines", w = "machineId", O = `module.${u}`, f = {
  machines: "machines",
  currencyName: "currencyItemName"
}, S = {
  vending: `modules/${u}/templates/vending-app.hbs`,
  browser: `modules/${u}/templates/machine-browser.hbs`,
  manager: `modules/${u}/templates/machine-manager.hbs`,
  editor: `modules/${u}/templates/machine-edit.hbs`
};
function M(t = "machine") {
  var e, i;
  const n = ((i = (e = foundry == null ? void 0 : foundry.utils) == null ? void 0 : e.randomID) == null ? void 0 : i.call(e)) ?? Math.random().toString(36).slice(2, 10);
  return `${t}-${n}`;
}
function q(t) {
  return foundry.utils.deepClone(t ?? {});
}
function H(t = {}) {
  var n, e, i, a, s;
  return {
    id: t.id || M("entry"),
    itemUuid: t.itemUuid || "",
    embeddedData: t.embeddedData ? q(t.embeddedData) : null,
    displayName: t.displayName || t.name || ((n = t.embeddedData) == null ? void 0 : n.name) || "New Item",
    image: t.image || t.img || ((e = t.embeddedData) == null ? void 0 : e.img) || "icons/svg/item-bag.svg",
    price: Math.max(0, Number(t.price || 0)),
    stock: Math.max(0, Number(t.stock ?? t.maxStock ?? 1)),
    maxStock: Math.max(0, Number(t.maxStock ?? t.stock ?? 1)),
    description: t.description || ((s = (a = (i = t.embeddedData) == null ? void 0 : i.system) == null ? void 0 : a.description) == null ? void 0 : s.value) || ""
  };
}
function N(t = {}) {
  const n = Array.isArray(t.inventory) ? t.inventory.map(H) : [];
  return {
    id: t.id || M("machine"),
    name: t.name || "New Vending Machine",
    description: t.description || "",
    image: t.image || t.icon || "icons/environment/settlement/stall.webp",
    inventory: n
  };
}
function k(t = {}) {
  return {
    version: 1,
    machines: Array.isArray(t.machines) ? t.machines.map(N) : []
  };
}
class o {
  static registerSettings() {
    game.settings.register(u, f.machines, {
      name: "HoloSuite Vending Machine Data",
      scope: "world",
      config: !1,
      type: Object,
      default: { version: 1, machines: [] },
      onChange: () => Hooks.callAll(`${u}.machinesChanged`)
    }), game.settings.register(u, f.currencyName, {
      name: game.i18n.localize("HOLOSUITEVENDING.Settings.CurrencyName.Name"),
      hint: game.i18n.localize("HOLOSUITEVENDING.Settings.CurrencyName.Hint"),
      scope: "world",
      config: !0,
      type: String,
      default: "Credits",
      restricted: !0
    });
  }
  static getState() {
    return k(game.settings.get(u, f.machines));
  }
  static async setState(n) {
    if (!game.user.isGM) throw new Error("Only a GM can update vending machine data.");
    await game.settings.set(u, f.machines, k(n));
  }
  static getMachines() {
    return this.getState().machines;
  }
  static getMachine(n) {
    return this.getMachines().find((e) => e.id === n) ?? null;
  }
  static getCurrencyName() {
    return game.settings.get(u, f.currencyName) || "Credits";
  }
  static async upsertMachine(n) {
    const e = this.getState(), i = N(n), a = e.machines.findIndex((s) => s.id === i.id);
    return a >= 0 ? e.machines[a] = i : e.machines.push(i), await this.setState(e), i;
  }
  static async deleteMachine(n) {
    const e = this.getState();
    e.machines = e.machines.filter((i) => i.id !== n), await this.setState(e);
  }
  static async updateEntryStock(n, e, i) {
    var r;
    const a = this.getState(), s = a.machines.find((d) => d.id === n), c = (r = s == null ? void 0 : s.inventory) == null ? void 0 : r.find((d) => d.id === e);
    if (!c) throw new Error("Inventory entry not found.");
    return c.stock = Math.max(0, Number(i || 0)), await this.setState(a), N(s);
  }
  static createMachine(n = {}) {
    return N({ id: M("machine"), ...n });
  }
  static createEntry(n = {}) {
    return H({ id: M("entry"), ...n });
  }
}
function T() {
  var t, n, e;
  return ((e = (n = (t = canvas == null ? void 0 : canvas.tokens) == null ? void 0 : t.controlled) == null ? void 0 : n[0]) == null ? void 0 : e.actor) ?? game.user.character ?? null;
}
function Q() {
  var n, e, i;
  const t = ((e = (n = canvas == null ? void 0 : canvas.scene) == null ? void 0 : n.tiles) == null ? void 0 : e.contents) ?? ((i = canvas == null ? void 0 : canvas.scene) == null ? void 0 : i.tiles) ?? [];
  return Array.from(t).map((a) => {
    var r, d;
    const s = (r = a == null ? void 0 : a.getFlag) == null ? void 0 : r.call(a, u, w), c = s ? o.getMachine(s) : null;
    return c ? {
      tileId: a.id,
      machineId: s,
      name: c.name,
      description: c.description,
      image: c.image,
      inventoryCount: ((d = c.inventory) == null ? void 0 : d.length) ?? 0
    } : null;
  }).filter(Boolean);
}
class W extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "holosuite-vending-browser",
      classes: ["holosuite-vending-window", "holosuite-vending-browser-app"],
      template: S.browser,
      width: 620,
      height: "auto",
      resizable: !0,
      title: "Vending Access"
    });
  }
  async getData() {
    var e;
    const n = T();
    return {
      machines: Q(),
      actorName: (n == null ? void 0 : n.name) ?? "",
      sceneName: ((e = canvas == null ? void 0 : canvas.scene) == null ? void 0 : e.name) ?? "Current Scene"
    };
  }
  activateListeners(n) {
    super.activateListeners(n), n.find("[data-action='open-machine']").on("click", (e) => {
      const i = e.currentTarget.dataset.machineId;
      game.holosuiteVending.openMachine(i, T());
    });
  }
}
let p = null, y = null;
function B(t) {
  var e;
  if ((e = foundry == null ? void 0 : foundry.utils) != null && e.escapeHTML) return foundry.utils.escapeHTML(String(t ?? ""));
  const n = document.createElement("div");
  return n.textContent = String(t ?? ""), n.innerHTML;
}
function Y(t) {
  var a;
  const n = ((a = canvas == null ? void 0 : canvas.grid) == null ? void 0 : a.size) ?? 100, e = Number((t == null ? void 0 : t.width) ?? 1) * n, i = Number((t == null ? void 0 : t.height) ?? 1) * n;
  return {
    x: Number((t == null ? void 0 : t.x) ?? 0) + e / 2,
    y: Number((t == null ? void 0 : t.y) ?? 0) + i / 2
  };
}
function L() {
  const t = canvas == null ? void 0 : canvas.dimensions;
  return t ? {
    x: Number(t.sceneX ?? 0) + Number(t.sceneWidth ?? t.width ?? 0) / 2,
    y: Number(t.sceneY ?? 0) + Number(t.sceneHeight ?? t.height ?? 0) / 2
  } : { x: 0, y: 0 };
}
function X(t) {
  var e, i, a;
  try {
    const s = (i = (e = canvas == null ? void 0 : canvas.grid) == null ? void 0 : e.getSnappedPoint) == null ? void 0 : i.call(e, t, { mode: CONST.GRID_SNAPPING_MODES.CENTER });
    if (s) return s;
  } catch {
  }
  const n = ((a = canvas == null ? void 0 : canvas.grid) == null ? void 0 : a.size) ?? 100;
  return {
    x: Math.round(t.x / n) * n,
    y: Math.round(t.y / n) * n
  };
}
async function V(t, n) {
  var m;
  if (!game.user.isGM) return null;
  const e = o.getMachine(n), i = canvas == null ? void 0 : canvas.scene;
  if (!e || !i) return null;
  const a = ((m = canvas == null ? void 0 : canvas.grid) == null ? void 0 : m.size) ?? 100, s = a * 2, c = a * 2, r = X(t), d = {
    x: Math.round(r.x - s / 2),
    y: Math.round(r.y - c / 2),
    width: s,
    height: c,
    hidden: !1,
    locked: !1,
    texture: { src: e.image || "icons/environment/settlement/stall.webp" },
    flags: {
      [u]: {
        [w]: e.id
      }
    }
  }, l = await i.createEmbeddedDocuments("Tile", [d]);
  return ui.notifications.info(`Added vending machine tile: ${e.name}`), (l == null ? void 0 : l[0]) ?? null;
}
async function U(t) {
  var i, a, s;
  const n = (s = (a = (i = canvas == null ? void 0 : canvas.tokens) == null ? void 0 : i.controlled) == null ? void 0 : a[0]) == null ? void 0 : s.document, e = n ? Y(n) : L();
  return V(e, t);
}
function I() {
  var t;
  y && ((t = canvas == null ? void 0 : canvas.stage) != null && t.off) && canvas.stage.off("pointerdown", y), y = null, p = null, document.body.classList.remove("holosuite-vending-placement-active");
}
function x(t) {
  var e;
  if (!game.user.isGM) return;
  const n = o.getMachine(t);
  if (!n) {
    ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoMachine"));
    return;
  }
  if (!((e = canvas == null ? void 0 : canvas.stage) != null && e.on)) {
    ui.notifications.warn("Canvas placement is not available right now.");
    return;
  }
  I(), p = { machineId: t }, document.body.classList.add("holosuite-vending-placement-active"), ui.notifications.info(`Click the scene to place ${n.name}. Press Escape to cancel.`), y = async (i) => {
    var r, d, l, m;
    if (!p) return;
    const a = (r = i.data) == null ? void 0 : r.originalEvent;
    if (a != null && a.button && a.button !== 0) return;
    const s = ((l = (d = i.data) == null ? void 0 : d.getLocalPosition) == null ? void 0 : l.call(d, canvas.stage)) ?? ((m = canvas == null ? void 0 : canvas.canvasCoordinatesFromClient) == null ? void 0 : m.call(canvas, {
      x: a == null ? void 0 : a.clientX,
      y: a == null ? void 0 : a.clientY
    })) ?? L(), c = p.machineId;
    I(), await V(s, c);
  }, canvas.stage.on("pointerdown", y);
}
async function C() {
  var e, i;
  if (!game.user.isGM) return;
  const t = o.getMachines();
  if (!t.length) {
    ui.notifications.warn("Create a vending machine in HoloSuite before placing one."), (i = (e = game.holosuiteVending) == null ? void 0 : e.openManager) == null || i.call(e);
    return;
  }
  const n = t.map((a) => `<option value="${a.id}">${B(a.name)}</option>`).join("");
  await Dialog.wait({
    title: "Add Vending Machine",
    content: `
      <form class="holosuite-vending-tile-dialog">
        <div class="form-group">
          <label>Machine Type</label>
          <select name="machineId">${n}</select>
        </div>
      </form>
    `,
    buttons: {
      place: {
        label: "Click to Place",
        callback: async (a) => {
          const s = a.find("[name='machineId']").val();
          x(s);
        }
      },
      selected: {
        label: "At Selected Token",
        callback: async (a) => {
          const s = a.find("[name='machineId']").val();
          await U(s);
        }
      },
      manage: {
        label: "Manage Machines",
        callback: () => {
          var a, s;
          return (s = (a = game.holosuiteVending) == null ? void 0 : a.openManager) == null ? void 0 : s.call(a);
        }
      },
      cancel: {
        label: "Cancel"
      }
    },
    default: "place"
  });
}
function J() {
  Hooks.on("getSceneControlButtons", (t) => {
    var a, s;
    if (!game.user.isGM) return;
    const n = {
      name: "holosuite-vending-place",
      title: "Add Vending Machine",
      icon: "fa-solid fa-store",
      button: !0,
      visible: !0,
      onClick: () => C(),
      onChange: () => C()
    };
    if (Array.isArray(t)) {
      const c = t.find((r) => r.name === "tiles" || r.name === "tile") ?? t.find((r) => r.name === "token") ?? t[0];
      c != null && c.tools && !((s = (a = c.tools).some) != null && s.call(a, (r) => r.name === n.name)) && c.tools.push(n);
      return;
    }
    const e = t, i = (e == null ? void 0 : e.tiles) ?? (e == null ? void 0 : e.tile) ?? (e == null ? void 0 : e.tokens) ?? (e == null ? void 0 : e.token) ?? Object.values(e ?? {})[0];
    !(i != null && i.tools) || i.tools[n.name] || (i.tools[n.name] = { ...n, order: Object.keys(i.tools).length });
  }), window.addEventListener("keydown", (t) => {
    t.key === "Escape" && p && I();
  }), Hooks.on("canvasReady", () => {
    I();
  });
}
function K(t) {
  var e;
  const n = {
    machine: {},
    entries: {}
  };
  for (const [i, a] of new FormData(t).entries()) {
    const s = String(i), c = String(a ?? "");
    if (s.startsWith("machine.")) {
      n.machine[s.slice(8)] = c;
      continue;
    }
    const r = s.match(/^entries\.([^.]+)\.([^.]+)$/);
    if (!r) continue;
    const [, d, l] = r;
    (e = n.entries)[d] ?? (e[d] = {}), n.entries[d][l] = c;
  }
  return n;
}
function E(t, n = 0) {
  const e = Number(t);
  return Number.isFinite(e) ? e : n;
}
async function Z(t) {
  var s, c, r;
  const n = (s = t.dataTransfer) == null ? void 0 : s.getData("text/plain");
  if (!n) return null;
  const e = JSON.parse(n), i = await Item.fromDropData(e);
  if (!i) return null;
  const a = i.toObject();
  return o.createEntry({
    itemUuid: i.uuid ?? e.uuid ?? "",
    embeddedData: a,
    displayName: i.name,
    image: i.img,
    description: ((r = (c = a.system) == null ? void 0 : c.description) == null ? void 0 : r.value) || "",
    price: 0,
    stock: 1,
    maxStock: 1
  });
}
class z extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "holosuite-vending-manager",
      classes: ["holosuite-vending-window", "holosuite-vending-manager-app"],
      template: S.manager,
      width: 880,
      height: 720,
      resizable: !0,
      title: "HoloSuite Vending Machines"
    });
  }
  async getData() {
    return {
      machines: o.getMachines(),
      currencyName: o.getCurrencyName()
    };
  }
  activateListeners(n) {
    super.activateListeners(n), n.find("[data-action='create-machine']").on("click", async () => {
      const e = await o.upsertMachine(o.createMachine());
      new A(e.id).render(!0);
    }), n.find("[data-action='edit-machine']").on("click", (e) => {
      new A(e.currentTarget.dataset.machineId).render(!0);
    }), n.find("[data-action='place-machine']").on("click", (e) => {
      x(e.currentTarget.dataset.machineId);
    }), n.find("[data-action='place-machine-selected']").on("click", async (e) => {
      await U(e.currentTarget.dataset.machineId);
    }), n.find("[data-action='delete-machine']").on("click", async (e) => {
      const i = e.currentTarget.dataset.machineId;
      await Dialog.confirm({
        title: "Delete Vending Machine",
        content: "<p>Delete this vending machine? Tile attachments will no longer open a machine.</p>"
      }) && await o.deleteMachine(i), this.render(!1);
    });
  }
}
class A extends Application {
  constructor(e, i = {}) {
    super(i);
    g(this, "machineId");
    this.machineId = e, this.options.id = `holosuite-vending-editor-${e}`;
  }
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "holosuite-vending-editor",
      classes: ["holosuite-vending-window", "holosuite-vending-editor-app"],
      template: S.editor,
      width: 940,
      height: 760,
      resizable: !0,
      title: "Edit Vending Machine"
    });
  }
  get title() {
    var e;
    return ((e = o.getMachine(this.machineId)) == null ? void 0 : e.name) ?? "Edit Vending Machine";
  }
  async getData() {
    return {
      machine: o.getMachine(this.machineId),
      currencyName: o.getCurrencyName()
    };
  }
  activateListeners(e) {
    super.activateListeners(e), e.find("form").on("submit", async (i) => {
      i.preventDefault(), i.stopPropagation();
    }), e.find("[data-action='save-machine']").on("click", async (i) => {
      i.preventDefault(), i.stopPropagation();
      const a = i.currentTarget.closest("form");
      if (a)
        try {
          await this.save(a), ui.notifications.info("Vending machine saved.");
        } catch (s) {
          console.error(`${u} | Failed to save vending machine`, s), ui.notifications.error("Could not save vending machine. Check the console for details.");
        }
    }), e.find("[data-action='browse-machine-image']").on("click", (i) => {
      var s;
      i.preventDefault();
      const a = (s = i.currentTarget.closest(".holosuite-vending-path-row")) == null ? void 0 : s.querySelector("[name='machine.image']");
      if (!a || typeof FilePicker > "u") {
        ui.notifications.warn("Foundry FilePicker is not available.");
        return;
      }
      new FilePicker({
        type: "image",
        current: a.value,
        callback: (c) => {
          a.value = c;
        }
      }).browse();
    }), e.find("[data-action='add-entry']").on("click", async () => {
      const i = o.getMachine(this.machineId);
      i.inventory.push(o.createEntry()), await o.upsertMachine(i), this.render(!1);
    }), e.find("[data-action='remove-entry']").on("click", async (i) => {
      const a = o.getMachine(this.machineId);
      a.inventory = a.inventory.filter((s) => s.id !== i.currentTarget.dataset.entryId), await o.upsertMachine(a), this.render(!1);
    }), e.find(".holosuite-vending-drop-zone").on("dragover", (i) => i.preventDefault()), e.find(".holosuite-vending-drop-zone").on("drop", async (i) => {
      i.preventDefault();
      try {
        const a = await Z(i.originalEvent);
        if (!a) return;
        const s = o.getMachine(this.machineId);
        s.inventory.push(a), await o.upsertMachine(s), this.render(!1);
      } catch (a) {
        console.warn(`${u} | Item drop failed`, a), ui.notifications.warn("Could not add that item to the vending machine.");
      }
    });
  }
  async save(e) {
    var c, r, d;
    const i = K(e), a = o.getMachine(this.machineId) ?? o.createMachine({ id: this.machineId }), s = {
      ...a,
      name: ((c = i.machine) == null ? void 0 : c.name) || a.name,
      description: ((r = i.machine) == null ? void 0 : r.description) || "",
      image: ((d = i.machine) == null ? void 0 : d.image) || "",
      inventory: a.inventory.map((l) => {
        var h;
        const m = ((h = i.entries) == null ? void 0 : h[l.id]) ?? {};
        return o.createEntry({
          ...l,
          displayName: m.displayName || l.displayName,
          image: m.image || l.image,
          itemUuid: m.itemUuid || l.itemUuid,
          price: E(m.price, l.price),
          stock: E(m.stock, l.stock),
          maxStock: E(m.maxStock, l.maxStock),
          description: m.description ?? l.description
        });
      })
    };
    s.id = this.machineId, await o.upsertMachine(s);
  }
}
const ee = [
  "system.quantity",
  "system.qty",
  "system.amount",
  "system.count",
  "system.stack",
  "system.uses.value"
];
function b(t) {
  for (const n of ee) {
    const e = foundry.utils.getProperty(t, n);
    if (Number.isFinite(Number(e))) return { path: n, value: Number(e) };
  }
  return { path: null, value: 1 };
}
async function te(t, n) {
  const e = b(t);
  if (!e.path) {
    n <= 0 && await t.delete();
    return;
  }
  n <= 0 ? await t.delete() : await t.update({ [e.path]: n });
}
async function ne(t) {
  var e, i, a;
  if (t.itemUuid) {
    const s = await fromUuid(t.itemUuid);
    if (s) return s.toObject ? s.toObject() : foundry.utils.deepClone(s);
  }
  if (t.embeddedData) return foundry.utils.deepClone(t.embeddedData);
  const n = ((a = (i = (e = game.system) == null ? void 0 : e.documentTypes) == null ? void 0 : i.Item) == null ? void 0 : a[0]) ?? "loot";
  return {
    name: t.displayName,
    type: n,
    img: t.image,
    system: {}
  };
}
function P(t) {
  return Array.from((t == null ? void 0 : t.items) ?? []);
}
function ie(t, n) {
  const e = String(n).trim().toLocaleLowerCase();
  return P(t).find((i) => String(i.name).trim().toLocaleLowerCase() === e);
}
async function ae(t, n) {
  const e = foundry.utils.deepClone(n);
  delete e._id, e.name = e.name || "Vended Item", e.img = e.img || "icons/svg/item-bag.svg";
  const i = b(e).value || 1, a = P(t).find((s) => s.name === e.name && s.type === e.type);
  if (a) {
    const s = b(a);
    if (s.path)
      return await a.update({ [s.path]: s.value + i }), a;
  }
  return await t.createEmbeddedDocuments("Item", [e]), null;
}
function D(t, n) {
  var e;
  return !n || !t ? !1 : t.isGM ? !0 : ((e = n.testUserPermission) == null ? void 0 : e.call(n, t, "OWNER")) ?? !1;
}
async function G(t, n, e) {
  var i, a;
  if (game.user.id === t) {
    (a = (i = ui.notifications)[n]) == null || a.call(i, e);
    return;
  }
  game.socket.emit(O, {
    type: "notify",
    userId: t,
    level: n,
    message: e
  });
}
async function se({ actor: t, entry: n, price: e, currencyName: i }) {
  const a = game.i18n.format("HOLOSUITEVENDING.Notifications.Purchased", {
    actor: t.name,
    item: n.displayName,
    price: e,
    currency: i
  });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: t }),
    content: a
  });
}
class $ {
  static registerSocket() {
    game.socket.on(O, async (n) => {
      var e, i;
      if (!(!n || n.moduleId && n.moduleId !== u)) {
        if (n.type === "notify" && n.userId === game.user.id) {
          (i = (e = ui.notifications)[n.level || "info"]) == null || i.call(e, n.message);
          return;
        }
        n.type === "purchase" && game.user.isGM && this.isResponsibleGM() && await this.handlePurchaseRequest(n);
      }
    });
  }
  static isResponsibleGM() {
    const n = game.users.find((e) => e.active && e.isGM);
    return (n == null ? void 0 : n.id) === game.user.id;
  }
  static async requestPurchase({ machineId: n, entryId: e, actor: i }) {
    if (!i) {
      ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoActor"));
      return;
    }
    if (game.user.isGM) {
      await this.purchase({ machineId: n, entryId: e, actor: i, user: game.user });
      return;
    }
    if (!D(game.user, i)) {
      ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoActor"));
      return;
    }
    if (!game.users.find((s) => s.active && s.isGM)) {
      ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoGM"));
      return;
    }
    game.socket.emit(O, {
      type: "purchase",
      moduleId: u,
      userId: game.user.id,
      machineId: n,
      entryId: e,
      actorUuid: i.uuid
    });
  }
  static async handlePurchaseRequest(n) {
    const e = game.users.get(n.userId), i = await fromUuid(n.actorUuid);
    try {
      await this.purchase({
        machineId: n.machineId,
        entryId: n.entryId,
        actor: i,
        user: e
      });
    } catch (a) {
      console.warn(`${u} | Purchase failed`, a), await G(n.userId, "warn", a.message);
    }
  }
  static async purchase({ machineId: n, entryId: e, actor: i, user: a }) {
    var h;
    if (!D(a, i))
      throw new Error(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoActor"));
    const s = o.getMachine(n), c = (h = s == null ? void 0 : s.inventory) == null ? void 0 : h.find((j) => j.id === e);
    if (!s || !c) throw new Error(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoMachine"));
    if (c.stock <= 0) throw new Error(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoStock"));
    const r = o.getCurrencyName(), d = ie(i, r), l = d ? b(d).value : 0;
    if (!d || l < c.price)
      throw new Error(game.i18n.format("HOLOSUITEVENDING.Notifications.NoCurrency", { currency: r }));
    const m = await ne(c);
    await te(d, l - c.price), await ae(i, m), await o.updateEntryStock(n, e, c.stock - 1), await se({ actor: i, entry: c, price: c.price, currencyName: r }), await G(a.id, "info", game.i18n.format("HOLOSUITEVENDING.Notifications.Purchased", {
      actor: i.name,
      item: c.displayName,
      price: c.price,
      currency: r
    }));
  }
}
const v = /* @__PURE__ */ new Set();
function ce(t) {
  var n, e, i;
  return t || ((i = (e = (n = canvas == null ? void 0 : canvas.tokens) == null ? void 0 : n.controlled) == null ? void 0 : e[0]) != null && i.actor ? canvas.tokens.controlled[0].actor : game.user.character ?? null);
}
class F extends Application {
  constructor(e, i = {}) {
    super(i);
    g(this, "machineId");
    g(this, "actor");
    g(this, "selectedEntryId");
    this.machineId = e, this.actor = ce(i.actor), this.selectedEntryId = i.selectedEntryId ?? null, this.options.id = `holosuite-vending-machine-${e}`, v.add(this);
  }
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "holosuite-vending-machine",
      classes: ["holosuite-vending-window", "holosuite-vending-app"],
      template: S.vending,
      width: 720,
      height: 900,
      resizable: !0,
      title: "HoloSuite Vending Machine"
    });
  }
  get title() {
    var e;
    return ((e = o.getMachine(this.machineId)) == null ? void 0 : e.name) ?? "HoloSuite Vending Machine";
  }
  async close(e) {
    return v.delete(this), super.close(e);
  }
  get machine() {
    return o.getMachine(this.machineId);
  }
  async getData() {
    var s;
    const e = this.machine, i = (e == null ? void 0 : e.inventory) ?? [];
    !this.selectedEntryId && i.length && (this.selectedEntryId = i[0].id);
    const a = i.find((c) => c.id === this.selectedEntryId) ?? i[0] ?? null;
    return {
      machine: e,
      entries: i.map((c) => ({
        ...c,
        selected: (a == null ? void 0 : a.id) === c.id,
        soldOut: c.stock <= 0
      })),
      selected: a,
      selectedSoldOut: !a || a.stock <= 0,
      actorName: ((s = this.actor) == null ? void 0 : s.name) ?? "",
      currencyName: o.getCurrencyName()
    };
  }
  activateListeners(e) {
    super.activateListeners(e), e.find("[data-action='select-entry']").on("click", (i) => {
      this.selectedEntryId = i.currentTarget.dataset.entryId, this.render(!1);
    }), e.find("[data-action='buy']").on("click", async () => {
      if (!this.actor) {
        ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoActor"));
        return;
      }
      const i = this.selectedEntryId;
      i && await $.requestPurchase({ machineId: this.machineId, entryId: i, actor: this.actor });
    });
  }
  static refreshMachine(e) {
    for (const i of v)
      i.machineId === e && i.render(!1);
  }
  static refreshAll() {
    for (const e of v) e.render(!1);
  }
}
function re(t) {
  return (t == null ? void 0 : t.document) ?? t;
}
function oe() {
  const t = {
    openManager() {
      if (!game.user.isGM)
        return ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.GMOnly")), null;
      const e = new z();
      return e.render(!0), e;
    },
    openSceneMachines() {
      const e = new W();
      return e.render(!0), e;
    },
    openMachine(e, i = null) {
      if (!o.getMachine(e))
        return ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoMachine")), null;
      const s = new F(e, { actor: i });
      return s.render(!0), s;
    },
    async attachMachineToTile(e, i) {
      if (!game.user.isGM)
        return ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.GMOnly")), !1;
      const a = re(e);
      return a != null && a.setFlag ? (i ? await a.setFlag(u, w, i) : await a.unsetFlag(u, w), !0) : !1;
    },
    getMachines() {
      return foundry.utils.deepClone(o.getMachines());
    }
  };
  game.holosuiteVending = t;
  const n = game.modules.get(u);
  n && (n.api = t);
}
function de() {
  const t = game.modules.get("holosuite-core"), n = t != null && t.active ? t.api : null;
  if (!(n != null && n.registerApp)) return !1;
  const e = {
    id: u,
    title: "Vending Machines",
    icon: "fa-solid fa-store",
    premium: !1,
    playerVisible: !0,
    description: "Create, stock, and place HoloSuite vending machines.",
    open: () => {
      var i, a, s, c, r;
      return (i = game.user) != null && i.isGM ? (s = (a = game.holosuiteVending) == null ? void 0 : a.openManager) == null ? void 0 : s.call(a) : (r = (c = game.holosuiteVending) == null ? void 0 : c.openSceneMachines) == null ? void 0 : r.call(c);
    }
  };
  return n.registerApp(e), !0;
}
Hooks.once("init", () => {
  o.registerSettings(), game.settings.registerMenu(u, "machineManager", {
    name: game.i18n.localize("HOLOSUITEVENDING.Settings.Manager.Name"),
    label: game.i18n.localize("HOLOSUITEVENDING.Settings.Manager.Label"),
    hint: "Create and configure HoloSuite vending machines.",
    icon: "fas fa-store",
    type: z,
    restricted: !0
  });
});
Hooks.once("ready", () => {
  oe(), de(), $.registerSocket(), J(), Hooks.on(`${u}.machinesChanged`, () => F.refreshAll()), console.log(`${u} | Ready`);
});
