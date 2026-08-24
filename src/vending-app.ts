import { MODULE_ID, TEMPLATES } from "./constants.js";
import { MachineStore } from "./machine-store.js";
import { PurchaseService } from "./purchase-service.js";
import { getApplicationBase } from "./application-base.js";
import { chooseInitialEntryId, formatCurrencyAmount } from "./vending-domain.mjs";

const BaseApplication = getApplicationBase();
const openApps = new Set<VendingApp>();

function getDefaultActor(actor) {
  if (actor) return actor;
  if (canvas?.tokens?.controlled?.[0]?.actor) return canvas.tokens.controlled[0].actor;
  return game.user.character ?? null;
}

function normalizeDescription(value) {
  const container = document.createElement("div");
  container.innerHTML = String(value ?? "");
  return String(container.textContent ?? "").replace(/\s+/g, " ").trim();
}

function previewDescription(value, limit = 180) {
  const text = normalizeDescription(value);
  if (text.length <= limit) return text;
  const candidate = text.slice(0, Math.max(1, limit - 1));
  const wordBoundary = candidate.lastIndexOf(" ");
  const end = wordBoundary >= Math.floor(limit * 0.65) ? wordBoundary : candidate.length;
  return `${candidate.slice(0, end).trimEnd()}…`;
}

function escapeHtml(value) {
  const container = document.createElement("div");
  container.textContent = String(value ?? "");
  return container.innerHTML;
}

async function playLocalAudio(path, volume) {
  if (!path) return null;
  const audioHelper = (globalThis as any).AudioHelper ?? (globalThis as any).foundry?.audio?.AudioHelper;
  if (audioHelper?.play) {
    try {
      return await audioHelper.play({ src: path, volume, loop: false }, false);
    } catch (error) {
      console.warn(`${MODULE_ID} | AudioHelper playback failed`, error);
    }
  }

  try {
    const audio = new Audio(path);
    audio.volume = volume;
    await audio.play();
    return audio;
  } catch (error) {
    console.warn(`${MODULE_ID} | Browser audio playback failed`, error);
    return null;
  }
}

function stopAudio(handle) {
  try {
    if (typeof handle?.stop === "function") handle.stop();
    else if (typeof handle?.pause === "function") handle.pause();
  } catch (error) {
    console.warn(`${MODULE_ID} | Could not stop vending audio`, error);
  }
}

export class VendingApp extends BaseApplication {
  machineId: string;
  actor: any;
  selectedEntryId: string | null;
  context: any;
  cart: Map<string, number>;
  lastDispense: { state: string; message: string; image?: string } | null;
  pendingRequestId: string | null;
  pendingDispense: { itemCount: number; image: string } | null;
  activeReservationId: string | null;
  checkoutPending: boolean;
  pendingFocusSelector: string;
  dispenseTimers: Set<number>;
  audioHandles: Map<string, any>;
  viewportResizeHandler: () => void;

  constructor(machineId: string, options: any = {}) {
    super({ ...options, id: `holosuite-vending-machine-${machineId}` });
    this.machineId = machineId;
    this.actor = getDefaultActor(options.actor);
    this.selectedEntryId = options.selectedEntryId ?? null;
    this.context = options.context ?? {};
    this.cart = new Map();
    this.lastDispense = null;
    this.pendingRequestId = null;
    this.pendingDispense = null;
    this.activeReservationId = null;
    this.checkoutPending = false;
    this.pendingFocusSelector = "";
    this.dispenseTimers = new Set();
    this.audioHandles = new Map();
    this.viewportResizeHandler = () => this.applyViewportScale();
    window.addEventListener("resize", this.viewportResizeHandler);
    openApps.add(this);
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "holosuite-vending-machine",
      classes: ["holosuite-vending-window", "holosuite-vending-app"],
      template: TEMPLATES.vending,
      width: 1050,
      height: "auto",
      resizable: false,
      minimizable: false,
      title: "HoloSuite Vending Machine"
    });
  }

  get title() {
    return MachineStore.getMachine(this.machineId)?.name ?? "HoloSuite Vending Machine";
  }

  async close(options: any = {}) {
    this.clearDispenseTimers();
    for (const handle of this.audioHandles.values()) stopAudio(handle);
    this.audioHandles.clear();
    window.removeEventListener("resize", this.viewportResizeHandler);
    openApps.delete(this);
    return super.close(options);
  }

  get machine() {
    return MachineStore.getMachine(this.machineId);
  }

  playAudio(cue) {
    const config = MachineStore.getAudioConfig();
    const path = config[cue];
    if (!config.enabled || !path || config.volume <= 0) return;
    stopAudio(this.audioHandles.get(cue));
    playLocalAudio(path, config.volume).then((handle) => {
      if (handle) this.audioHandles.set(cue, handle);
    });
  }

  async openProductDetails(entryId) {
    const entry = this.machine?.inventory?.find((candidate) => candidate.id === entryId);
    if (!entry) return;

    if (entry.itemUuid) {
      try {
        const item = await fromUuid(entry.itemUuid);
        if (item?.sheet?.render) {
          item.sheet.render(true);
          return;
        }
      } catch (error) {
        console.warn(`${MODULE_ID} | Could not open source item ${entry.itemUuid}`, error);
      }
    }

    const description = normalizeDescription(entry.description);
    new Dialog({
      title: entry.displayName || "Product Details",
      content: `<div class="hsv-product-dialog"><p>${escapeHtml(description || "No product description supplied.")}</p></div>`,
      buttons: { close: { label: "Close" } },
      default: "close"
    }).render(true);
  }

  clearDispenseTimers() {
    for (const timer of this.dispenseTimers) window.clearTimeout(timer);
    this.dispenseTimers.clear();
  }

  scheduleDispense(callback, delay) {
    const timer = window.setTimeout(() => {
      this.dispenseTimers.delete(timer);
      callback();
    }, delay);
    this.dispenseTimers.add(timer);
  }

  beginDispenseSequence(itemCount, image = "", reservationId = "") {
    this.clearDispenseTimers();
    this.pendingRequestId = null;
    this.pendingDispense = null;
    this.activeReservationId = reservationId;
    this.checkoutPending = false;
    this.lastDispense = { state: "dispensing", message: "PLEASE STAND CLEAR", image };
    this.playAudio("dispense");
    this.render(false);
    this.scheduleDispense(() => {
      this.lastDispense = {
        state: "ready",
        message: `${itemCount} ITEM${itemCount === 1 ? "" : "S"}: CLICK TO RETRIEVE`,
        image
      };
      this.render(false);
    }, 850);
  }

  async finishRetrieval(automatic = false) {
    if (this.lastDispense?.state !== "ready" || !this.activeReservationId) return;
    const image = this.lastDispense.image ?? "";
    this.lastDispense = { state: "collecting", message: automatic ? "AUTOMATIC TRANSFER" : "SECURING ITEM", image };
    this.render(false);
    const result = await PurchaseService.requestCollection({ requestId: this.activeReservationId, automatic });
    if (!result) {
      this.lastDispense = { state: "ready", message: "CLICK TO RETRY COLLECTION", image };
      this.render(false);
      return;
    }
    if (!result.pending) this.showCollectionComplete(result.result?.automatic === true, image);
  }

  showCollectionComplete(automatic = false, image = "") {
    this.clearDispenseTimers();
    this.playAudio("collect");
    this.activeReservationId = null;
    this.lastDispense = {
      state: automatic ? "automatic" : "collected",
      message: game.i18n.localize(automatic
        ? "HOLOSUITEVENDING.Retrieval.Automatic"
        : "HOLOSUITEVENDING.Retrieval.Collected"),
      image
    };
    this.render(false);
    this.scheduleDispense(() => {
      this.lastDispense = null;
      this.render(false);
    }, 2400);
  }

  showDispenseFailure(message = "AUTHORIZATION FAILED") {
    this.clearDispenseTimers();
    this.pendingRequestId = null;
    this.pendingDispense = null;
    this.checkoutPending = false;
    this.playAudio("failure");
    this.lastDispense = { state: "failure", message };
    this.render(false);
    this.scheduleDispense(() => {
      this.lastDispense = null;
      this.render(false);
    }, 3500);
  }

  handlePurchaseResult(payload) {
    if (payload.machineId !== this.machineId || payload.requestId !== this.pendingRequestId) return;
    const pending = this.pendingDispense ?? { itemCount: Number(payload.itemCount) || 1, image: "" };
    if (payload.status === "success") {
      this.cart.clear();
      this.beginDispenseSequence(
        Number(payload.itemCount) || pending.itemCount,
        payload.image || pending.image,
        payload.reservationId || payload.requestId
      );
      return;
    }

    this.showDispenseFailure(payload.message || "AUTHORIZATION FAILED");
  }

  handleCollectionResult(payload) {
    if (payload.requestId !== this.activeReservationId) return;
    const image = this.lastDispense?.image ?? "";
    if (payload.status === "success") {
      this.showCollectionComplete(payload.automatic === true, image);
      return;
    }
    this.lastDispense = { state: "ready", message: payload.message || "CLICK TO RETRY COLLECTION", image };
    this.render(false);
  }

  pruneCart(entries) {
    const byId = new Map(entries.map((entry) => [entry.id, entry]));
    for (const [entryId, quantity] of this.cart) {
      const entry: any = byId.get(entryId);
      if (!entry || entry.stock <= 0) this.cart.delete(entryId);
      else this.cart.set(entryId, Math.min(quantity, entry.stock));
    }
  }

  renderWithFocus(selector = "") {
    this.pendingFocusSelector = selector;
    this.render(false);
  }

  applyViewportScale() {
    const applicationElement = (this as any).element?.[0] ?? (this as any).element;
    const root = applicationElement?.querySelector?.(".hsv-machine");
    const chassis = root?.querySelector?.(".hsv-machine-chassis");
    if (!root || !chassis) return;
    root.style.zoom = "1";
    const bounds = chassis.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const availableWidth = Math.max(320, window.innerWidth - 28);
    const availableHeight = Math.max(320, window.innerHeight - 28);
    const scale = Math.max(0.56, Math.min(1, availableWidth / bounds.width, availableHeight / bounds.height));
    root.style.zoom = String(Math.floor(scale * 100) / 100);
    root.dataset.viewportScale = String(Math.round(scale * 100));
  }

  async getData() {
    const machine = this.machine;
    const entries = machine?.inventory ?? [];
    this.pruneCart(entries);
    const currencyProfile = PurchaseService.getCurrencyProfile(this.actor);
    const currencyBalance = currencyProfile.balance;
    if (!this.selectedEntryId && entries.length) {
      this.selectedEntryId = chooseInitialEntryId(entries, currencyBalance);
    }
    const selectedEntry = entries.find((entry) => entry.id === this.selectedEntryId) ?? entries[0] ?? null;
    this.selectedEntryId = selectedEntry?.id ?? null;
    const cartLines = entries
      .filter((entry) => this.cart.has(entry.id))
      .map((entry) => {
        const quantity = this.cart.get(entry.id) ?? 0;
        const lineTotal = entry.price * quantity;
        return { ...entry, quantity, lineTotal, lineTotalDisplay: formatCurrencyAmount(lineTotal) };
      });
    const cartCount = cartLines.reduce((total, line) => total + line.quantity, 0);
    const cartTotal = cartLines.reduce((total, line) => total + line.lineTotal, 0);
    const access = PurchaseService.checkAccess({ machineId: this.machineId, actor: this.actor, context: this.context });
    const machineState = MachineStore.getMachineState(machine);
    const viewEntries = entries.map((entry, index) => {
      const stockRatio = entry.maxStock > 0 ? entry.stock / entry.maxStock : 0;
      const activeSegments = entry.stock > 0 ? Math.max(1, Math.ceil(stockRatio * 10)) : 0;
      const lowStock = entry.stock > 0 && entry.stock <= Math.max(1, Math.ceil(entry.maxStock * 0.25));
      const normalizedDescription = normalizeDescription(entry.description);
      return {
        ...entry,
        slotCode: `${String.fromCharCode(65 + Math.floor(index / 3))}${String((index % 3) + 1).padStart(2, "0")}`,
        selected: selectedEntry?.id === entry.id,
        soldOut: entry.stock <= 0,
        lowStock,
        affordable: entry.price <= currencyBalance,
        priceDisplay: formatCurrencyAmount(entry.price),
        cartQuantity: this.cart.get(entry.id) ?? 0,
        descriptionPreview: previewDescription(entry.description) || "No product profile supplied.",
        descriptionCanOpen: Boolean(entry.itemUuid || normalizedDescription),
        stockSegments: Array.from({ length: 10 }, (_, segment) => ({ active: segment < activeSegments }))
      };
    });
    const slotCount = Math.max(6, Math.ceil(viewEntries.length / 3) * 3);
    const inactiveSlotVariants = [
      { label: game.i18n.localize("HOLOSUITEVENDING.Player.EmptySlot"), detail: game.i18n.localize("HOLOSUITEVENDING.Player.Unassigned"), icon: "fa-box-open" },
      { label: game.i18n.localize("HOLOSUITEVENDING.Player.Unassigned"), detail: game.i18n.localize("HOLOSUITEVENDING.Player.NoProductData"), icon: "fa-plug" },
      { label: game.i18n.localize("HOLOSUITEVENDING.Player.OfflineSlot"), detail: game.i18n.localize("HOLOSUITEVENDING.Player.ServiceRequired"), icon: "fa-power-off" },
      { label: game.i18n.localize("HOLOSUITEVENDING.Player.Maintenance"), detail: game.i18n.localize("HOLOSUITEVENDING.Player.KeepClear"), icon: "fa-wrench" }
    ];
    const displaySlots = Array.from({ length: slotCount }, (_, index) => {
      if (viewEntries[index]) return viewEntries[index];
      const variant = inactiveSlotVariants[index % inactiveSlotVariants.length];
      return {
        empty: true,
        slotCode: `${String.fromCharCode(65 + Math.floor(index / 3))}${String((index % 3) + 1).padStart(2, "0")}`,
        emptyLabel: variant.label,
        emptyDetail: variant.detail,
        emptyIcon: variant.icon,
        emptyVariant: index % inactiveSlotVariants.length
      };
    });
    const selected = viewEntries.find((entry) => entry.id === selectedEntry?.id) ?? null;
    const insufficientBalance = cartTotal > currencyBalance;
    const normalizedMachineId = String(machine?.id ?? this.machineId).replace(/[^a-z0-9]/gi, "").toUpperCase();
    const retrieval = this.lastDispense ?? {
      state: "standby",
      message: machineState === "offline" ? "OUTPUT BAY LOCKED" : "AWAITING PURCHASE"
    };
    const retrievalLabels = {
      standby: machineState === "offline" ? "LOCKED" : "READY",
      authorizing: "AUTHORIZING",
      dispensing: "DISPENSING",
      ready: "COLLECT ITEM",
      collecting: "TRANSFERRING",
      collected: "ITEM COLLECTED",
      automatic: "AUTO DISPENSED",
      failure: "TRANSACTION FAILED"
    };

    const machineStyleId = machine?.styleId ?? "industrial";
    const machineStyleBaseId = machineStyleId === "corporate-kiosk-white"
      ? "corporate-kiosk"
      : machineStyleId === "neon"
        ? "industrial"
        : machineStyleId;

    return {
      machine,
      manufacturerName: machine?.manufacturerName ?? "HoloSuite",
      machineStyleId,
      machineStyleBaseId,
      machineDisplayImage: MachineStore.getMachineDisplayImage(machine),
      machineState,
      machineOffline: machineState === "offline",
      machineSoldOut: machineState === "sold-out",
      displaySlots,
      selected,
      selectedSoldOut: !selected || selected.stock <= 0,
      actorName: this.actor?.name ?? "",
      currencyName: currencyProfile.label,
      currencyBalance,
      currencyBalanceDisplay: formatCurrencyAmount(currencyBalance),
      accessAllowed: access.allowed,
      accessReason: access.reason,
      cartLines,
      cartCount,
      cartTotal,
      cartTotalDisplay: formatCurrencyAmount(cartTotal),
      insufficientBalance,
      canCheckout: access.allowed
        && cartCount > 0
        && !insufficientBalance
        && !this.checkoutPending
        && !["authorizing", "dispensing", "ready", "collecting"].includes(this.lastDispense?.state ?? ""),
      checkoutPending: this.checkoutPending,
      unitNumber: `HSV-${normalizedMachineId.slice(-6).padStart(6, "0")}`,
      systemStatus: machineState === "online" ? "NOMINAL" : machineState === "sold-out" ? "DEPLETED" : "OFFLINE",
      telemetryTemperature: machineState === "offline" ? "--" : "04 C",
      telemetryBus: machineState === "offline" ? "0 V" : "48 V",
      connectionStatus: machineState === "offline" ? "DOWN" : "LINK",
      retrievalState: retrieval.state,
      retrievalMessage: retrieval.message,
      retrievalLabel: retrievalLabels[retrieval.state] ?? "READY",
      retrievalImage: retrieval.image ?? "",
      retrievalCanCollect: retrieval.state === "ready"
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find("[data-action='close-machine']").on("click", () => this.close());

    html.find("[data-action='collect-dispensed']").on("click", () => this.finishRetrieval(false));

    html.find("[data-action='open-product-details']").on("click", async (event) => {
      event.preventDefault();
      await this.openProductDetails(event.currentTarget.dataset.entryId);
    });

    const root = html?.[0] ?? html;
    const focusSelector = this.pendingFocusSelector;
    this.pendingFocusSelector = "";
    window.requestAnimationFrame(() => {
      this.applyViewportScale();
      if (focusSelector) root?.querySelector?.(focusSelector)?.focus?.();
    });
    const dragHandle = root?.querySelector?.("[data-drag-handle]");
    dragHandle?.addEventListener("pointerdown", (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (event.button !== 0 || target.closest("button, input, select, textarea, a")) return;
      const applicationElement = (this as any).element?.[0]
        ?? (this as any).element
        ?? root.closest?.(".window-app, .application, .app");
      if (!applicationElement?.getBoundingClientRect) return;

      event.preventDefault();
      const bounds = applicationElement.getBoundingClientRect();
      const startX = event.clientX;
      const startY = event.clientY;

      const move = (moveEvent: PointerEvent) => {
        const unclampedLeft = bounds.left + moveEvent.clientX - startX;
        const unclampedTop = bounds.top + moveEvent.clientY - startY;
        const left = Math.min(window.innerWidth - 80, Math.max(80 - bounds.width, unclampedLeft));
        const top = Math.min(window.innerHeight - 40, Math.max(0, unclampedTop));
        (this as any).setPosition?.({ left: Math.round(left), top: Math.round(top) });
      };
      const stop = () => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", stop);
        document.removeEventListener("pointercancel", stop);
      };

      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", stop);
      document.addEventListener("pointercancel", stop);
    });

    html.find("[data-action='select-entry']").on("click", (event) => {
      if (this.selectedEntryId !== event.currentTarget.dataset.entryId) this.playAudio("select");
      this.selectedEntryId = event.currentTarget.dataset.entryId;
      const escapedId = globalThis.CSS?.escape?.(this.selectedEntryId) ?? this.selectedEntryId;
      this.renderWithFocus(`[data-action='select-entry'][data-entry-id='${escapedId}']`);
    });

    html.find("[data-action='decrease-quantity'], [data-action='increase-quantity']").on("click", (event) => {
      const input = html.find("[name='purchaseQuantity']");
      const minimum = Math.max(1, Number(input.attr("min")) || 1);
      const maximum = Math.max(minimum, Number(input.attr("max")) || minimum);
      const delta = event.currentTarget.dataset.action === "increase-quantity" ? 1 : -1;
      const next = Math.min(maximum, Math.max(minimum, (Number(input.val()) || minimum) + delta));
      input.val(next).trigger("change");
    });

    html.find("[data-action='add-to-cart']").on("click", () => {
      const entry = this.machine?.inventory?.find((candidate) => candidate.id === this.selectedEntryId);
      if (!entry || entry.stock <= 0) return;
      const requested = Math.max(1, Math.floor(Number(html.find("[name='purchaseQuantity']").val()) || 1));
      const next = Math.min(entry.stock, (this.cart.get(entry.id) ?? 0) + requested);
      this.cart.set(entry.id, next);
      this.renderWithFocus("[data-action='add-to-cart']");
    });

    html.find("[data-action='remove-from-cart']").on("click", (event) => {
      this.cart.delete(event.currentTarget.dataset.entryId);
      this.renderWithFocus("[data-action='add-to-cart']");
    });

    html.find("[data-action='clear-cart']").on("click", () => {
      this.cart.clear();
      const selectedId = globalThis.CSS?.escape?.(this.selectedEntryId ?? "") ?? this.selectedEntryId;
      this.renderWithFocus(`[data-action='select-entry'][data-entry-id='${selectedId}']`);
    });

    html.find("[data-action='checkout']").on("click", async () => {
      if (!this.actor) {
        ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoActor"));
        return;
      }
      const lines = Array.from(this.cart, ([entryId, quantity]) => ({ entryId, quantity }));
      if (!lines.length) return;
      const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
      const checkoutTotal = lines.reduce((sum, line) => {
        const entry = this.machine?.inventory?.find((candidate) => candidate.id === line.entryId);
        return sum + (entry?.price ?? 0) * line.quantity;
      }, 0);
      const dispenseImage = itemCount > 1
        ? "icons/svg/item-bag.svg"
        : this.machine?.inventory?.find((entry) => entry.id === lines[0].entryId)?.image ?? "";
      const confirmed = await Dialog.confirm({
        title: game.i18n.localize("HOLOSUITEVENDING.Cart.Checkout"),
        content: `<p>${game.i18n.format("HOLOSUITEVENDING.Cart.Confirm", {
          count: itemCount,
          total: formatCurrencyAmount(checkoutTotal),
          currency: PurchaseService.getCurrencyProfile(this.actor).label
        })}</p>`
      });
      if (!confirmed) return;
      this.checkoutPending = true;
      this.lastDispense = { state: "authorizing", message: "PROCESSING PAYMENT" };
      this.render(false);
      this.playAudio("purchase");
      const purchase = await PurchaseService.requestPurchase({
        machineId: this.machineId,
        lines,
        actor: this.actor,
        context: this.context
      });
      if (purchase) {
        if (purchase.pending) {
          this.clearDispenseTimers();
          this.pendingRequestId = purchase.requestId;
          this.pendingDispense = { itemCount, image: dispenseImage };
          this.lastDispense = { state: "authorizing", message: "AWAITING GM AUTHORIZATION" };
          this.render(false);
          const pendingRequestId = purchase.requestId;
          this.scheduleDispense(() => {
            if (this.pendingRequestId === pendingRequestId) this.showDispenseFailure("AUTHORIZATION TIMED OUT");
          }, 15000);
        } else {
          this.cart.clear();
          this.beginDispenseSequence(
            purchase.result?.cart?.itemCount ?? itemCount,
            purchase.result?.reservation?.image || dispenseImage,
            purchase.result?.reservation?.requestId || purchase.requestId
          );
        }
      } else {
        this.showDispenseFailure("AUTHORIZATION FAILED: CART PRESERVED");
      }
    });
  }

  static refreshMachine(machineId) {
    for (const app of openApps) {
      if (app.machineId === machineId) app.render(false);
    }
  }

  static refreshAll() {
    for (const app of openApps) app.render(false);
  }

  static handlePurchaseResult(payload) {
    for (const app of openApps) app.handlePurchaseResult(payload);
  }

  static handleCollectionResult(payload) {
    for (const app of openApps) app.handleCollectionResult(payload);
  }
}
