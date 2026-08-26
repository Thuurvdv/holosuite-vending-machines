//#region src/constants.ts
var e = "holosuite-vending-machines", t = `module.${e}`, n = "industrial", r = [
	{
		id: "industrial",
		label: "Alien Market",
		description: "A colorful off-world market terminal with armored bays and custom vendor hardware."
	},
	{
		id: "corporate-kiosk",
		label: "Executive Terminal",
		description: "A dark blue executive terminal with rounded cards and restrained cyan accents."
	},
	{
		id: "corporate-kiosk-white",
		label: "Corporate Kiosk",
		description: "A warm ivory corporate kiosk with restrained retro-future detailing."
	},
	{
		id: "neon",
		label: "Neon",
		description: "A black-violet market terminal charged with hot-pink neon and electric cyan details."
	}
], i = {
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
}, a = {
	select: `modules/${e}/assets/sounds/vending_select.ogg`,
	purchase: `modules/${e}/assets/sounds/vending_purchase.ogg`,
	dispense: `modules/${e}/assets/sounds/vending_dispense.ogg`,
	collect: `modules/${e}/assets/sounds/vending_collect.ogg`,
	failure: `modules/${e}/assets/sounds/vending_failure.ogg`
}, o = {
	vending: `modules/${e}/templates/vending-app.hbs`,
	browser: `modules/${e}/templates/machine-browser.hbs`,
	manager: `modules/${e}/templates/machine-manager.hbs`,
	editor: `modules/${e}/templates/machine-edit.hbs`
}, s = Object.freeze({
	ONLINE: "online",
	OFFLINE: "offline",
	SOLD_OUT: "sold-out"
}), c = /* @__PURE__ */ new Map();
function l(e) {
	let t = e || "__default__", n = c.get(t);
	return n || (n = new Intl.NumberFormat(e, {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2
	}), c.set(t, n)), n;
}
function u(e, t) {
	let n = Number(e) || 0;
	return l(t).format(Math.round((n + 2 ** -52) * 100) / 100);
}
function d(e = [], t = 0) {
	let n = Array.isArray(e) ? e : [];
	return n.find((e) => Number(e?.stock ?? 0) > 0 && Number(e?.price ?? 0) <= Number(t))?.id ?? n.find((e) => Number(e?.stock ?? 0) > 0)?.id ?? n[0]?.id ?? null;
}
function f(e = [], t = 6, n = []) {
	let r = Array.isArray(e) ? e : [], i = Array.isArray(n) ? n : [], a = Math.max(0, Math.floor(Number(t) || 0));
	return {
		active: r.slice(0, a),
		overflow: [...r.slice(a), ...i]
	};
}
function p(e = []) {
	let t = /* @__PURE__ */ new Map();
	for (let n of Array.isArray(e) ? e : []) {
		let e = String(n?.entryId ?? "").trim(), r = Math.min(99, Math.max(0, Math.floor(Number(n?.quantity ?? 0))));
		!e || r < 1 || t.set(e, Math.min(99, (t.get(e) ?? 0) + r));
	}
	return Array.from(t, ([e, t]) => ({
		entryId: e,
		quantity: t
	}));
}
function m(e, t = []) {
	let n = p(t), r = Array.isArray(e?.inventory) ? e.inventory : [], i = n.map((e) => {
		let t = r.find((t) => t?.id === e.entryId);
		if (!t) throw Error("Inventory entry not found.");
		let n = Math.max(0, Number(t.stock ?? 0));
		if (e.quantity > n) throw Error(`${t.displayName ?? "Item"} does not have enough stock.`);
		let i = Math.max(0, Number(t.price ?? 0));
		return {
			entry: t,
			entryId: e.entryId,
			quantity: e.quantity,
			unitPrice: i,
			totalPrice: i * e.quantity
		};
	});
	return {
		lines: i,
		itemCount: i.reduce((e, t) => e + t.quantity, 0),
		totalPrice: i.reduce((e, t) => e + t.totalPrice, 0)
	};
}
function h(e) {
	if (e?.status === s.OFFLINE) return s.OFFLINE;
	let t = Array.isArray(e?.inventory) ? e.inventory : [];
	return t.length > 0 && t.every((e) => Number(e?.stock ?? 0) <= 0) ? s.SOLD_OUT : s.ONLINE;
}
function g(e) {
	return e?.image || "icons/environment/settlement/stall.webp";
}
//#endregion
//#region src/machine-store.ts
function _(e = "machine") {
	return `${e}-${foundry?.utils?.randomID?.() ?? Math.random().toString(36).slice(2, 10)}`;
}
function v(e) {
	return foundry.utils.deepClone(e ?? {});
}
function y(e, t = !1) {
	return e == null || e === "" ? t : typeof e == "string" ? e === "true" || e === "on" || e === "1" : !!e;
}
function b(e, t = 0) {
	let n = Number(e);
	return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : t;
}
function x(e) {
	let t = Array.isArray(e) ? e : String(e ?? "").split(/[\s,]+/);
	return Array.from(new Set(t.map((e) => String(e).trim()).filter(Boolean)));
}
function ee(e) {
	let t = String(e ?? "").trim();
	return r.some((e) => e.id === t) ? t : n;
}
function te(e) {
	return (String(e ?? "").trim() || "HoloSuite").slice(0, 48);
}
function S(e = {}) {
	return {
		id: e.id || _("entry"),
		itemUuid: e.itemUuid || "",
		embeddedData: e.embeddedData ? v(e.embeddedData) : null,
		displayName: e.displayName || e.name || e.embeddedData?.name || "New Item",
		image: e.image || e.img || e.embeddedData?.img || "icons/svg/item-bag.svg",
		price: Math.max(0, Number.isFinite(Number(e.price)) ? Number(e.price) : 0),
		stock: b(e.stock ?? e.maxStock, 1),
		maxStock: b(e.maxStock ?? e.stock, 1),
		description: e.description || e.embeddedData?.system?.description?.value || ""
	};
}
function C(e = {}) {
	let t = f(Array.isArray(e.inventory) ? e.inventory.map(S) : [], 6, Array.isArray(e.overflowInventory) ? e.overflowInventory.map(S) : []), n = e.status === s.OFFLINE ? s.OFFLINE : s.ONLINE;
	return {
		id: e.id || _("machine"),
		name: e.name || "New Vending Machine",
		manufacturerName: te(e.manufacturerName),
		styleId: ee(e.styleId),
		description: e.description || "",
		image: e.image || e.icon || "icons/environment/settlement/stall.webp",
		status: n,
		regionIds: x(e.regionIds),
		access: { requireProximity: y(e.access?.requireProximity ?? e.requireProximity, !0) },
		inventory: t.active,
		overflowInventory: t.overflow
	};
}
function w(e = {}) {
	return {
		version: 3,
		machines: Array.isArray(e.machines) ? e.machines.map(C) : []
	};
}
function ne(e = [], t = []) {
	return e.length === t.length && e.every((e, n) => String(e) === String(t[n]));
}
function re(e, t) {
	return e?.id === t?.id && e?.itemUuid === t?.itemUuid && e?.displayName === t?.displayName && e?.image === t?.image && e?.price === t?.price && e?.stock === t?.stock && e?.maxStock === t?.maxStock && e?.description === t?.description;
}
function ie(e, t) {
	return !e || !t || [
		"name",
		"manufacturerName",
		"styleId",
		"description",
		"image",
		"status"
	].some((n) => e[n] !== t[n]) || !!e.access?.requireProximity != !!t.access?.requireProximity || !ne(e.regionIds, t.regionIds) || e.inventory.length !== t.inventory.length ? !1 : e.inventory.every((e, n) => re(e, t.inventory[n]));
}
function ae(e, t) {
	return !!(e && t) && e.name === t.name && ne(e.regionIds, t.regionIds);
}
function T(e, t) {
	let n = e?.machines ?? [], r = t?.machines ?? [], i = new Map(n.map((e) => [e.id, e])), a = new Map(r.map((e) => [e.id, e])), o = /* @__PURE__ */ new Set([...i.keys(), ...a.keys()]), s = [], c = !e;
	for (let e of o) {
		let t = i.get(e), n = a.get(e);
		ie(t, n) || s.push(String(e)), ae(t, n) || (c = !0);
	}
	return {
		changedMachineIds: s,
		regionStructureChanged: c
	};
}
function oe(e = {}) {
	return {
		version: 1,
		entries: (Array.isArray(e.entries) ? e.entries : []).slice(-250)
	};
}
function E(e = {}) {
	return {
		id: String(e.id || e.requestId || _("dispense")),
		requestId: String(e.requestId || e.id || ""),
		machineId: String(e.machineId || ""),
		machineName: String(e.machineName || "Unknown machine"),
		actorUuid: String(e.actorUuid || ""),
		actorId: String(e.actorId || ""),
		actorName: String(e.actorName || "Unknown actor"),
		userId: String(e.userId || ""),
		userName: String(e.userName || "Unknown user"),
		currencyName: String(e.currencyName || "Currency"),
		itemSummary: String(e.itemSummary || ""),
		itemCount: b(e.itemCount, 0),
		totalPrice: Math.max(0, Number(e.totalPrice) || 0),
		items: Array.isArray(e.items) ? e.items.map((e) => ({
			entryId: String(e.entryId || ""),
			itemUuid: String(e.itemUuid || ""),
			quantity: Math.max(1, b(e.quantity, 1)),
			displayName: String(e.displayName || e.itemData?.name || "Vended Item"),
			image: String(e.image || e.itemData?.img || "icons/svg/item-bag.svg"),
			...e.itemData ? { itemData: v(e.itemData) } : {}
		})) : [],
		image: String(e.image || ""),
		createdAt: Number(e.createdAt) || Date.now(),
		expiresAt: Number(e.expiresAt) || Date.now() + 11e3,
		status: e.status === "delivering" ? "delivering" : "pending"
	};
}
function se(e = {}) {
	return {
		version: 1,
		entries: Array.isArray(e.entries) ? e.entries.map(E) : []
	};
}
var D = class {
	static machineStateCache = null;
	static registerSettings() {
		game.settings.register(e, i.machines, {
			name: "HoloSuite Vending Machine Data",
			scope: "world",
			config: !1,
			type: Object,
			default: {
				version: 3,
				machines: []
			},
			onChange: (t) => {
				let n = this.machineStateCache, r = w(t);
				this.machineStateCache = r, Hooks.callAll(`${e}.machinesChanged`, T(n, r));
			}
		}), game.settings.register(e, i.currencyName, {
			name: game.i18n.localize("HOLOSUITEVENDING.Settings.CurrencyName.Name"),
			hint: game.i18n.localize("HOLOSUITEVENDING.Settings.CurrencyName.Hint"),
			scope: "world",
			config: !0,
			type: String,
			default: "Credits",
			restricted: !0
		}), game.settings.register(e, i.currencyMode, {
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
		}), game.settings.register(e, i.currencyPath, {
			name: game.i18n.localize("HOLOSUITEVENDING.Settings.CurrencyPath.Name"),
			hint: game.i18n.localize("HOLOSUITEVENDING.Settings.CurrencyPath.Hint"),
			scope: "world",
			config: !0,
			type: String,
			default: "",
			restricted: !0
		}), game.settings.register(e, i.creditTransformer, {
			name: game.i18n.localize("HOLOSUITEVENDING.Settings.CreditTransformer.Name"),
			hint: game.i18n.localize("HOLOSUITEVENDING.Settings.CreditTransformer.Hint"),
			scope: "world",
			config: !1,
			type: Boolean,
			default: !1,
			restricted: !0,
			onChange: () => Hooks.callAll(`${e}.currencyChanged`)
		}), game.settings.register(e, i.audioEnabled, {
			name: game.i18n.localize("HOLOSUITEVENDING.Settings.AudioEnabled.Name"),
			hint: game.i18n.localize("HOLOSUITEVENDING.Settings.AudioEnabled.Hint"),
			scope: "world",
			config: !0,
			type: Boolean,
			default: !0,
			restricted: !0
		}), game.settings.register(e, i.audioVolume, {
			name: game.i18n.localize("HOLOSUITEVENDING.Settings.AudioVolume.Name"),
			hint: game.i18n.localize("HOLOSUITEVENDING.Settings.AudioVolume.Hint"),
			scope: "world",
			config: !0,
			type: Number,
			range: {
				min: 0,
				max: 1,
				step: .05
			},
			default: .35,
			restricted: !0
		});
		let t = [
			[
				i.audioSelect,
				"Select",
				a.select
			],
			[
				i.audioPurchase,
				"Purchase",
				a.purchase
			],
			[
				i.audioDispense,
				"Dispense",
				a.dispense
			],
			[
				i.audioCollect,
				"Collect",
				a.collect
			],
			[
				i.audioFailure,
				"Failure",
				a.failure
			]
		];
		for (let [n, r, i] of t) game.settings.register(e, n, {
			name: game.i18n.localize(`HOLOSUITEVENDING.Settings.Audio${r}.Name`),
			hint: game.i18n.localize(`HOLOSUITEVENDING.Settings.Audio${r}.Hint`),
			scope: "world",
			config: !0,
			type: String,
			default: i,
			filePicker: "audio",
			restricted: !0
		});
		game.settings.register(e, i.ledger, {
			name: "HoloSuite Vending Transaction Ledger",
			scope: "world",
			config: !1,
			type: Object,
			default: {
				version: 1,
				entries: []
			}
		}), game.settings.register(e, i.dispenses, {
			name: "HoloSuite Pending Vending Dispenses",
			scope: "world",
			config: !1,
			type: Object,
			default: {
				version: 1,
				entries: []
			}
		});
	}
	static getState() {
		return v(this.getCachedState());
	}
	static getCachedState() {
		return this.machineStateCache ||= w(game.settings.get(e, i.machines)), this.machineStateCache;
	}
	static async setState(t) {
		if (!game.user.isGM) throw Error("Only a GM can update vending machine data.");
		let n = w(t);
		await game.settings.set(e, i.machines, n);
		let r = T(this.machineStateCache, n);
		this.machineStateCache = n, (r.changedMachineIds.length || r.regionStructureChanged) && Hooks.callAll(`${e}.machinesChanged`, r);
	}
	static getMachines() {
		return this.getCachedState().machines;
	}
	static getMachine(e) {
		return this.getMachines().find((t) => t.id === e) ?? null;
	}
	static getMachineState(e) {
		return h(typeof e == "string" ? this.getMachine(e) : e);
	}
	static getMachineDisplayImage(e) {
		return g(typeof e == "string" ? this.getMachine(e) : e);
	}
	static getCurrencyName() {
		return game.settings.get("holosuite-vending-machines", i.currencyName) || "Credits";
	}
	static getCurrencyMode() {
		let e = String(game.settings.get("holosuite-vending-machines", i.currencyMode) || "auto");
		return [
			"auto",
			"actor",
			"item"
		].includes(e) ? e : "auto";
	}
	static getCurrencyPath() {
		return String(game.settings.get("holosuite-vending-machines", i.currencyPath) || "").trim();
	}
	static getCurrencySourceLabel() {
		let e = this.getCurrencyMode(), t = this.getCurrencyPath();
		return this.getCreditTransformer() ? "Credit Transformer · backed by each actor's system currency" : e === "actor" ? t ? `Actor currency · ${t}` : "Actor currency · automatic detection" : e === "item" ? `Inventory currency item · ${this.getCurrencyName()}` : t ? `Automatic system currency · ${t}` : "Automatic system currency detection with item fallback";
	}
	static getCreditTransformer() {
		return game.settings.get(e, i.creditTransformer) === !0;
	}
	static async setCreditTransformer(t) {
		if (!game.user?.isGM) throw Error("Only a GM can change the credit transformer.");
		return game.settings.set(e, i.creditTransformer, t === !0);
	}
	static getAudioConfig() {
		return {
			enabled: game.settings.get(e, i.audioEnabled) !== !1,
			volume: Math.min(1, Math.max(0, Number(game.settings.get("holosuite-vending-machines", i.audioVolume)) || 0)),
			select: String(game.settings.get("holosuite-vending-machines", i.audioSelect) || "").trim(),
			purchase: String(game.settings.get("holosuite-vending-machines", i.audioPurchase) || "").trim(),
			dispense: String(game.settings.get("holosuite-vending-machines", i.audioDispense) || "").trim(),
			collect: String(game.settings.get("holosuite-vending-machines", i.audioCollect) || "").trim(),
			failure: String(game.settings.get("holosuite-vending-machines", i.audioFailure) || "").trim()
		};
	}
	static async upsertMachine(e) {
		if (Array.isArray(e?.inventory) && e.inventory.length > 6) throw Error("A vending machine can contain no more than 6 products.");
		let t = this.getState(), n = C(e), r = t.machines.findIndex((e) => e.id === n.id);
		return r >= 0 ? t.machines[r] = n : t.machines.push(n), await this.setState(t), n;
	}
	static async deleteMachine(e) {
		let t = this.getState();
		t.machines = t.machines.filter((t) => t.id !== e), await this.setState(t);
	}
	static async updateEntryStocks(e, t) {
		let n = this.getState(), r = n.machines.find((t) => t.id === e);
		if (!r) throw Error("Vending machine not found.");
		for (let e of r.inventory) Object.prototype.hasOwnProperty.call(t, e.id) && (e.stock = Math.max(0, Math.floor(Number(t[e.id]) || 0)));
		return await this.setState(n), C(r);
	}
	static async updateEntryStock(e, t, n) {
		return this.updateEntryStocks(e, { [t]: n });
	}
	static async restockMachine(e) {
		let t = this.getMachine(e);
		if (!t) throw Error("Vending machine not found.");
		let n = Object.fromEntries(t.inventory.map((e) => [e.id, e.maxStock]));
		return this.updateEntryStocks(e, n);
	}
	static async restockAll() {
		let e = this.getState();
		for (let t of e.machines) for (let e of t.inventory) e.stock = e.maxStock;
		return await this.setState(e), e.machines;
	}
	static getLedger() {
		return oe(game.settings.get(e, i.ledger));
	}
	static getDispenseState() {
		return se(game.settings.get(e, i.dispenses));
	}
	static getPendingDispenses() {
		return this.getDispenseState().entries;
	}
	static getPendingDispense(e) {
		return this.getPendingDispenses().find((t) => t.requestId === e) ?? null;
	}
	static async addPendingDispense(t) {
		if (!game.user?.isGM) throw Error("Only a GM can authorize vending-machine delivery.");
		let n = this.getDispenseState(), r = E(t), a = n.entries.findIndex((e) => e.requestId === r.requestId);
		return a >= 0 ? n.entries[a] = r : n.entries.push(r), await game.settings.set(e, i.dispenses, n), r;
	}
	static async updatePendingDispense(t, n) {
		if (!game.user?.isGM) throw Error("Only a GM can update vending-machine delivery.");
		let r = this.getDispenseState(), a = r.entries.findIndex((e) => e.requestId === t);
		return a < 0 ? null : (r.entries[a] = E({
			...r.entries[a],
			...n
		}), await game.settings.set(e, i.dispenses, r), r.entries[a]);
	}
	static async removePendingDispense(t) {
		if (!game.user?.isGM) throw Error("Only a GM can complete vending-machine delivery.");
		let n = this.getDispenseState(), r = n.entries.length;
		return n.entries = n.entries.filter((e) => e.requestId !== t), n.entries.length !== r && (await game.settings.set(e, i.dispenses, n), !0);
	}
	static async appendLedger(t) {
		if (!game.user.isGM) return null;
		let n = this.getLedger(), r = {
			id: t.id || _("transaction"),
			requestId: t.requestId || "",
			timestamp: t.timestamp || Date.now(),
			status: t.status === "failed" ? "failed" : "success",
			machineId: t.machineId || "",
			machineName: t.machineName || "Unknown machine",
			actorId: t.actorId || "",
			actorName: t.actorName || "Unknown actor",
			userId: t.userId || "",
			userName: t.userName || "Unknown user",
			itemSummary: t.itemSummary || "",
			itemCount: Math.max(0, Number(t.itemCount) || 0),
			totalPrice: Math.max(0, Number(t.totalPrice) || 0),
			currencyName: t.currencyName || this.getCurrencyName(),
			error: t.error || ""
		};
		return n.entries.push(r), n.entries = n.entries.slice(-250), await game.settings.set(e, i.ledger, n), Hooks.callAll(`${e}.ledgerChanged`, r), r;
	}
	static hasProcessedRequest(e) {
		return e ? this.getLedger().entries.some((t) => t.requestId === e && t.status === "success") : !1;
	}
	static async clearLedger() {
		if (!game.user.isGM) throw Error("Only a GM can clear the transaction ledger.");
		await game.settings.set(e, i.ledger, {
			version: 1,
			entries: []
		}), Hooks.callAll(`${e}.ledgerChanged`, null);
	}
	static exportData() {
		return {
			format: "holosuite-vending-machines",
			version: 3,
			exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
			currencyName: this.getCurrencyName(),
			machines: v(this.getMachines())
		};
	}
	static async importData(e) {
		if (!game.user.isGM) throw Error("Only a GM can import vending machines.");
		let t = Array.isArray(e) ? e : e?.machines;
		if (!Array.isArray(t)) throw Error("This file does not contain a vending machine list.");
		let n = t.find((e) => Array.isArray(e?.inventory) && e.inventory.length > 6);
		if (n) throw Error(`Cannot import ${n.name || "a vending machine"}: it contains ${n.inventory.length} products, but the maximum is 6.`);
		let r = this.getState(), i = [];
		for (let e of t) {
			let t = C(e);
			i.push(t);
			let n = r.machines.findIndex((e) => e.id === t.id);
			n >= 0 ? r.machines[n] = t : r.machines.push(t);
		}
		return await this.setState(r), i.length;
	}
	static createMachine(e = {}) {
		return C({
			id: _("machine"),
			...e
		});
	}
	static createEntry(e = {}) {
		return S({
			id: _("entry"),
			...e
		});
	}
};
//#endregion
//#region src/application-base.ts
function ce() {
	return globalThis.foundry?.applications?.api ?? foundry?.applications?.api ?? null;
}
function le() {
	return globalThis.foundry?.appv1?.api ?? foundry?.appv1?.api ?? null;
}
function ue(e = {}, t = {}) {
	let n = globalThis.foundry?.utils?.mergeObject ?? foundry?.utils?.mergeObject;
	return typeof n == "function" ? n(e, t, { inplace: !1 }) : {
		...e,
		...t
	};
}
function de(e = {}) {
	return {
		id: String(e.id ?? `legacy-application-${Math.random().toString(36).slice(2, 10)}`),
		tag: e.tag ?? "section",
		classes: Array.isArray(e.classes) ? e.classes : [],
		window: {
			title: e.title ?? "",
			icon: e.icon,
			resizable: e.resizable === !0
		},
		position: {
			width: Number(e.width ?? 600),
			height: e.height === "auto" ? "auto" : Number(e.height ?? 600)
		}
	};
}
function fe(e) {
	return class extends e {
		static get defaultOptions() {
			return {};
		}
		static get DEFAULT_OPTIONS() {
			return de(this.defaultOptions ?? {});
		}
		_v1Options;
		constructor(e = {}) {
			let t = ue(new.target.defaultOptions ?? {}, e);
			super(de(t)), this._v1Options = t;
		}
		render(e = {}, t = {}) {
			return typeof e == "boolean" ? super.render({
				...t,
				force: e
			}) : super.render(e);
		}
		activateListeners(e) {}
		async _renderHTML(e, t) {
			let n = typeof this.getData == "function" ? await this.getData() : {}, r = this._v1Options?.template ?? this.options?.template ?? this.constructor.defaultOptions?.template;
			if (!r) return document.createDocumentFragment();
			let i = await globalThis.renderTemplate(r, n), a = document.createElement("template");
			return a.innerHTML = i.trim(), a.content;
		}
		_replaceHTML(e, t, n) {
			t.replaceChildren(e);
			let r = globalThis.jQuery ?? globalThis.$, i = t.closest?.(".window-app, .app, .application") ?? t, a = r ? r(i) : i;
			try {
				Object.defineProperty(this, "element", {
					value: a,
					configurable: !0,
					writable: !0
				});
			} catch {
				try {
					this.element = a;
				} catch {}
			}
			let o = this._v1Options?.classes;
			Array.isArray(o) && o.length && (t.classList.add(...o), t.closest?.(".window-app, .app, .application")?.classList.add(...o)), typeof this.activateListeners == "function" && this.activateListeners(r ? r(t) : t);
		}
	};
}
function O() {
	let e = ce(), t = le(), n = globalThis.Application ?? t?.Application ?? e?.ApplicationV1;
	if (n) return n;
	let r = e?.ApplicationV2;
	return r ? fe(r) : null;
}
function pe() {
	let e = ce(), t = le(), n = globalThis.FormApplication ?? t?.FormApplication ?? e?.FormApplication ?? globalThis.Application ?? t?.Application ?? e?.ApplicationV1;
	if (n) return n;
	let r = e?.ApplicationV2;
	return r ? fe(r) : O();
}
//#endregion
//#region src/region-access.mjs
function k(e) {
	if (!e) return [];
	if (Array.isArray(e)) return e;
	if (Array.isArray(e.contents)) return e.contents;
	if (typeof e.values == "function") return Array.from(e.values());
	try {
		return Array.from(e);
	} catch {
		return [];
	}
}
function me(e, t) {
	let n = String(t ?? "");
	return !e || !n ? null : e.get?.(n) ?? k(e).find((e) => String(e?.id ?? e?._id ?? "") === n) ?? null;
}
function he(e, t) {
	let n = String(t ?? "");
	return !e || !n ? !1 : e.has?.(n) || e.get?.(n) ? !0 : k(e).some((e) => {
		let t = Array.isArray(e) ? e[1] : e;
		return String(t?.id ?? t?._id ?? t ?? "") === n;
	});
}
function ge(e) {
	return !!e && (Array.isArray(e) || Array.isArray(e.contents) || typeof e.has == "function" || typeof e.values == "function" || typeof e[Symbol.iterator] == "function");
}
function _e(e, t) {
	if (!e || !t) return !1;
	let n = String(t.id ?? t._id ?? "");
	return !!n && String(e.actorId ?? e.actor?.id ?? e.document?.actorId ?? "") === n;
}
function ve(e, t, n = "") {
	if (!e || !t) return [];
	let r = k(e.tokens), i = me(e.tokens, n), a = [], o = /* @__PURE__ */ new Set();
	_e(i, t) && (a.push(i), o.add(String(i.id)));
	for (let e of r) {
		let n = String(e?.id ?? "");
		_e(e, t) && !o.has(n) && (a.push(e), o.add(n));
	}
	return a;
}
function ye(e, t) {
	let n = t?.document ?? t, r = Number(e?.grid?.size ?? e?.dimensions?.size ?? globalThis.canvas?.grid?.size ?? 100) || 100, i = Number(n?.x), a = Number(n?.y);
	return !Number.isFinite(i) || !Number.isFinite(a) ? null : {
		x: i + Number(n?.width ?? 1) * r / 2,
		y: a + Number(n?.height ?? 1) * r / 2,
		elevation: Number(n?.elevation ?? 0)
	};
}
function be(e, t) {
	let n = [
		e?.regions,
		e?._regions,
		e?.document?.regions,
		e?.document?._regions,
		e?.object?.regions
	];
	for (let e of n) if (ge(e)) return {
		known: !0,
		present: he(e, t)
	};
	return {
		known: !1,
		present: !1
	};
}
function xe(e, t) {
	let n = [
		e?.tokens,
		e?._tokens,
		e?.document?.tokens,
		e?.object?.tokens
	];
	for (let e of n) if (ge(e)) return {
		known: !0,
		present: he(e, t)
	};
	return {
		known: !1,
		present: !1
	};
}
function A(e, t, n) {
	let r = String(e?.id ?? e?._id ?? ""), i = String(t?.id ?? t?._id ?? t?.document?.id ?? "");
	if (!r || !i) return !1;
	let a = be(t, r);
	if (a.known) return a.present;
	let o = xe(e, i);
	if (o.known) return o.present;
	let s = ye(n, t);
	if (!s) return !1;
	for (let t of [e, e?.object]) if (t) {
		if (typeof t.testPoint == "function") {
			let e = t.testPoint(s, s.elevation);
			if (typeof e == "boolean") return e;
		}
		if (typeof t.contains == "function") {
			let e = t.contains(s.x, s.y) ?? t.contains(s);
			if (typeof e == "boolean") return e;
		}
	}
	return !1;
}
function Se({ scene: e, machine: t, actor: n, tokenId: r = "" }) {
	if (!e || !t || !n) return null;
	let i = new Set((t.regionIds ?? []).map((e) => String(e)));
	if (!i.size) return null;
	let a = k(e.regions).filter((e) => i.has(String(e?.id ?? e?._id ?? "")));
	for (let t of ve(e, n, r)) for (let n of a) if (A(n, t, e)) return {
		region: n,
		token: t.document ?? t
	};
	return null;
}
function Ce({ scene: e, machines: t = [], actor: n, tokenId: r = "" }) {
	let i = /* @__PURE__ */ new Map();
	if (!e || !n || !Array.isArray(t) || !t.length) return i;
	let a = new Set(t.flatMap((e) => (e.regionIds ?? []).map((e) => String(e)))), o = k(e.regions).filter((e) => a.has(String(e?.id ?? e?._id ?? ""))), s = /* @__PURE__ */ new Map();
	for (let t of ve(e, n, r)) for (let n of o) {
		let r = String(n?.id ?? n?._id ?? "");
		!s.has(r) && A(n, t, e) && s.set(r, {
			region: n,
			token: t.document ?? t
		});
	}
	for (let e of t) {
		let t = (e.regionIds ?? []).map((e) => s.get(String(e))).find(Boolean);
		t && i.set(e.id, t);
	}
	return i;
}
//#endregion
//#region src/machine-browser-app.ts
var we = O();
function j() {
	return canvas?.tokens?.controlled?.[0]?.actor ?? game.user.character ?? null;
}
function Te(e) {
	let t = [], n = canvas?.scene, r = D.getMachines(), i = Array.from(n?.regions?.contents ?? n?.regions ?? []), a = new Map(i.map((e) => [String(e.id), e])), o = canvas?.tokens?.controlled?.[0]?.document?.id ?? "", s = Ce({
		scene: n,
		machines: game.user?.isGM ? [] : r.filter((e) => e.access?.requireProximity),
		actor: e,
		tokenId: o
	});
	for (let e of r) {
		let n = e.regionIds?.map?.((e) => a.get(String(e))).find(Boolean);
		if (!n) continue;
		let r = e.access?.requireProximity && !game.user?.isGM, i = r ? s.get(e.id) : null;
		if (r && !i) continue;
		let c = i?.region ?? n, l = i?.token?.id ?? o;
		if (!c) continue;
		let u = D.getMachineState(e);
		t.push({
			regionId: c.id,
			tokenId: l,
			machineId: e.id,
			name: e.name,
			description: e.description,
			image: D.getMachineDisplayImage(e),
			inventoryCount: e.inventory?.length ?? 0,
			availableProducts: e.inventory?.filter((e) => e.stock > 0).length ?? 0,
			totalStock: e.inventory?.reduce((e, t) => e + t.stock, 0) ?? 0,
			state: u,
			offline: u === "offline",
			linkLabel: `Region: ${c.name || c.id}`
		});
	}
	return t;
}
var Ee = class extends we {
	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			id: "holosuite-vending-browser",
			classes: ["holosuite-vending-window", "holosuite-vending-browser-app"],
			template: o.browser,
			width: 620,
			height: "auto",
			resizable: !0,
			title: "Vending Access"
		});
	}
	async getData() {
		let e = j();
		return {
			machines: Te(e),
			actorName: e?.name ?? "",
			sceneName: canvas?.scene?.name ?? "Current Scene"
		};
	}
	activateListeners(e) {
		super.activateListeners(e), e.find("[data-action='open-machine']").on("click", (e) => {
			let t = e.currentTarget.dataset.machineId, n = e.currentTarget.dataset.regionId, r = e.currentTarget.dataset.tokenId ?? "";
			game.holosuiteVending.openMachine(t, j(), {
				source: "region-browser",
				sceneId: canvas?.scene?.id ?? "",
				regionId: n,
				tokenId: r
			});
		});
	}
}, M = Object.freeze({
	cp: .01,
	sp: .1,
	ep: .5,
	gp: 1,
	pp: 10
});
function N(e) {
	return Math.round((Number(e) + 2 ** -52) * 1e8) / 1e8;
}
function P(e, t = M) {
	return Number(t[String(e).toLocaleLowerCase()]) || 1;
}
function F(e = [], t = M) {
	return N((Array.isArray(e) ? e : []).reduce((e, n) => e + (Number(n?.amount) || 0) * P(n?.key, t), 0));
}
function De(e = [], t = 0, n = M) {
	let r = Array.isArray(e) ? e : [], i = F(r, n), a = N(Math.max(0, i - Math.max(0, Number(t) || 0))), o = [...r].sort((e, t) => P(t?.key, n) - P(e?.key, n)), s = {};
	return o.forEach((e, t) => {
		let r = P(e?.key, n), i = t === o.length - 1 ? N(a / r) : Math.floor(N(a / r));
		s[e.path] = i, a = N(Math.max(0, a - i * r));
	}), {
		updates: s,
		totalBefore: i,
		totalAfter: F(r.map((e) => ({
			...e,
			amount: s[e.path] ?? e.amount
		})), n)
	};
}
function Oe(e, t = null) {
	return e ? t && !t.isGM && e.userId !== t.id ? "forbidden" : e.status === "delivering" ? "busy" : "deliver" : "missing";
}
function ke(e, t = Date.now()) {
	return Math.max(0, Number(e) - Number(t));
}
//#endregion
//#region src/purchase-service.ts
var Ae = [
	"system.quantity",
	"system.qty",
	"system.amount",
	"system.count",
	"system.stack",
	"system.uses.value"
], je = [
	"system.currency",
	"system.currencies",
	"system.money",
	"system.wealth",
	"system.resources.currency"
], Me = M, Ne = {
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
function I(e) {
	for (let t of Ae) {
		let n = foundry.utils.getProperty(e, t);
		if (Number.isFinite(Number(n))) return {
			path: t,
			value: Number(n)
		};
	}
	return {
		path: null,
		value: 1
	};
}
function Pe(e) {
	return Array.from(e?.items ?? []);
}
function Fe(e, t) {
	let n = String(t).trim().toLocaleLowerCase();
	return Pe(e).find((e) => String(e.name).trim().toLocaleLowerCase() === n);
}
function Ie(e, t) {
	return e == null || e === "" ? [] : Number.isFinite(Number(e)) ? [{
		key: t.split(".").at(-1) || "currency",
		path: t,
		amount: Number(e)
	}] : typeof e != "object" || Array.isArray(e) ? [] : Object.entries(e).filter(([, e]) => e !== null && e !== "" && Number.isFinite(Number(e))).map(([e, n]) => ({
		key: e,
		path: `${t}.${e}`,
		amount: Number(n)
	}));
}
function Le(e) {
	if (!e) return [];
	let t = D.getCurrencyPath(), n = t ? [t, ...je] : je, r = /* @__PURE__ */ new Set();
	for (let t of n) {
		if (!t || r.has(t)) continue;
		r.add(t);
		let n = Ie(foundry.utils.getProperty(e, t), t);
		if (n.length) return n;
	}
	return [];
}
function Re(e) {
	return F(e);
}
function ze(e) {
	let t = e.map((e) => String(e.key).toLocaleLowerCase());
	return t.some((e) => Object.hasOwn(Me, e)) ? "GP" : t.length === 1 ? Ne[t[0]] ?? String(e[0].key).toLocaleUpperCase() : D.getCurrencyName();
}
function L(e) {
	let t = D.getCurrencyMode(), n = Le(e);
	if ((t === "auto" || t === "actor") && n.length) return {
		kind: "actor",
		actor: e,
		entries: n,
		value: Re(n),
		label: D.getCreditTransformer() ? "Credits" : ze(n)
	};
	if (t === "actor") return {
		kind: "invalid",
		actor: e,
		value: 0,
		label: D.getCurrencyName()
	};
	let r = Fe(e, D.getCurrencyName());
	return r ? {
		kind: "item",
		item: r,
		value: I(r).value,
		label: r.name || D.getCurrencyName()
	} : {
		kind: "missing",
		value: 0,
		label: D.getCurrencyName()
	};
}
function Be(e, t) {
	return !t || !e ? !1 : e.isGM ? !0 : t.testUserPermission?.(e, "OWNER") ?? !1;
}
function Ve({ machine: e, actor: t, user: n, context: r = {} }) {
	return e ? D.getMachineState(e) === s.OFFLINE ? {
		allowed: !1,
		reason: game.i18n.localize("HOLOSUITEVENDING.Notifications.Offline")
	} : n?.isGM ? {
		allowed: !0,
		reason: ""
	} : e.access?.requireProximity && !Se({
		scene: me(game.scenes, r.sceneId) ?? canvas?.scene,
		machine: e,
		actor: t,
		tokenId: r.tokenId
	}) ? {
		allowed: !1,
		reason: game.i18n.localize("HOLOSUITEVENDING.Notifications.TooFar")
	} : {
		allowed: !0,
		reason: ""
	} : {
		allowed: !1,
		reason: game.i18n.localize("HOLOSUITEVENDING.Notifications.NoMachine")
	};
}
async function He(e) {
	if (e.itemUuid) {
		let t = await fromUuid(e.itemUuid);
		if (t) return t.toObject ? t.toObject() : foundry.utils.deepClone(t);
	}
	if (e.embeddedData) return foundry.utils.deepClone(e.embeddedData);
	let t = game.system?.documentTypes?.Item?.[0] ?? "loot";
	return {
		name: e.displayName,
		type: t,
		img: e.image,
		system: {}
	};
}
async function Ue(e, t) {
	if (e.itemData) return foundry.utils.deepClone(e.itemData);
	if (e.itemUuid) {
		let t = await fromUuid(e.itemUuid);
		if (t) return t.toObject ? t.toObject() : foundry.utils.deepClone(t);
	}
	let n = D.getMachine(t);
	return He([...n?.inventory ?? [], ...n?.overflowInventory ?? []].find((t) => t.id === e.entryId) || {
		displayName: e.displayName,
		image: e.image
	});
}
async function We(e, t) {
	if (!e || t <= 0) return null;
	if (e.kind === "actor") {
		let n = Object.fromEntries(e.entries.map((e) => [e.path, e.amount])), { updates: r } = De(e.entries, t);
		return await e.actor.update(r), {
			type: "actor",
			actor: e.actor,
			previous: n
		};
	}
	if (e.kind !== "item") return null;
	let n = e.item, r = I(n), i = n.toObject ? n.toObject() : foundry.utils.deepClone(n), a = r.value - t;
	return a <= 0 ? (await n.delete(), {
		type: "deleted",
		actor: n.parent,
		snapshot: i
	}) : (await n.update({ [r.path]: a }), {
		type: "updated",
		item: n,
		path: r.path,
		previous: r.value
	});
}
async function Ge(e) {
	if (!e) return;
	if (e.type === "actor") {
		await e.actor.update(e.previous);
		return;
	}
	if (e.type === "updated") {
		await e.item.update({ [e.path]: e.previous });
		return;
	}
	let t = foundry.utils.deepClone(e.snapshot);
	delete t._id, await e.actor.createEmbeddedDocuments("Item", [t]);
}
async function Ke(e, t, n) {
	let r = foundry.utils.deepClone(t);
	delete r._id, r.name = r.name || "Vended Item", r.img = r.img || "icons/svg/item-bag.svg";
	let i = I(r), a = Pe(e).find((e) => e.name === r.name && e.type === r.type);
	if (a) {
		let e = I(a);
		if (e.path) {
			let t = Math.max(1, i.value) * n;
			return await a.update({ [e.path]: e.value + t }), {
				type: "updated",
				item: a,
				path: e.path,
				previous: e.value
			};
		}
	}
	if (i.path) return foundry.utils.setProperty(r, i.path, Math.max(1, i.value) * n), {
		type: "created",
		actor: e,
		ids: (await e.createEmbeddedDocuments("Item", [r])).map((e) => e.id)
	};
	let o = Array.from({ length: n }, () => foundry.utils.deepClone(r));
	return {
		type: "created",
		actor: e,
		ids: (await e.createEmbeddedDocuments("Item", o)).map((e) => e.id)
	};
}
async function qe(e) {
	for (let t of [...e].reverse()) t.type === "updated" ? await t.item.update({ [t.path]: t.previous }) : t.ids?.length && await t.actor.deleteEmbeddedDocuments("Item", t.ids);
}
async function R(n, r, i) {
	if (game.user.id === n) {
		ui.notifications[r]?.(i);
		return;
	}
	game.socket.emit(t, {
		type: "notify",
		moduleId: e,
		userId: n,
		level: r,
		message: i
	});
}
function Je(n, r) {
	let i = {
		type: "purchase-result",
		moduleId: e,
		userId: n,
		...r
	};
	if (game.user.id === n) {
		Hooks.callAll(`${e}.purchaseResult`, i);
		return;
	}
	game.socket.emit(t, i);
}
function z(n, r) {
	let i = {
		type: "collection-result",
		moduleId: e,
		userId: n,
		...r
	};
	if (game.user.id === n) {
		Hooks.callAll(`${e}.collectionResult`, i);
		return;
	}
	game.socket.emit(t, i);
}
async function Ye({ actor: e, itemSummary: t, totalPrice: n, currencyName: r }) {
	await ChatMessage.create({
		speaker: ChatMessage.getSpeaker({ actor: e }),
		content: game.i18n.format("HOLOSUITEVENDING.Notifications.Purchased", {
			actor: e.name,
			item: t,
			price: u(n),
			currency: r
		})
	});
}
async function Xe(t) {
	try {
		return await D.appendLedger(t);
	} catch (t) {
		return console.warn(`${e} | Could not update transaction ledger`, t), null;
	}
}
var B = class {
	static transactionQueue = Promise.resolve();
	static processedRequests = /* @__PURE__ */ new Set();
	static dispenseTimers = /* @__PURE__ */ new Map();
	static resolvedReservationItems = /* @__PURE__ */ new Map();
	static registerSocket() {
		game.socket.on(t, async (t) => {
			if (!(!t || t.moduleId && t.moduleId !== "holosuite-vending-machines")) {
				if (t.type === "notify" && t.userId === game.user.id) {
					ui.notifications[t.level || "info"]?.(t.message);
					return;
				}
				if (t.type === "purchase-result" && t.userId === game.user.id) {
					Hooks.callAll(`${e}.purchaseResult`, t);
					return;
				}
				if (t.type === "collection-result" && t.userId === game.user.id) {
					Hooks.callAll(`${e}.collectionResult`, t);
					return;
				}
				if (t.type === "purchase" && game.user.isGM && this.isResponsibleGM()) {
					await this.handlePurchaseRequest(t);
					return;
				}
				t.type === "collection" && game.user.isGM && this.isResponsibleGM() && await this.handleCollectionRequest(t);
			}
		});
	}
	static isResponsibleGM() {
		return game.users.find((e) => e.active && e.isGM)?.id === game.user.id;
	}
	static checkAccess({ machineId: e, machine: t = null, actor: n, user: r = game.user, context: i = {} }) {
		return Ve({
			machine: t ?? D.getMachine(e),
			actor: n,
			user: r,
			context: i
		});
	}
	static getCurrencyBalance(e) {
		return L(e).value;
	}
	static getCurrencyProfile(e) {
		let t = L(e);
		return {
			balance: t.value,
			label: t.label,
			source: t.kind
		};
	}
	static enqueue(e) {
		let t = this.transactionQueue.then(() => this.processPurchase(e));
		return this.transactionQueue = t.catch(() => void 0), t;
	}
	static enqueueCollection(e) {
		let t = this.transactionQueue.then(() => this.finalizeDispense(e));
		return this.transactionQueue = t.catch(() => void 0), t;
	}
	static scheduleDispense(t) {
		let n = t?.requestId;
		if (!n || !game.user?.isGM || !this.isResponsibleGM()) return;
		let r = this.dispenseTimers.get(n);
		r && window.clearTimeout(r);
		let i = ke(t.expiresAt), a = window.setTimeout(async () => {
			this.dispenseTimers.delete(n);
			try {
				await this.enqueueCollection({
					requestId: n,
					automatic: !0
				});
			} catch (t) {
				console.warn(`${e} | Automatic vending collection failed`, t);
			}
		}, Math.min(i, 2147e6));
		this.dispenseTimers.set(n, a);
	}
	static resumePendingDispenses() {
		if (!(!game.user?.isGM || !this.isResponsibleGM())) for (let e of D.getPendingDispenses()) this.scheduleDispense(e);
	}
	static async requestPurchase({ machineId: n, entryId: r = "", lines: i = [], actor: a, context: o = {} }) {
		let s = p(i.length ? i : [{
			entryId: r,
			quantity: 1
		}]);
		if (!a) return ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoActor")), !1;
		if (!s.length) return !1;
		let c = this.checkAccess({
			machineId: n,
			actor: a,
			context: o
		});
		if (!c.allowed) return ui.notifications.warn(c.reason), !1;
		let l = foundry?.utils?.randomID?.(16) ?? `${game.user.id}-${Date.now()}-${Math.random()}`;
		if (game.user.isGM && this.isResponsibleGM()) try {
			return {
				accepted: !0,
				pending: !1,
				requestId: l,
				result: await this.enqueue({
					requestId: l,
					machineId: n,
					lines: s,
					actor: a,
					user: game.user,
					context: o
				})
			};
		} catch (e) {
			return ui.notifications.warn(e.message), !1;
		}
		return Be(game.user, a) ? game.users.find((e) => e.active && e.isGM) ? (game.socket.emit(t, {
			type: "purchase",
			moduleId: e,
			requestId: l,
			userId: game.user.id,
			machineId: n,
			lines: s,
			actorUuid: a.uuid,
			context: o
		}), ui.notifications.info(game.i18n.localize("HOLOSUITEVENDING.Notifications.Processing")), {
			accepted: !0,
			pending: !0,
			requestId: l
		}) : (ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoGM")), !1) : (ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoActor")), !1);
	}
	static async handlePurchaseRequest(t) {
		let n = game.users.get(t.userId), r = await fromUuid(t.actorUuid);
		try {
			let e = await this.enqueue({
				requestId: t.requestId,
				machineId: t.machineId,
				lines: t.lines,
				actor: r,
				user: n,
				context: t.context ?? {}
			});
			Je(t.userId, {
				status: "success",
				requestId: t.requestId,
				machineId: t.machineId,
				reservationId: e?.reservation?.requestId ?? t.requestId,
				itemCount: e?.cart?.itemCount ?? 0,
				image: e?.reservation?.image ?? ""
			});
		} catch (n) {
			console.warn(`${e} | Purchase failed`, n), await R(t.userId, "warn", n.message), Je(t.userId, {
				status: "failed",
				requestId: t.requestId,
				machineId: t.machineId,
				message: n.message
			});
		}
	}
	static async requestCollection({ requestId: n, automatic: r = !1 }) {
		if (!n) return !1;
		if (game.user.isGM && this.isResponsibleGM()) try {
			return {
				accepted: !0,
				pending: !1,
				result: await this.enqueueCollection({
					requestId: n,
					user: game.user,
					automatic: r
				})
			};
		} catch (e) {
			return ui.notifications.warn(e.message), !1;
		}
		return game.users.find((e) => e.active && e.isGM) ? (game.socket.emit(t, {
			type: "collection",
			moduleId: e,
			requestId: n,
			userId: game.user.id,
			automatic: r
		}), {
			accepted: !0,
			pending: !0
		}) : (ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoGM")), !1);
	}
	static async handleCollectionRequest(t) {
		try {
			let e = game.users.get(t.userId), n = await this.enqueueCollection({
				requestId: t.requestId,
				user: e,
				automatic: t.automatic === !0,
				notifyResult: !1
			});
			z(t.userId, {
				status: "success",
				requestId: t.requestId,
				machineId: n?.reservation?.machineId ?? "",
				automatic: n?.automatic === !0
			});
		} catch (n) {
			console.warn(`${e} | Collection failed`, n), await R(t.userId, "warn", n.message), z(t.userId, {
				status: "failed",
				requestId: t.requestId,
				message: n.message
			});
		}
	}
	static async processPurchase({ requestId: t, machineId: n, lines: r, actor: i, user: a, context: o = {} }) {
		let s = D.getPendingDispense(t);
		if (s) return {
			duplicate: !0,
			reservation: s,
			cart: {
				itemCount: s.itemCount,
				totalPrice: s.totalPrice,
				lines: []
			}
		};
		if (this.processedRequests.has(t) || D.hasProcessedRequest(t)) return { duplicate: !0 };
		let c = L(i), l = c.label, u = D.getMachine(n), d = {
			requestId: t,
			machineId: n,
			machineName: u?.name ?? "Unknown machine",
			actorId: i?.id ?? "",
			actorName: i?.name ?? "Unknown actor",
			userId: a?.id ?? "",
			userName: a?.name ?? "Unknown user",
			currencyName: l
		};
		try {
			if (!Be(a, i)) throw Error(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoActor"));
			let s = Ve({
				machine: u,
				actor: i,
				user: a,
				context: o
			});
			if (!s.allowed) throw Error(s.reason);
			let d = m(u, r);
			if (!d.lines.length) throw Error(game.i18n.localize("HOLOSUITEVENDING.Notifications.EmptyCart"));
			if (d.totalPrice > 0 && c.kind === "invalid") throw Error(game.i18n.format("HOLOSUITEVENDING.Notifications.CurrencyPathInvalid", { path: D.getCurrencyPath() || "automatic detection" }));
			if (d.totalPrice > 0 && c.value < d.totalPrice) throw Error(game.i18n.format("HOLOSUITEVENDING.Notifications.NoCurrency", { currency: l }));
			let f = await Promise.all(d.lines.map(async (e) => ({
				line: e,
				itemData: await He(e.entry)
			}))), p = null, h = Object.fromEntries(d.lines.map((e) => [e.entryId, e.entry.stock])), g = !1, _ = null;
			try {
				p = await We(c, d.totalPrice);
				let e = Object.fromEntries(d.lines.map((e) => [e.entryId, e.entry.stock - e.quantity]));
				await D.updateEntryStocks(n, e), g = !0;
				let r = d.lines.map((e) => `${e.quantity}× ${e.entry.displayName}`).join(", ");
				_ = await D.addPendingDispense({
					id: t,
					requestId: t,
					machineId: n,
					machineName: u.name,
					actorUuid: i.uuid,
					actorId: i.id,
					actorName: i.name,
					userId: a.id,
					userName: a.name,
					currencyName: l,
					itemSummary: r,
					itemCount: d.itemCount,
					totalPrice: d.totalPrice,
					items: f.map((e) => ({
						entryId: e.line.entry.id,
						itemUuid: e.line.entry.itemUuid,
						...e.line.entry.itemUuid ? {} : { itemData: e.itemData },
						quantity: e.line.quantity,
						displayName: e.line.entry.displayName,
						image: e.line.entry.image
					})),
					image: d.itemCount > 1 ? "icons/svg/item-bag.svg" : f[0]?.line?.entry?.image ?? "",
					createdAt: Date.now(),
					expiresAt: Date.now() + 10850,
					status: "pending"
				}), this.resolvedReservationItems.set(t, new Map(f.map((e) => [e.line.entry.id, e.itemData])));
			} catch (t) {
				if (g) try {
					await D.updateEntryStocks(n, h);
				} catch (t) {
					console.error(`${e} | Reserved-stock rollback failed`, t);
				}
				try {
					await Ge(p);
				} catch (t) {
					console.error(`${e} | Currency rollback failed`, t);
				}
				throw t;
			}
			return this.processedRequests.add(t), this.processedRequests.size > 500 && this.processedRequests.delete(this.processedRequests.values().next().value), this.scheduleDispense(_), {
				cart: d,
				reservation: _
			};
		} catch (e) {
			throw await Xe({
				...d,
				status: "failed",
				error: e.message
			}), e;
		}
	}
	static async finalizeDispense({ requestId: t, user: n = null, automatic: r = !1, notifyResult: i = !0 }) {
		let a = D.getPendingDispense(t), o = Oe(a, n);
		if (o === "missing") return this.resolvedReservationItems.delete(t), {
			duplicate: !0,
			automatic: r
		};
		if (o === "forbidden") throw Error(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoActor"));
		if (o === "busy") throw Error(game.i18n.localize("HOLOSUITEVENDING.Notifications.CollectionBusy"));
		let s = await fromUuid(a.actorUuid);
		if (!s) throw Error(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoActor"));
		await D.updatePendingDispense(t, { status: "delivering" });
		let c = [];
		try {
			let e = this.resolvedReservationItems.get(t);
			for (let t of a.items) {
				let n = e?.get(t.entryId) ?? await Ue(t, a.machineId);
				c.push(await Ke(s, n, t.quantity));
			}
			await D.removePendingDispense(t), this.resolvedReservationItems.delete(t);
		} catch (n) {
			try {
				await qe(c);
			} catch (t) {
				console.error(`${e} | Collected-item rollback failed`, t);
			}
			throw await D.updatePendingDispense(t, { status: "pending" }), this.scheduleDispense({
				...a,
				expiresAt: Date.now() + 5e3
			}), n;
		}
		let l = this.dispenseTimers.get(t);
		l && window.clearTimeout(l), this.dispenseTimers.delete(t), await Xe({
			requestId: t,
			machineId: a.machineId,
			machineName: a.machineName,
			actorId: a.actorId,
			actorName: a.actorName,
			userId: a.userId,
			userName: a.userName,
			currencyName: a.currencyName,
			status: "success",
			itemSummary: a.itemSummary,
			itemCount: a.itemCount,
			totalPrice: a.totalPrice
		});
		try {
			await Ye({
				actor: s,
				itemSummary: a.itemSummary,
				totalPrice: a.totalPrice,
				currencyName: a.currencyName
			});
		} catch (t) {
			console.warn(`${e} | Could not create purchase chat message`, t);
		}
		return await R(a.userId, "info", game.i18n.format("HOLOSUITEVENDING.Notifications.Purchased", {
			actor: a.actorName,
			item: a.itemSummary,
			price: u(a.totalPrice),
			currency: a.currencyName
		})), r && i && z(a.userId, {
			status: "success",
			requestId: t,
			machineId: a.machineId,
			automatic: !0
		}), {
			reservation: a,
			automatic: r
		};
	}
	static async purchase({ machineId: e, entryId: t, actor: n, user: r, context: i = {} }) {
		return this.enqueue({
			requestId: foundry?.utils?.randomID?.(16) ?? `${Date.now()}-${Math.random()}`,
			machineId: e,
			lines: [{
				entryId: t,
				quantity: 1
			}],
			actor: n,
			user: r,
			context: i
		});
	}
}, Ze = O(), V = /* @__PURE__ */ new Set();
function Qe(e) {
	return e || (canvas?.tokens?.controlled?.[0]?.actor ? canvas.tokens.controlled[0].actor : game.user.character ?? null);
}
function $e(e) {
	let t = document.createElement("div");
	return t.innerHTML = String(e ?? ""), String(t.textContent ?? "").replace(/\s+/g, " ").trim();
}
function et(e, t = 180) {
	if (e.length <= t) return e;
	let n = e.slice(0, Math.max(1, t - 1)), r = n.lastIndexOf(" "), i = r >= Math.floor(t * .65) ? r : n.length;
	return `${n.slice(0, i).trimEnd()}…`;
}
function tt(e) {
	let t = document.createElement("div");
	return t.textContent = String(e ?? ""), t.innerHTML;
}
async function nt(t, n) {
	if (!t) return null;
	let r = globalThis.AudioHelper ?? globalThis.foundry?.audio?.AudioHelper;
	if (r?.play) try {
		return await r.play({
			src: t,
			volume: n,
			loop: !1
		}, !1);
	} catch (t) {
		console.warn(`${e} | AudioHelper playback failed`, t);
	}
	try {
		let e = new Audio(t);
		return e.volume = n, await e.play(), e;
	} catch (t) {
		return console.warn(`${e} | Browser audio playback failed`, t), null;
	}
}
function H(t) {
	try {
		typeof t?.stop == "function" ? t.stop() : typeof t?.pause == "function" && t.pause();
	} catch (t) {
		console.warn(`${e} | Could not stop vending audio`, t);
	}
}
var U = class extends Ze {
	machineId;
	actor;
	selectedEntryId;
	context;
	cart;
	lastDispense;
	pendingRequestId;
	pendingDispense;
	activeReservationId;
	checkoutPending;
	pendingFocusSelector;
	dispenseTimers;
	audioHandles;
	audioRequestVersions;
	isClosing;
	viewportResizeHandler;
	viewportResizeFrame;
	constructor(e, t = {}) {
		super({
			...t,
			id: `holosuite-vending-machine-${e}`
		}), this.machineId = e, this.actor = Qe(t.actor), this.selectedEntryId = t.selectedEntryId ?? null, this.context = t.context ?? {}, this.cart = /* @__PURE__ */ new Map(), this.lastDispense = null, this.pendingRequestId = null, this.pendingDispense = null, this.activeReservationId = null, this.checkoutPending = !1, this.pendingFocusSelector = "", this.dispenseTimers = /* @__PURE__ */ new Set(), this.audioHandles = /* @__PURE__ */ new Map(), this.audioRequestVersions = /* @__PURE__ */ new Map(), this.isClosing = !1, this.viewportResizeFrame = null, this.viewportResizeHandler = () => {
			this.viewportResizeFrame === null && (this.viewportResizeFrame = window.requestAnimationFrame(() => {
				this.viewportResizeFrame = null, this.applyViewportScale();
			}));
		}, window.addEventListener("resize", this.viewportResizeHandler), V.add(this);
	}
	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			id: "holosuite-vending-machine",
			classes: ["holosuite-vending-window", "holosuite-vending-app"],
			template: o.vending,
			width: 1050,
			height: "auto",
			resizable: !1,
			minimizable: !1,
			title: "HoloSuite Vending Machine"
		});
	}
	get title() {
		return D.getMachine(this.machineId)?.name ?? "HoloSuite Vending Machine";
	}
	async close(e = {}) {
		this.isClosing = !0, this.clearDispenseTimers(), this.viewportResizeFrame !== null && window.cancelAnimationFrame(this.viewportResizeFrame), this.viewportResizeFrame = null;
		for (let e of this.audioHandles.values()) H(e);
		return this.audioHandles.clear(), window.removeEventListener("resize", this.viewportResizeHandler), V.delete(this), super.close(e);
	}
	get machine() {
		return D.getMachine(this.machineId);
	}
	playAudio(e) {
		let t = D.getAudioConfig(), n = t[e];
		if (!t.enabled || !n || t.volume <= 0) return;
		H(this.audioHandles.get(e)), this.audioHandles.delete(e);
		let r = (this.audioRequestVersions.get(e) ?? 0) + 1;
		this.audioRequestVersions.set(e, r), nt(n, t.volume).then((t) => {
			if (t) {
				if (this.isClosing || this.audioRequestVersions.get(e) !== r) {
					H(t);
					return;
				}
				this.audioHandles.set(e, t);
			}
		});
	}
	async openProductDetails(t) {
		let n = this.machine?.inventory?.find((e) => e.id === t);
		if (!n) return;
		if (n.itemUuid) try {
			let e = await fromUuid(n.itemUuid);
			if (e?.sheet?.render) {
				e.sheet.render(!0);
				return;
			}
		} catch (t) {
			console.warn(`${e} | Could not open source item ${n.itemUuid}`, t);
		}
		let r = $e(n.description);
		new Dialog({
			title: n.displayName || "Product Details",
			content: `<div class="hsv-product-dialog"><p>${tt(r || "No product description supplied.")}</p></div>`,
			buttons: { close: { label: "Close" } },
			default: "close"
		}).render(!0);
	}
	clearDispenseTimers() {
		for (let e of this.dispenseTimers) window.clearTimeout(e);
		this.dispenseTimers.clear();
	}
	scheduleDispense(e, t) {
		let n = window.setTimeout(() => {
			this.dispenseTimers.delete(n), e();
		}, t);
		this.dispenseTimers.add(n);
	}
	beginDispenseSequence(e, t = "", n = "") {
		this.clearDispenseTimers(), this.pendingRequestId = null, this.pendingDispense = null, this.activeReservationId = n, this.checkoutPending = !1, this.lastDispense = {
			state: "dispensing",
			message: "PLEASE STAND CLEAR",
			image: t
		}, this.playAudio("dispense"), this.render(!1), this.scheduleDispense(() => {
			this.lastDispense = {
				state: "ready",
				message: `${e} ITEM${e === 1 ? "" : "S"}: CLICK TO RETRIEVE`,
				image: t
			}, this.render(!1);
		}, 850);
	}
	async finishRetrieval(e = !1) {
		if (this.lastDispense?.state !== "ready" || !this.activeReservationId) return;
		let t = this.lastDispense.image ?? "";
		this.lastDispense = {
			state: "collecting",
			message: e ? "AUTOMATIC TRANSFER" : "SECURING ITEM",
			image: t
		}, this.render(!1);
		let n = await B.requestCollection({
			requestId: this.activeReservationId,
			automatic: e
		});
		if (!n) {
			this.lastDispense = {
				state: "ready",
				message: "CLICK TO RETRY COLLECTION",
				image: t
			}, this.render(!1);
			return;
		}
		n.pending || this.showCollectionComplete(n.result?.automatic === !0, t);
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
		this.clearDispenseTimers(), this.pendingRequestId = null, this.pendingDispense = null, this.checkoutPending = !1, this.playAudio("failure"), this.lastDispense = {
			state: "failure",
			message: e
		}, this.render(!1), this.scheduleDispense(() => {
			this.lastDispense = null, this.render(!1);
		}, 3500);
	}
	handlePurchaseResult(e) {
		if (e.machineId !== this.machineId || e.requestId !== this.pendingRequestId) return;
		let t = this.pendingDispense ?? {
			itemCount: Number(e.itemCount) || 1,
			image: ""
		};
		if (e.status === "success") {
			this.cart.clear(), this.beginDispenseSequence(Number(e.itemCount) || t.itemCount, e.image || t.image, e.reservationId || e.requestId);
			return;
		}
		this.showDispenseFailure(e.message || "AUTHORIZATION FAILED");
	}
	handleCollectionResult(e) {
		if (e.requestId !== this.activeReservationId) return;
		let t = this.lastDispense?.image ?? "";
		if (e.status === "success") {
			this.showCollectionComplete(e.automatic === !0, t);
			return;
		}
		this.lastDispense = {
			state: "ready",
			message: e.message || "CLICK TO RETRY COLLECTION",
			image: t
		}, this.render(!1);
	}
	pruneCart(e) {
		let t = new Map(e.map((e) => [e.id, e]));
		for (let [e, n] of this.cart) {
			let r = t.get(e);
			!r || r.stock <= 0 ? this.cart.delete(e) : this.cart.set(e, Math.min(n, r.stock));
		}
	}
	renderWithFocus(e = "") {
		this.pendingFocusSelector = e, this.render(!1);
	}
	applyViewportScale() {
		let e = (this.element?.[0] ?? this.element)?.querySelector?.(".hsv-machine"), t = e?.querySelector?.(".hsv-machine-chassis");
		if (!e || !t) return;
		e.style.zoom = "1";
		let n = t.getBoundingClientRect();
		if (!n.width || !n.height) return;
		let r = Math.max(320, window.innerWidth - 28), i = Math.max(320, window.innerHeight - 28), a = Math.max(.56, Math.min(1, r / n.width, i / n.height));
		e.style.zoom = String(Math.floor(a * 100) / 100), e.dataset.viewportScale = String(Math.round(a * 100));
	}
	async getData() {
		let e = this.machine, t = e?.inventory ?? [];
		this.pruneCart(t);
		let n = B.getCurrencyProfile(this.actor), r = n.balance;
		!this.selectedEntryId && t.length && (this.selectedEntryId = d(t, r));
		let i = t.find((e) => e.id === this.selectedEntryId) ?? t[0] ?? null;
		this.selectedEntryId = i?.id ?? null;
		let a = t.filter((e) => this.cart.has(e.id)).map((e) => {
			let t = this.cart.get(e.id) ?? 0, n = e.price * t;
			return {
				...e,
				quantity: t,
				lineTotal: n,
				lineTotalDisplay: u(n)
			};
		}), o = a.reduce((e, t) => e + t.quantity, 0), s = a.reduce((e, t) => e + t.lineTotal, 0), c = B.checkAccess({
			machineId: this.machineId,
			machine: e,
			actor: this.actor,
			context: this.context
		}), l = D.getMachineState(e), f = t.map((e, t) => {
			let n = e.maxStock > 0 ? e.stock / e.maxStock : 0, a = e.stock > 0 ? Math.max(1, Math.ceil(n * 10)) : 0, o = e.stock > 0 && e.stock <= Math.max(1, Math.ceil(e.maxStock * .25)), s = $e(e.description);
			return {
				...e,
				slotCode: `${String.fromCharCode(65 + Math.floor(t / 3))}${String(t % 3 + 1).padStart(2, "0")}`,
				selected: i?.id === e.id,
				soldOut: e.stock <= 0,
				lowStock: o,
				affordable: e.price <= r,
				priceDisplay: u(e.price),
				cartQuantity: this.cart.get(e.id) ?? 0,
				descriptionPreview: et(s) || "No product profile supplied.",
				descriptionCanOpen: !!(e.itemUuid || s),
				stockSegments: Array.from({ length: 10 }, (e, t) => ({ active: t < a }))
			};
		}), p = Math.max(6, Math.ceil(f.length / 3) * 3), m = [
			{
				label: game.i18n.localize("HOLOSUITEVENDING.Player.EmptySlot"),
				detail: game.i18n.localize("HOLOSUITEVENDING.Player.Unassigned"),
				icon: "fa-box-open"
			},
			{
				label: game.i18n.localize("HOLOSUITEVENDING.Player.Unassigned"),
				detail: game.i18n.localize("HOLOSUITEVENDING.Player.NoProductData"),
				icon: "fa-plug"
			},
			{
				label: game.i18n.localize("HOLOSUITEVENDING.Player.OfflineSlot"),
				detail: game.i18n.localize("HOLOSUITEVENDING.Player.ServiceRequired"),
				icon: "fa-power-off"
			},
			{
				label: game.i18n.localize("HOLOSUITEVENDING.Player.Maintenance"),
				detail: game.i18n.localize("HOLOSUITEVENDING.Player.KeepClear"),
				icon: "fa-wrench"
			}
		], h = Array.from({ length: p }, (e, t) => {
			if (f[t]) return f[t];
			let n = m[t % m.length];
			return {
				empty: !0,
				slotCode: `${String.fromCharCode(65 + Math.floor(t / 3))}${String(t % 3 + 1).padStart(2, "0")}`,
				emptyLabel: n.label,
				emptyDetail: n.detail,
				emptyIcon: n.icon,
				emptyVariant: t % m.length
			};
		}), g = f.find((e) => e.id === i?.id) ?? null, _ = s > r, v = String(e?.id ?? this.machineId).replace(/[^a-z0-9]/gi, "").toUpperCase(), y = this.lastDispense ?? {
			state: "standby",
			message: l === "offline" ? "OUTPUT BAY LOCKED" : "AWAITING PURCHASE"
		}, b = {
			standby: l === "offline" ? "LOCKED" : "READY",
			authorizing: "AUTHORIZING",
			dispensing: "DISPENSING",
			ready: "COLLECT ITEM",
			collecting: "TRANSFERRING",
			collected: "ITEM COLLECTED",
			automatic: "AUTO DISPENSED",
			failure: "TRANSACTION FAILED"
		}, x = e?.styleId ?? "industrial", ee = x === "corporate-kiosk-white" ? "corporate-kiosk" : x === "neon" ? "industrial" : x;
		return {
			machine: e,
			manufacturerName: e?.manufacturerName ?? "HoloSuite",
			machineStyleId: x,
			machineStyleBaseId: ee,
			machineDisplayImage: D.getMachineDisplayImage(e),
			machineState: l,
			machineOffline: l === "offline",
			machineSoldOut: l === "sold-out",
			displaySlots: h,
			selected: g,
			selectedSoldOut: !g || g.stock <= 0,
			actorName: this.actor?.name ?? "",
			currencyName: n.label,
			currencyBalance: r,
			currencyBalanceDisplay: u(r),
			accessAllowed: c.allowed,
			accessReason: c.reason,
			cartLines: a,
			cartCount: o,
			cartTotal: s,
			cartTotalDisplay: u(s),
			insufficientBalance: _,
			canCheckout: c.allowed && o > 0 && !_ && !this.checkoutPending && ![
				"authorizing",
				"dispensing",
				"ready",
				"collecting"
			].includes(this.lastDispense?.state ?? ""),
			checkoutPending: this.checkoutPending,
			unitNumber: `HSV-${v.slice(-6).padStart(6, "0")}`,
			systemStatus: l === "online" ? "NOMINAL" : l === "sold-out" ? "DEPLETED" : "OFFLINE",
			telemetryTemperature: l === "offline" ? "--" : "04 C",
			telemetryBus: l === "offline" ? "0 V" : "48 V",
			connectionStatus: l === "offline" ? "DOWN" : "LINK",
			retrievalState: y.state,
			retrievalMessage: y.message,
			retrievalLabel: b[y.state] ?? "READY",
			retrievalImage: y.image ?? "",
			retrievalCanCollect: y.state === "ready"
		};
	}
	activateListeners(e) {
		super.activateListeners(e), e.find("[data-action='close-machine']").on("click", () => this.close()), e.find("[data-action='collect-dispensed']").on("click", () => this.finishRetrieval(!1)), e.find("[data-action='open-product-details']").on("click", async (e) => {
			e.preventDefault(), await this.openProductDetails(e.currentTarget.dataset.entryId);
		});
		let t = e?.[0] ?? e, n = this.pendingFocusSelector;
		this.pendingFocusSelector = "", window.requestAnimationFrame(() => {
			this.applyViewportScale(), n && t?.querySelector?.(n)?.focus?.();
		}), (t?.querySelector?.("[data-drag-handle]"))?.addEventListener("pointerdown", (e) => {
			let n = e.target;
			if (e.button !== 0 || n.closest("button, input, select, textarea, a")) return;
			let r = this.element?.[0] ?? this.element ?? t.closest?.(".window-app, .application, .app");
			if (!r?.getBoundingClientRect) return;
			e.preventDefault();
			let i = r.getBoundingClientRect(), a = e.clientX, o = e.clientY, s = null, c = null;
			r.classList?.add("hsv-is-dragging");
			let l = () => {
				s = null, c &&= (this.setPosition?.(c), null);
			}, u = (e) => {
				let t = i.left + e.clientX - a, n = i.top + e.clientY - o, r = Math.min(window.innerWidth - 80, Math.max(80 - i.width, t)), u = Math.min(window.innerHeight - 40, Math.max(0, n));
				c = {
					left: Math.round(r),
					top: Math.round(u)
				}, s === null && (s = window.requestAnimationFrame(l));
			}, d = () => {
				s !== null && (window.cancelAnimationFrame(s), l()), r.classList?.remove("hsv-is-dragging"), document.removeEventListener("pointermove", u), document.removeEventListener("pointerup", d), document.removeEventListener("pointercancel", d);
			};
			document.addEventListener("pointermove", u), document.addEventListener("pointerup", d), document.addEventListener("pointercancel", d);
		}), e.find("[data-action='select-entry']").on("click", (e) => {
			this.selectedEntryId !== e.currentTarget.dataset.entryId && this.playAudio("select"), this.selectedEntryId = e.currentTarget.dataset.entryId;
			let t = globalThis.CSS?.escape?.(this.selectedEntryId) ?? this.selectedEntryId;
			this.renderWithFocus(`[data-action='select-entry'][data-entry-id='${t}']`);
		}), e.find("[data-action='decrease-quantity'], [data-action='increase-quantity']").on("click", (t) => {
			let n = e.find("[name='purchaseQuantity']"), r = Math.max(1, Number(n.attr("min")) || 1), i = Math.max(r, Number(n.attr("max")) || r), a = t.currentTarget.dataset.action === "increase-quantity" ? 1 : -1, o = Math.min(i, Math.max(r, (Number(n.val()) || r) + a));
			n.val(o).trigger("change");
		}), e.find("[data-action='add-to-cart']").on("click", () => {
			let t = this.machine?.inventory?.find((e) => e.id === this.selectedEntryId);
			if (!t || t.stock <= 0) return;
			let n = Math.max(1, Math.floor(Number(e.find("[name='purchaseQuantity']").val()) || 1)), r = Math.min(t.stock, (this.cart.get(t.id) ?? 0) + n);
			this.cart.set(t.id, r), this.renderWithFocus("[data-action='add-to-cart']");
		}), e.find("[data-action='remove-from-cart']").on("click", (e) => {
			this.cart.delete(e.currentTarget.dataset.entryId), this.renderWithFocus("[data-action='add-to-cart']");
		}), e.find("[data-action='clear-cart']").on("click", () => {
			this.cart.clear();
			let e = globalThis.CSS?.escape?.(this.selectedEntryId ?? "") ?? this.selectedEntryId;
			this.renderWithFocus(`[data-action='select-entry'][data-entry-id='${e}']`);
		}), e.find("[data-action='checkout']").on("click", async () => {
			if (!this.actor) {
				ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoActor"));
				return;
			}
			let e = Array.from(this.cart, ([e, t]) => ({
				entryId: e,
				quantity: t
			}));
			if (!e.length) return;
			let t = e.reduce((e, t) => e + t.quantity, 0), n = e.reduce((e, t) => e + (this.machine?.inventory?.find((e) => e.id === t.entryId)?.price ?? 0) * t.quantity, 0), r = t > 1 ? "icons/svg/item-bag.svg" : this.machine?.inventory?.find((t) => t.id === e[0].entryId)?.image ?? "";
			if (!await Dialog.confirm({
				title: game.i18n.localize("HOLOSUITEVENDING.Cart.Checkout"),
				content: `<p>${game.i18n.format("HOLOSUITEVENDING.Cart.Confirm", {
					count: t,
					total: u(n),
					currency: B.getCurrencyProfile(this.actor).label
				})}</p>`
			})) return;
			this.checkoutPending = !0, this.lastDispense = {
				state: "authorizing",
				message: "PROCESSING PAYMENT"
			}, this.render(!1), this.playAudio("purchase");
			let i = await B.requestPurchase({
				machineId: this.machineId,
				lines: e,
				actor: this.actor,
				context: this.context
			});
			if (i) {
				if (i.pending) {
					this.clearDispenseTimers(), this.pendingRequestId = i.requestId, this.pendingDispense = {
						itemCount: t,
						image: r
					}, this.lastDispense = {
						state: "authorizing",
						message: "AWAITING GM AUTHORIZATION"
					}, this.render(!1);
					let e = i.requestId;
					this.scheduleDispense(() => {
						this.pendingRequestId === e && this.showDispenseFailure("AUTHORIZATION TIMED OUT");
					}, 15e3);
				} else this.cart.clear(), this.beginDispenseSequence(i.result?.cart?.itemCount ?? t, i.result?.reservation?.image || r, i.result?.reservation?.requestId || i.requestId);
			} else this.showDispenseFailure("AUTHORIZATION FAILED: CART PRESERVED");
		});
	}
	static refreshMachine(e) {
		for (let t of V) t.machineId === e && t.render(!1);
	}
	static refreshMachines(e) {
		let t = new Set(e.map(String));
		for (let e of V) t.has(String(e.machineId)) && e.render(!1);
	}
	static refreshAll() {
		for (let e of V) e.render(!1);
	}
	static handlePurchaseResult(e) {
		for (let t of V) t.handlePurchaseResult(e);
	}
	static handleCollectionResult(e) {
		for (let t of V) t.handleCollectionResult(e);
	}
}, rt = O(), it = pe();
function at(e) {
	let t = {
		machine: {},
		entries: {}
	};
	for (let [n, r] of new FormData(e).entries()) {
		let e = String(n), i = String(r ?? "");
		if (e.startsWith("machine.")) {
			let n = e.slice(8), r = t.machine[n];
			t.machine[n] = r === void 0 ? i : Array.isArray(r) ? [...r, i] : [r, i];
			continue;
		}
		let a = e.match(/^entries\.([^.]+)\.([^.]+)$/);
		if (!a) continue;
		let [, o, s] = a;
		t.entries[o] ??= {}, t.entries[o][s] = i;
	}
	return t;
}
function W(e, t = 0) {
	let n = Number(e);
	return Number.isFinite(n) ? n : t;
}
function ot(e, t) {
	let n = JSON.stringify(e, null, 2), r = globalThis.saveDataToFile;
	if (typeof r == "function") {
		r(n, "application/json", t);
		return;
	}
	let i = URL.createObjectURL(new Blob([n], { type: "application/json" })), a = document.createElement("a");
	a.href = i, a.download = t, a.click(), URL.revokeObjectURL(i);
}
async function st() {
	return new Promise((e, t) => {
		let n = document.createElement("input");
		n.type = "file", n.accept = ".json,application/json", n.addEventListener("change", async () => {
			try {
				let t = n.files?.[0];
				if (!t) return e(null);
				e(JSON.parse(await t.text()));
			} catch (e) {
				t(e);
			}
		}, { once: !0 }), n.click();
	});
}
function ct(e = []) {
	let t = new Set(e);
	return Array.from(canvas?.scene?.regions?.contents ?? canvas?.scene?.regions ?? []).map((e) => ({
		id: String(e.id ?? ""),
		name: String(e.name || e.id || "Unnamed Region"),
		selected: t.has(String(e.id ?? ""))
	})).filter((e) => e.id);
}
async function lt(e) {
	let t = e.dataTransfer?.getData("text/plain");
	if (!t) return null;
	let n = JSON.parse(t), r = await Item.fromDropData(n);
	if (!r) return null;
	let i = r.toObject();
	return D.createEntry({
		itemUuid: r.uuid ?? n.uuid ?? "",
		embeddedData: i,
		displayName: r.name,
		image: r.img,
		description: i.system?.description?.value || "",
		price: 0,
		stock: 1,
		maxStock: 1
	});
}
var ut = class extends it {
	machineChangeHook;
	constructor(t = {}) {
		super(t), this.machineChangeHook = Hooks.on(`${e}.machinesChanged`, () => this.render(!1));
	}
	async close(t = {}) {
		return this.machineChangeHook !== void 0 && Hooks.off(`${e}.machinesChanged`, this.machineChangeHook), super.close(t);
	}
	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			id: "holosuite-vending-manager",
			classes: ["holosuite-vending-window", "holosuite-vending-manager-app"],
			template: o.manager,
			width: 880,
			height: 720,
			resizable: !0,
			title: "HoloSuite Vending Machines"
		});
	}
	async getData() {
		let e = D.getLedger().entries.slice(-25).reverse().map((e) => ({
			...e,
			totalPriceDisplay: u(e.totalPrice),
			timeLabel: new Date(e.timestamp).toLocaleString(),
			failed: e.status === "failed"
		}));
		return {
			machines: D.getMachines().map((e) => {
				let t = D.getMachineState(e);
				return {
					...e,
					state: t,
					stateLabel: t === "sold-out" ? "Sold Out" : t === "offline" ? "Offline" : "Online",
					online: e.status !== "offline",
					toggleLabel: e.status === "offline" ? "Bring Online" : "Take Offline",
					styleLabel: r.find((t) => t.id === e.styleId)?.label ?? "Alien Market",
					regionCount: e.regionIds.length,
					totalStock: e.inventory.reduce((e, t) => e + t.stock, 0),
					totalCapacity: e.inventory.reduce((e, t) => e + t.maxStock, 0)
				};
			}),
			currencyName: D.getCurrencyName(),
			currencySourceLabel: D.getCurrencySourceLabel(),
			creditTransformer: D.getCreditTransformer(),
			ledger: e,
			hasLedger: e.length > 0
		};
	}
	activateListeners(t) {
		super.activateListeners(t), t.find("[name='creditTransformer']").on("change", async (e) => {
			await D.setCreditTransformer(e.currentTarget.checked), this.render(!1);
		}), t.find("[data-action='open-machine']").on("click", (e) => {
			let t = e.currentTarget.dataset.machineId, n = canvas?.tokens?.controlled?.[0] ?? null, r = n?.actor ?? game.user?.character ?? null;
			if (!r) {
				ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.SelectTestActor"));
				return;
			}
			new U(t, {
				actor: r,
				context: {
					source: "gm-test",
					sceneId: canvas?.scene?.id ?? "",
					tokenId: n?.document?.id ?? n?.id ?? ""
				}
			}).render(!0);
		}), t.find("[data-action='create-machine']").on("click", () => {
			let e = D.createMachine();
			new G(e.id, {
				draft: e,
				isNew: !0
			}).render(!0);
		}), t.find("[data-action='duplicate-machine']").on("click", async (e) => {
			let t = D.getMachine(e.currentTarget.dataset.machineId);
			if (!t) return;
			let n = foundry.utils.deepClone(t);
			delete n.id, n.name = `${t.name} Copy`, new G((await D.upsertMachine(D.createMachine(n))).id).render(!0);
		}), t.find("[data-action='toggle-machine']").on("click", async (e) => {
			let t = D.getMachine(e.currentTarget.dataset.machineId);
			t && await D.upsertMachine({
				...t,
				status: t.status === "offline" ? "online" : "offline"
			});
		}), t.find("[data-action='restock-machine']").on("click", async (e) => {
			await D.restockMachine(e.currentTarget.dataset.machineId), ui.notifications.info(game.i18n.localize("HOLOSUITEVENDING.Notifications.Restocked"));
		}), t.find("[data-action='restock-all']").on("click", async () => {
			await Dialog.confirm({
				title: game.i18n.localize("HOLOSUITEVENDING.Manager.RestockAllTitle"),
				content: `<p>${game.i18n.localize("HOLOSUITEVENDING.Manager.RestockAllConfirm")}</p>`
			}) && (await D.restockAll(), ui.notifications.info(game.i18n.localize("HOLOSUITEVENDING.Notifications.RestockedAll")));
		}), t.find("[data-action='export-machines']").on("click", () => {
			ot(D.exportData(), "holosuite-vending-machines.json");
		}), t.find("[data-action='import-machines']").on("click", async () => {
			try {
				let e = await st();
				if (!e) return;
				let t = await D.importData(e);
				ui.notifications.info(game.i18n.format("HOLOSUITEVENDING.Notifications.Imported", { count: t }));
			} catch (t) {
				console.error(`${e} | Import failed`, t), ui.notifications.error(t?.message || game.i18n.localize("HOLOSUITEVENDING.Notifications.ImportFailed"));
			}
		}), t.find("[data-action='export-ledger']").on("click", () => {
			ot(D.getLedger(), "holosuite-vending-ledger.json");
		}), t.find("[data-action='clear-ledger']").on("click", async () => {
			await Dialog.confirm({
				title: game.i18n.localize("HOLOSUITEVENDING.Ledger.Clear"),
				content: `<p>${game.i18n.localize("HOLOSUITEVENDING.Ledger.ClearConfirm")}</p>`
			}) && (await D.clearLedger(), this.render(!1));
		}), t.find("[data-action='edit-machine']").on("click", (e) => {
			new G(e.currentTarget.dataset.machineId).render(!0);
		}), t.find("[data-action='delete-machine']").on("click", async (e) => {
			let t = e.currentTarget.dataset.machineId;
			await Dialog.confirm({
				title: "Delete Vending Machine",
				content: "<p>Delete this vending machine? Linked Regions will no longer open it.</p>"
			}) && await D.deleteMachine(t);
		});
	}
}, G = class extends rt {
	machineId;
	draft;
	isDirty;
	pendingScrollEntryId;
	pendingEditorScroll;
	constructor(e, t = {}) {
		super({
			...t,
			id: `holosuite-vending-editor-${e}`
		}), this.machineId = e, this.draft = foundry.utils.deepClone(t.draft ?? D.getMachine(e) ?? D.createMachine({ id: e })), this.isDirty = t.isNew === !0, this.pendingScrollEntryId = null, this.pendingEditorScroll = null;
	}
	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			id: "holosuite-vending-editor",
			classes: ["holosuite-vending-window", "holosuite-vending-editor-app"],
			template: o.editor,
			width: 940,
			height: 760,
			resizable: !0,
			title: "Edit Vending Machine"
		});
	}
	get title() {
		return this.draft?.name ?? "Edit Vending Machine";
	}
	async close(e = {}) {
		return this.isDirty && e.force !== !0 && !await Dialog.confirm({
			title: game.i18n.localize("HOLOSUITEVENDING.Editor.UnsavedTitle"),
			content: `<p>${game.i18n.localize("HOLOSUITEVENDING.Editor.UnsavedConfirm")}</p>`
		}) ? this : super.close(e);
	}
	async getData() {
		let e = this.draft, t = ct(e?.regionIds ?? []);
		return {
			machine: e,
			entries: e.inventory.map((t, n) => ({
				...t,
				slotCode: `${String.fromCharCode(65 + Math.floor(n / 3))}${String(n % 3 + 1).padStart(2, "0")}`,
				isFirst: n === 0,
				isLast: n === e.inventory.length - 1
			})),
			inventoryCount: e?.inventory.length ?? 0,
			inventoryFull: (e?.inventory.length ?? 0) >= 6,
			archivedProductCount: e?.overflowInventory?.length ?? 0,
			hasArchivedProducts: (e?.overflowInventory?.length ?? 0) > 0,
			maxProducts: 6,
			isDirty: this.isDirty,
			styleOptions: r.map((t) => ({
				...t,
				selected: e?.styleId === t.id
			})),
			machineOffline: e?.status === "offline",
			regionOptions: t,
			hasSceneRegions: t.length > 0,
			sceneName: canvas?.scene?.name ?? "Current Scene",
			currencyName: D.getCurrencyName()
		};
	}
	markDirty(e) {
		this.isDirty = !0, e?.find?.("[data-save-state]")?.text?.(game.i18n.localize("HOLOSUITEVENDING.Editor.DraftChanges"));
	}
	renderAtEntry(e) {
		this.pendingScrollEntryId = e, this.render(!1);
	}
	renderPreservingScroll(e) {
		let t = e?.closest?.("form"), n = t?.closest?.(".window-content") ?? e?.closest?.(".window-content");
		this.pendingEditorScroll = {
			form: Number(t?.scrollTop) || 0,
			windowContent: Number(n?.scrollTop) || 0
		}, this.render(!1);
	}
	restorePendingEditorScroll(e) {
		let t = this.pendingEditorScroll;
		if (!t) return;
		let n = e?.[0] ?? e;
		n?.querySelector && (typeof globalThis.requestAnimationFrame == "function" ? globalThis.requestAnimationFrame.bind(globalThis) : (e) => globalThis.setTimeout(e, 0))(() => {
			let e = n.matches?.("form") ? n : n.querySelector("form"), r = n.matches?.(".window-content") ? n : n.closest?.(".window-content") ?? e?.closest?.(".window-content");
			e && (e.scrollTop = t.form), r && (r.scrollTop = t.windowContent), this.pendingEditorScroll = null;
		});
	}
	restorePendingEntryScroll(e) {
		let t = this.pendingScrollEntryId;
		if (!t) return;
		let n = e?.[0] ?? e;
		n?.querySelectorAll && (typeof globalThis.requestAnimationFrame == "function" ? globalThis.requestAnimationFrame.bind(globalThis) : (e) => globalThis.setTimeout(e, 0))(() => {
			let e = Array.from(n.querySelectorAll(".holosuite-vending-entry-editor")).find((e) => e.dataset?.entryId === t);
			if (!e) return;
			let r = e.closest("form"), i = n.matches?.(".window-content") ? n : n.closest?.(".window-content") ?? r?.closest?.(".window-content");
			for (let e of /* @__PURE__ */ new Set([r, i])) !e || e.scrollHeight <= e.clientHeight || (e.scrollTop = e.scrollHeight);
			e.scrollIntoView?.({
				block: "end",
				inline: "nearest",
				behavior: "auto"
			}), this.pendingScrollEntryId = null;
		});
	}
	syncDraftFromForm(e) {
		if (!e) return this.draft;
		let t = at(e), n = this.draft, r = new Set(ct().map((e) => e.id)), i = t.machine?.regionIds, a = (Array.isArray(i) ? i : [i]).map((e) => String(e ?? "")).filter(Boolean), o = [...(n.regionIds ?? []).filter((e) => !r.has(e)), ...a];
		return this.draft = {
			...n,
			name: t.machine?.name || n.name,
			manufacturerName: t.machine?.manufacturerName || n.manufacturerName,
			styleId: t.machine?.styleId || n.styleId,
			description: t.machine?.description || "",
			image: t.machine?.image || "",
			status: t.machine?.status === "offline" ? "offline" : "online",
			regionIds: o,
			access: { requireProximity: !!e.querySelector("[name='machine.requireProximity']")?.checked },
			inventory: n.inventory.map((e) => {
				let n = t.entries?.[e.id] ?? {};
				return {
					...e,
					displayName: n.displayName || e.displayName,
					image: n.image || e.image,
					itemUuid: n.itemUuid || e.itemUuid,
					price: W(n.price, e.price),
					stock: W(n.stock, e.stock),
					maxStock: W(n.maxStock, e.maxStock),
					description: n.description ?? e.description
				};
			})
		}, this.draft.id = this.machineId, this.draft;
	}
	activateListeners(t) {
		super.activateListeners(t), t.find("form").on("submit", async (e) => {
			e.preventDefault(), e.stopPropagation();
		}), t.find("input, textarea, select").on("input change", () => this.markDirty(t)), t.find("[name='machine.styleId']").on("change", (e) => {
			let n = e.currentTarget.selectedOptions?.[0];
			t.find("[data-style-preview]").attr("data-machine-style", e.currentTarget.value), t.find("[data-style-description]").text(n?.dataset?.description || "");
		}), t.find("[name='machine.name']").on("input", (e) => t.find("[data-preview-name]").text(e.currentTarget.value || "Vending Machine")), t.find("[name='machine.manufacturerName']").on("input", (e) => t.find("[data-preview-manufacturer]").text(e.currentTarget.value || "HoloSuite")), t.find("[data-action='save-machine'], [data-action='save-and-test']").on("click", async (n) => {
			n.preventDefault(), n.stopPropagation();
			let r = n.currentTarget.closest("form");
			if (r) try {
				if (await this.save(r), ui.notifications.info(game.i18n.localize("HOLOSUITEVENDING.Editor.Saved")), t.find("[data-save-state]").text(game.i18n.localize("HOLOSUITEVENDING.Editor.AllChangesSaved")), n.currentTarget.dataset.action === "save-and-test") {
					let e = canvas?.tokens?.controlled?.[0] ?? null, t = e?.actor ?? game.user?.character ?? null;
					if (!t) {
						ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.SelectTestActor"));
						return;
					}
					new U(this.machineId, {
						actor: t,
						context: {
							source: "gm-test",
							sceneId: canvas?.scene?.id ?? "",
							tokenId: e?.document?.id ?? e?.id ?? ""
						}
					}).render(!0);
				}
			} catch (t) {
				console.error(`${e} | Failed to save vending machine`, t), ui.notifications.error("Could not save vending machine. Check the console for details.");
			}
		}), t.find("[data-action='cancel-edit']").on("click", () => this.close()), t.find("[data-action='browse-machine-image']").on("click", (e) => {
			e.preventDefault();
			let t = e.currentTarget.dataset.target || "machine.image", n = e.currentTarget.closest(".holosuite-vending-path-row")?.querySelector(`[name='${t}']`);
			if (!n || typeof FilePicker > "u") {
				ui.notifications.warn("Foundry FilePicker is not available.");
				return;
			}
			new FilePicker({
				type: "image",
				current: n.value,
				callback: (e) => {
					n.value = e, n.dispatchEvent(new Event("input", { bubbles: !0 }));
				}
			}).browse();
		}), t.find("[data-action='add-entry']").on("click", (e) => {
			if (this.syncDraftFromForm(e.currentTarget.closest("form")), this.draft.inventory.length >= 6) {
				ui.notifications.warn(game.i18n.format("HOLOSUITEVENDING.Notifications.ProductLimit", { max: 6 }));
				return;
			}
			let t = D.createEntry();
			this.draft.inventory.push(t), this.isDirty = !0, this.renderAtEntry(t.id);
		}), t.find("[data-action='restore-archived']").on("click", (e) => {
			if (this.syncDraftFromForm(e.currentTarget.closest("form")), this.draft.inventory.length >= 6 || !this.draft.overflowInventory?.length) return;
			let t = this.draft.overflowInventory.shift();
			this.draft.inventory.push(t), this.isDirty = !0, this.renderAtEntry(t.id);
		}), t.find("[data-action='discard-archived']").on("click", async (e) => {
			await Dialog.confirm({
				title: game.i18n.localize("HOLOSUITEVENDING.Editor.DiscardArchivedTitle"),
				content: `<p>${game.i18n.localize("HOLOSUITEVENDING.Editor.DiscardArchivedConfirm")}</p>`
			}) && (this.syncDraftFromForm(e.currentTarget.closest("form")), this.draft.overflowInventory = [], this.isDirty = !0, this.render(!1));
		}), t.find("[data-action='remove-entry']").on("click", async (e) => {
			await Dialog.confirm({
				title: game.i18n.localize("HOLOSUITEVENDING.Editor.RemoveProductTitle"),
				content: `<p>${game.i18n.localize("HOLOSUITEVENDING.Editor.RemoveProductConfirm")}</p>`
			}) && (this.syncDraftFromForm(e.currentTarget.closest("form")), this.draft.inventory = this.draft.inventory.filter((t) => t.id !== e.currentTarget.dataset.entryId), this.isDirty = !0, this.render(!1));
		}), t.find("[data-action='move-entry-up'], [data-action='move-entry-down']").on("click", (e) => {
			this.syncDraftFromForm(e.currentTarget.closest("form"));
			let t = this.draft.inventory.findIndex((t) => t.id === e.currentTarget.dataset.entryId), n = t + (e.currentTarget.dataset.action === "move-entry-up" ? -1 : 1);
			t < 0 || n < 0 || n >= this.draft.inventory.length || ([this.draft.inventory[t], this.draft.inventory[n]] = [this.draft.inventory[n], this.draft.inventory[t]], this.isDirty = !0, this.renderPreservingScroll(e.currentTarget));
		}), t.find(".holosuite-vending-entry-editor").on("dragstart", (e) => {
			let t = e.originalEvent;
			if (!t.target?.closest?.(".hsv-drag-handle")) {
				e.preventDefault();
				return;
			}
			t.dataTransfer.effectAllowed = "move", t.dataTransfer.setData("application/x-holosuite-vending-entry", e.currentTarget.dataset.entryId);
		}), t.find(".holosuite-vending-entry-editor").on("dragover", (e) => {
			Array.from(e.originalEvent.dataTransfer?.types ?? []).includes("application/x-holosuite-vending-entry") && e.preventDefault();
		}), t.find(".holosuite-vending-entry-editor").on("drop", (e) => {
			let t = e.originalEvent.dataTransfer?.getData("application/x-holosuite-vending-entry");
			if (!t) return;
			e.preventDefault(), e.stopPropagation(), this.syncDraftFromForm(e.currentTarget.closest("form"));
			let n = this.draft.inventory.findIndex((e) => e.id === t), r = this.draft.inventory.findIndex((t) => t.id === e.currentTarget.dataset.entryId);
			if (n < 0 || r < 0 || n === r) return;
			let [i] = this.draft.inventory.splice(n, 1);
			this.draft.inventory.splice(r, 0, i), this.isDirty = !0, this.renderPreservingScroll(e.currentTarget);
		}), t.find(".holosuite-vending-drop-zone").on("dragover", (e) => e.preventDefault()), t.find(".holosuite-vending-drop-zone").on("drop", async (t) => {
			t.preventDefault();
			try {
				if (t.originalEvent.dataTransfer?.getData("application/x-holosuite-vending-entry")) return;
				if (this.syncDraftFromForm(t.currentTarget.closest("form")), this.draft.inventory.length >= 6) {
					ui.notifications.warn(game.i18n.format("HOLOSUITEVENDING.Notifications.ProductLimit", { max: 6 }));
					return;
				}
				let e = await lt(t.originalEvent);
				if (!e) return;
				this.draft.inventory.push(e), this.isDirty = !0, this.renderAtEntry(e.id);
			} catch (t) {
				console.warn(`${e} | Item drop failed`, t), ui.notifications.warn("Could not add that item to the vending machine.");
			}
		}), this.restorePendingEditorScroll(t), this.restorePendingEntryScroll(t);
	}
	async save(e) {
		this.syncDraftFromForm(e), this.draft = foundry.utils.deepClone(await D.upsertMachine(this.draft)), this.isDirty = !1;
	}
}, K = "executeScript", dt = /* @__PURE__ */ new Set(["holosuiteVending", `${e}.openMachine`]), q = null, J = null, Y = !1;
function ft() {
	return Array.from(canvas?.scene?.regions?.contents ?? canvas?.scene?.regions ?? []);
}
function pt(e, t) {
	return Array.from(e?.behaviors ?? []).find((e) => e?.type === K && String(e?.flags?.["holosuite-vending-machines"]?.machineId ?? "") === t) ?? null;
}
function mt(e) {
	return Array.from(e?.behaviors ?? []).filter((e) => e?.flags?.["holosuite-vending-machines"]?.machineId || dt.has(e?.type));
}
function X(e) {
	return `HoloSuite Vending Machines: ${e.name}`;
}
function ht(e) {
	return [
		"const userId = event.user?.id;",
		"if (!userId) return;",
		`game.socket.emit("${t}", {`,
		"  action: \"openVendingFromRegion\",",
		`  machineId: ${JSON.stringify(e)},`,
		"  userId,",
		"  sceneId: scene?.id,",
		"  regionId: region?.id,",
		"  behaviorId: behavior?.id,",
		"  tokenId: event.data?.token?.id",
		"});",
		"if (game.user?.id === userId && !game.user?.isGM) {",
		`  await game.holosuiteVending?.promptMachineAccess?.(${JSON.stringify(e)}, {`,
		"    actor: event.data?.token?.actor,",
		"    context: { source: \"region-behavior\", sceneId: scene?.id, regionId: region?.id, behaviorId: behavior?.id, tokenId: event.data?.token?.id }",
		"  });",
		"}"
	].join("\n");
}
function gt(e) {
	let t = game.scenes?.get?.(e.sceneId) ?? canvas?.scene;
	return (t?.tokens?.get?.(e.tokenId) ?? Array.from(t?.tokens?.contents ?? t?.tokens ?? []).find((t) => t?.id === e.tokenId))?.actor ?? null;
}
function _t() {
	let e = game.users?.find?.((e) => e.active && e.isGM);
	return !!(e && e.id === game.user?.id);
}
function vt(e, t) {
	let n = Array.from(e?.system?.events ?? []).map(String);
	return e?.name !== t.name || e?.disabled !== !1 || n.length !== 1 || n[0] !== "tokenEnter" || e?.system?.source !== t["system.source"] || String(e?.flags?.["holosuite-vending-machines"]?.machineId ?? "") !== t["flags.holosuite-vending-machines.machineId"];
}
function Z(e = 75) {
	_t() && (q !== null && window.clearTimeout(q), q = window.setTimeout(() => {
		q = null, xt();
	}, e));
}
function yt() {
	game.socket?.on?.(t, async (e) => {
		e?.action === "openVendingFromRegion" && (e.userId !== game.user?.id || game.user?.isGM || await game.holosuiteVending?.promptMachineAccess?.(String(e.machineId || ""), {
			actor: gt(e),
			context: {
				source: "region-socket",
				sceneId: e.sceneId,
				regionId: e.regionId,
				behaviorId: e.behaviorId,
				tokenId: e.tokenId
			}
		}));
	});
}
async function bt() {
	let t = D.getMachines(), n = /* @__PURE__ */ new Map();
	for (let e of t) for (let t of e.regionIds) {
		let r = String(t), i = n.get(r) ?? [];
		i.push(e), n.set(r, i);
	}
	for (let t of ft()) {
		let r = String(t.id ?? ""), i = n.get(r) ?? [], a = new Set(i.map((e) => e.id)), o = mt(t).filter((e) => !a.has(String(e.flags?.["holosuite-vending-machines"]?.machineId ?? ""))).map((e) => e.id);
		o.length && await t.deleteEmbeddedDocuments("RegionBehavior", o);
		let s = [], c = [];
		for (let n of i) {
			let r = n.id, i = pt(t, r), a = {
				name: X(n),
				disabled: !1,
				"system.events": ["tokenEnter"],
				"system.source": ht(r),
				[`flags.${e}.machineId`]: r
			};
			i && vt(i, a) ? c.push({
				_id: i.id,
				...a
			}) : i || s.push({
				name: X(n),
				type: K,
				disabled: !1,
				system: {
					events: ["tokenEnter"],
					source: ht(r)
				},
				flags: { [e]: { machineId: r } }
			});
		}
		c.length && await t.updateEmbeddedDocuments("RegionBehavior", c), s.length && await t.createEmbeddedDocuments("RegionBehavior", s);
	}
}
async function xt() {
	if (!_t() || !canvas?.scene || !CONFIG.RegionBehavior?.dataModels?.[K]) return;
	if (J) return Y = !0, J;
	let e = (async () => {
		do
			Y = !1, await bt();
		while (Y);
	})();
	J = e;
	try {
		await e;
	} finally {
		J === e && (J = null);
	}
}
function St() {
	yt(), Z(250), Hooks.on("canvasReady", () => Z()), Hooks.on(`${e}.machinesChanged`, (e) => {
		e?.regionStructureChanged !== !1 && Z();
	}), Hooks.on("createRegion", () => Z()), Hooks.on("deleteRegion", () => Z());
}
//#endregion
//#region src/api.ts
function Ct(e) {
	if (foundry?.utils?.escapeHTML) return foundry.utils.escapeHTML(String(e ?? ""));
	let t = document.createElement("div");
	return t.textContent = String(e ?? ""), t.innerHTML;
}
async function wt(e, t = {}) {
	let n = D.getMachine(e);
	return n ? await Dialog.wait({
		title: game.i18n.localize("HOLOSUITEVENDING.Region.PromptTitle"),
		content: `
      <form class="holosuite-vending-region-prompt">
        <p class="holosuite-vending-kicker">${game.i18n.localize("HOLOSUITEVENDING.Region.Kicker")}</p>
        <h3>${game.i18n.localize("HOLOSUITEVENDING.Region.PromptQuestion")}</h3>
        <strong>${Ct(n.name)}</strong>
      </form>
    `,
		buttons: {
			yes: {
				icon: "<i class=\"fa-solid fa-store\"></i>",
				label: game.i18n.localize("HOLOSUITEVENDING.Common.Yes"),
				callback: () => !0
			},
			no: {
				icon: "<i class=\"fa-solid fa-xmark\"></i>",
				label: game.i18n.localize("HOLOSUITEVENDING.Common.No"),
				callback: () => !1
			}
		},
		default: "yes",
		close: () => !1
	}, {
		width: 430,
		classes: ["holosuite-vending-window", "holosuite-vending-region-dialog"]
	}) ? game.holosuiteVending.openMachine(e, t.actor ?? null, t.context ?? {}) : null : (ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoMachine")), null);
}
function Tt() {
	let t = {
		promptMachineAccess: wt,
		openManager() {
			if (!game.user.isGM) return ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.GMOnly")), null;
			let e = new ut();
			return e.render(!0), e;
		},
		openSceneMachines() {
			let e = new Ee();
			return e.render(!0), e;
		},
		openMachine(e, t = null, n = {}) {
			if (!D.getMachine(e)) return ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoMachine")), null;
			let r = B.checkAccess({
				machineId: e,
				actor: t,
				context: n
			});
			if (!r.allowed && !game.user.isGM) return ui.notifications.warn(r.reason), null;
			let i = new U(e, {
				actor: t,
				context: n
			});
			return i.render(!0), i;
		},
		getMachines() {
			return foundry.utils.deepClone(D.getMachines());
		},
		getLedger() {
			return foundry.utils.deepClone(D.getLedger());
		},
		restockMachine(e) {
			return game.user.isGM ? D.restockMachine(e) : !1;
		},
		exportMachines() {
			return foundry.utils.deepClone(D.exportData());
		},
		async syncRegionLinks() {
			return game.user.isGM ? (await xt(), !0) : !1;
		}
	};
	game.holosuiteVending = t;
	let n = game.modules.get(e);
	n && (n.api = t);
}
//#endregion
//#region src/main.ts
var Q = !1;
function Et() {
	let e = game.modules.get("holosuite-core");
	return (e?.active ? e.api : null) ?? game.holosuite ?? globalThis.HoloSuiteCoreApi ?? null;
}
function $() {
	if (Q) return !0;
	let t = Et();
	if (!t?.registerApp) return !1;
	let n = {
		id: e,
		title: "Vending Machines",
		icon: "fa-solid fa-store",
		premium: !1,
		playerVisible: !0,
		description: "Create, stock, and link HoloSuite vending machines to Regions.",
		open: () => game.user?.isGM ? game.holosuiteVending?.openManager?.() : game.holosuiteVending?.openSceneMachines?.()
	};
	return t.registerApp(n), Q = !0, !0;
}
function Dt() {
	if ($()) return;
	let e = 0, t = () => {
		e += 1, !($() || e >= 20) && window.setTimeout(t, 250);
	};
	Hooks.once("holosuite-core.apiReady", () => $()), window.setTimeout(t, 250);
}
Hooks.once("init", () => {
	D.registerSettings(), game.settings.registerMenu(e, "machineManager", {
		name: game.i18n.localize("HOLOSUITEVENDING.Settings.Manager.Name"),
		label: game.i18n.localize("HOLOSUITEVENDING.Settings.Manager.Label"),
		hint: "Create, configure, and link HoloSuite vending machines to scene Regions.",
		icon: "fas fa-store",
		type: ut,
		restricted: !0
	});
}), Hooks.once("ready", () => {
	Tt(), Dt(), B.registerSocket(), B.resumePendingDispenses(), St(), Hooks.on(`${e}.machinesChanged`, (e) => {
		let t = e?.changedMachineIds;
		Array.isArray(t) ? U.refreshMachines(t) : U.refreshAll();
	}), Hooks.on(`${e}.currencyChanged`, () => U.refreshAll()), Hooks.on(`${e}.purchaseResult`, (e) => U.handlePurchaseResult(e)), Hooks.on(`${e}.collectionResult`, (e) => U.handleCollectionResult(e)), Hooks.on("updateUser", () => B.resumePendingDispenses()), console.log(`${e} | Ready`);
});
//#endregion
