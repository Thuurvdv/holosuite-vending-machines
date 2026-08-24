import { MODULE_ID, SOCKET_NAME } from "./constants.js";
import { MachineStore } from "./machine-store.js";
import { calculateCart, formatCurrencyAmount, MACHINE_STATES, normalizePurchaseLines } from "./vending-domain.mjs";
import {
  allocateCurrencyRemainder,
  calculateCurrencyTotal,
  DEFAULT_CURRENCY_MULTIPLIERS,
  getCollectionDecision,
  getDispenseDelay
} from "./purchase-domain.mjs";
import { findMachineRegionPresence, getCollectionEntry } from "./region-access.mjs";

const QUANTITY_PATHS = [
  "system.quantity",
  "system.qty",
  "system.amount",
  "system.count",
  "system.stack",
  "system.uses.value"
];

const CURRENCY_ROOT_CANDIDATES = [
  "system.currency",
  "system.currencies",
  "system.money",
  "system.wealth",
  "system.resources.currency"
];

const CURRENCY_MULTIPLIERS = DEFAULT_CURRENCY_MULTIPLIERS;

const CURRENCY_LABELS = {
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

function getQuantity(item) {
  for (const path of QUANTITY_PATHS) {
    const value = foundry.utils.getProperty(item, path);
    if (Number.isFinite(Number(value))) return { path, value: Number(value) };
  }
  return { path: null, value: 1 };
}

function actorItems(actor): any[] {
  return Array.from(actor?.items ?? []);
}

function findCurrencyItem(actor, currencyName) {
  const expected = String(currencyName).trim().toLocaleLowerCase();
  return actorItems(actor).find((item) => String(item.name).trim().toLocaleLowerCase() === expected);
}

function numericCurrencyEntries(value, rootPath) {
  if (value === null || value === undefined || value === "") return [];
  if (Number.isFinite(Number(value))) {
    return [{ key: rootPath.split(".").at(-1) || "currency", path: rootPath, amount: Number(value) }];
  }
  if (typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value)
    .filter(([, amount]) => amount !== null && amount !== "" && Number.isFinite(Number(amount)))
    .map(([key, amount]) => ({ key, path: `${rootPath}.${key}`, amount: Number(amount) }));
}

function findActorCurrencyEntries(actor) {
  if (!actor) return [];
  const configured = MachineStore.getCurrencyPath();
  const candidates = configured ? [configured, ...CURRENCY_ROOT_CANDIDATES] : CURRENCY_ROOT_CANDIDATES;
  const seen = new Set();
  for (const path of candidates) {
    if (!path || seen.has(path)) continue;
    seen.add(path);
    const entries = numericCurrencyEntries(foundry.utils.getProperty(actor, path), path);
    if (entries.length) return entries;
  }
  return [];
}

function actorCurrencyTotal(entries) {
  return calculateCurrencyTotal(entries);
}

function currencyLabelForEntries(entries) {
  const keys = entries.map((entry) => String(entry.key).toLocaleLowerCase());
  if (keys.some((key) => Object.hasOwn(CURRENCY_MULTIPLIERS, key))) return "GP";
  if (keys.length === 1) return CURRENCY_LABELS[keys[0]] ?? String(entries[0].key).toLocaleUpperCase();
  return MachineStore.getCurrencyName();
}

function resolveCurrencySource(actor) {
  const mode = MachineStore.getCurrencyMode();
  const entries = findActorCurrencyEntries(actor);
  if ((mode === "auto" || mode === "actor") && entries.length) {
    return {
      kind: "actor",
      actor,
      entries,
      value: actorCurrencyTotal(entries),
      label: MachineStore.getCreditTransformer() ? "Credits" : currencyLabelForEntries(entries)
    };
  }
  if (mode === "actor") return { kind: "invalid", actor, value: 0, label: MachineStore.getCurrencyName() };

  const item = findCurrencyItem(actor, MachineStore.getCurrencyName());
  return item
    ? { kind: "item", item, value: getQuantity(item).value, label: item.name || MachineStore.getCurrencyName() }
    : { kind: "missing", value: 0, label: MachineStore.getCurrencyName() };
}

function canUserOwnActor(user, actor) {
  if (!actor || !user) return false;
  if (user.isGM) return true;
  return actor.testUserPermission?.(user, "OWNER") ?? false;
}

function checkMachineAccess({ machine, actor, user, context = {} }: any) {
  if (!machine) return { allowed: false, reason: game.i18n.localize("HOLOSUITEVENDING.Notifications.NoMachine") };
  if (MachineStore.getMachineState(machine) === MACHINE_STATES.OFFLINE) {
    return { allowed: false, reason: game.i18n.localize("HOLOSUITEVENDING.Notifications.Offline") };
  }
  if (user?.isGM) return { allowed: true, reason: "" };

  if (machine.access?.requireProximity) {
    const scene = getCollectionEntry(game.scenes, context.sceneId) ?? canvas?.scene;
    const presence = findMachineRegionPresence({ scene, machine, actor, tokenId: context.tokenId });
    if (!presence) {
      return { allowed: false, reason: game.i18n.localize("HOLOSUITEVENDING.Notifications.TooFar") };
    }
  }

  return { allowed: true, reason: "" };
}

async function resolvePurchaseItem(entry) {
  if (entry.itemUuid) {
    const document = await fromUuid(entry.itemUuid);
    if (document) return document.toObject ? document.toObject() : foundry.utils.deepClone(document);
  }

  if (entry.embeddedData) return foundry.utils.deepClone(entry.embeddedData);
  const fallbackType = game.system?.documentTypes?.Item?.[0] ?? "loot";
  return {
    name: entry.displayName,
    type: fallbackType,
    img: entry.image,
    system: {}
  };
}

async function deductCurrency(source, totalPrice) {
  if (!source || totalPrice <= 0) return null;
  if (source.kind === "actor") {
    const previous = Object.fromEntries(source.entries.map((entry) => [entry.path, entry.amount]));
    const { updates } = allocateCurrencyRemainder(source.entries, totalPrice);
    await source.actor.update(updates);
    return { type: "actor", actor: source.actor, previous };
  }
  if (source.kind !== "item") return null;

  const currencyItem = source.item;
  const current = getQuantity(currencyItem);
  const snapshot = currencyItem.toObject ? currencyItem.toObject() : foundry.utils.deepClone(currencyItem);
  const remaining = current.value - totalPrice;
  if (remaining <= 0) {
    await currencyItem.delete();
    return { type: "deleted", actor: currencyItem.parent, snapshot };
  }
  await currencyItem.update({ [current.path]: remaining });
  return { type: "updated", item: currencyItem, path: current.path, previous: current.value };
}

async function rollbackCurrency(change) {
  if (!change) return;
  if (change.type === "actor") {
    await change.actor.update(change.previous);
    return;
  }
  if (change.type === "updated") {
    await change.item.update({ [change.path]: change.previous });
    return;
  }
  const data = foundry.utils.deepClone(change.snapshot);
  delete data._id;
  await change.actor.createEmbeddedDocuments("Item", [data]);
}

async function addItemToActor(actor, itemData, quantity) {
  const data = foundry.utils.deepClone(itemData);
  delete data._id;
  data.name = data.name || "Vended Item";
  data.img = data.img || "icons/svg/item-bag.svg";

  const incoming = getQuantity(data);
  const existing = actorItems(actor).find((item) => item.name === data.name && item.type === data.type);
  if (existing) {
    const current = getQuantity(existing);
    if (current.path) {
      const addedQuantity = Math.max(1, incoming.value) * quantity;
      await existing.update({ [current.path]: current.value + addedQuantity });
      return { type: "updated", item: existing, path: current.path, previous: current.value };
    }
  }

  if (incoming.path) {
    foundry.utils.setProperty(data, incoming.path, Math.max(1, incoming.value) * quantity);
    const created = await actor.createEmbeddedDocuments("Item", [data]);
    return { type: "created", actor, ids: created.map((item) => item.id) };
  }

  const documents = Array.from({ length: quantity }, () => foundry.utils.deepClone(data));
  const created = await actor.createEmbeddedDocuments("Item", documents);
  return { type: "created", actor, ids: created.map((item) => item.id) };
}

async function rollbackAddedItems(changes) {
  for (const change of [...changes].reverse()) {
    if (change.type === "updated") await change.item.update({ [change.path]: change.previous });
    else if (change.ids?.length) await change.actor.deleteEmbeddedDocuments("Item", change.ids);
  }
}

async function notifyUser(userId, level, message) {
  if (game.user.id === userId) {
    ui.notifications[level]?.(message);
    return;
  }
  game.socket.emit(SOCKET_NAME, { type: "notify", moduleId: MODULE_ID, userId, level, message });
}

function notifyPurchaseResult(userId, result) {
  const payload = { type: "purchase-result", moduleId: MODULE_ID, userId, ...result };
  if (game.user.id === userId) {
    Hooks.callAll(`${MODULE_ID}.purchaseResult`, payload);
    return;
  }
  game.socket.emit(SOCKET_NAME, payload);
}

function notifyCollectionResult(userId, result) {
  const payload = { type: "collection-result", moduleId: MODULE_ID, userId, ...result };
  if (game.user.id === userId) {
    Hooks.callAll(`${MODULE_ID}.collectionResult`, payload);
    return;
  }
  game.socket.emit(SOCKET_NAME, payload);
}

async function createPurchaseChatMessage({ actor, itemSummary, totalPrice, currencyName }) {
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: game.i18n.format("HOLOSUITEVENDING.Notifications.Purchased", {
      actor: actor.name,
      item: itemSummary,
      price: formatCurrencyAmount(totalPrice),
      currency: currencyName
    })
  });
}

async function safeAppendLedger(entry) {
  try {
    return await MachineStore.appendLedger(entry);
  } catch (error) {
    console.warn(`${MODULE_ID} | Could not update transaction ledger`, error);
    return null;
  }
}

export class PurchaseService {
  static transactionQueue: Promise<any> = Promise.resolve();
  static processedRequests = new Set<string>();
  static dispenseTimers = new Map<string, number>();

  static registerSocket() {
    game.socket.on(SOCKET_NAME, async (payload) => {
      if (!payload || payload.moduleId && payload.moduleId !== MODULE_ID) return;
      if (payload.type === "notify" && payload.userId === game.user.id) {
        ui.notifications[payload.level || "info"]?.(payload.message);
        return;
      }
      if (payload.type === "purchase-result" && payload.userId === game.user.id) {
        Hooks.callAll(`${MODULE_ID}.purchaseResult`, payload);
        return;
      }
      if (payload.type === "collection-result" && payload.userId === game.user.id) {
        Hooks.callAll(`${MODULE_ID}.collectionResult`, payload);
        return;
      }
      if (payload.type === "purchase" && game.user.isGM && this.isResponsibleGM()) {
        await this.handlePurchaseRequest(payload);
        return;
      }
      if (payload.type === "collection" && game.user.isGM && this.isResponsibleGM()) {
        await this.handleCollectionRequest(payload);
      }
    });
  }

  static isResponsibleGM() {
    const gm = game.users.find((user) => user.active && user.isGM);
    return gm?.id === game.user.id;
  }

  static checkAccess({ machineId, actor, user = game.user, context = {} }) {
    return checkMachineAccess({ machine: MachineStore.getMachine(machineId), actor, user, context });
  }

  static getCurrencyBalance(actor) {
    return resolveCurrencySource(actor).value;
  }

  static getCurrencyProfile(actor) {
    const source = resolveCurrencySource(actor);
    return { balance: source.value, label: source.label, source: source.kind };
  }

  static enqueue(input) {
    const task = this.transactionQueue.then(() => this.processPurchase(input));
    this.transactionQueue = task.catch(() => undefined);
    return task;
  }

  static enqueueCollection(input) {
    const task = this.transactionQueue.then(() => this.finalizeDispense(input));
    this.transactionQueue = task.catch(() => undefined);
    return task;
  }

  static scheduleDispense(reservation) {
    const requestId = reservation?.requestId;
    if (!requestId || !game.user?.isGM || !this.isResponsibleGM()) return;
    const existing = this.dispenseTimers.get(requestId);
    if (existing) window.clearTimeout(existing);
    const delay = getDispenseDelay(reservation.expiresAt);
    const timer = window.setTimeout(async () => {
      this.dispenseTimers.delete(requestId);
      try {
        await this.enqueueCollection({ requestId, automatic: true });
      } catch (error) {
        console.warn(`${MODULE_ID} | Automatic vending collection failed`, error);
      }
    }, Math.min(delay, 2_147_000_000));
    this.dispenseTimers.set(requestId, timer);
  }

  static resumePendingDispenses() {
    if (!game.user?.isGM || !this.isResponsibleGM()) return;
    for (const reservation of MachineStore.getPendingDispenses()) this.scheduleDispense(reservation);
  }

  static async requestPurchase({ machineId, entryId = "", lines = [], actor, context = {} }) {
    const purchaseLines = normalizePurchaseLines(lines.length ? lines : [{ entryId, quantity: 1 }]);
    if (!actor) {
      ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoActor"));
      return false;
    }
    if (!purchaseLines.length) return false;

    const access = this.checkAccess({ machineId, actor, context });
    if (!access.allowed) {
      ui.notifications.warn(access.reason);
      return false;
    }

    const requestId = foundry?.utils?.randomID?.(16) ?? `${game.user.id}-${Date.now()}-${Math.random()}`;
    if (game.user.isGM && this.isResponsibleGM()) {
      try {
        const result = await this.enqueue({ requestId, machineId, lines: purchaseLines, actor, user: game.user, context });
        return { accepted: true, pending: false, requestId, result };
      } catch (error) {
        ui.notifications.warn(error.message);
        return false;
      }
    }

    if (!canUserOwnActor(game.user, actor)) {
      ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoActor"));
      return false;
    }
    const gm = game.users.find((user) => user.active && user.isGM);
    if (!gm) {
      ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoGM"));
      return false;
    }

    game.socket.emit(SOCKET_NAME, {
      type: "purchase",
      moduleId: MODULE_ID,
      requestId,
      userId: game.user.id,
      machineId,
      lines: purchaseLines,
      actorUuid: actor.uuid,
      context
    });
    ui.notifications.info(game.i18n.localize("HOLOSUITEVENDING.Notifications.Processing"));
    return { accepted: true, pending: true, requestId };
  }

  static async handlePurchaseRequest(payload) {
    const user = game.users.get(payload.userId);
    const actor = await fromUuid(payload.actorUuid);
    try {
      const result = await this.enqueue({
        requestId: payload.requestId,
        machineId: payload.machineId,
        lines: payload.lines,
        actor,
        user,
        context: payload.context ?? {}
      });
      notifyPurchaseResult(payload.userId, {
        status: "success",
        requestId: payload.requestId,
        machineId: payload.machineId,
        reservationId: result?.reservation?.requestId ?? payload.requestId,
        itemCount: result?.cart?.itemCount ?? 0,
        image: result?.reservation?.image ?? ""
      });
    } catch (error) {
      console.warn(`${MODULE_ID} | Purchase failed`, error);
      await notifyUser(payload.userId, "warn", error.message);
      notifyPurchaseResult(payload.userId, {
        status: "failed",
        requestId: payload.requestId,
        machineId: payload.machineId,
        message: error.message
      });
    }
  }

  static async requestCollection({ requestId, automatic = false }) {
    if (!requestId) return false;
    if (game.user.isGM && this.isResponsibleGM()) {
      try {
        const result = await this.enqueueCollection({ requestId, user: game.user, automatic });
        return { accepted: true, pending: false, result };
      } catch (error) {
        ui.notifications.warn(error.message);
        return false;
      }
    }

    const gm = game.users.find((user) => user.active && user.isGM);
    if (!gm) {
      ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoGM"));
      return false;
    }
    game.socket.emit(SOCKET_NAME, {
      type: "collection",
      moduleId: MODULE_ID,
      requestId,
      userId: game.user.id,
      automatic
    });
    return { accepted: true, pending: true };
  }

  static async handleCollectionRequest(payload) {
    try {
      const user = game.users.get(payload.userId);
      const result = await this.enqueueCollection({
        requestId: payload.requestId,
        user,
        automatic: payload.automatic === true,
        notifyResult: false
      });
      notifyCollectionResult(payload.userId, {
        status: "success",
        requestId: payload.requestId,
        machineId: result?.reservation?.machineId ?? "",
        automatic: result?.automatic === true
      });
    } catch (error) {
      console.warn(`${MODULE_ID} | Collection failed`, error);
      await notifyUser(payload.userId, "warn", error.message);
      notifyCollectionResult(payload.userId, {
        status: "failed",
        requestId: payload.requestId,
        message: error.message
      });
    }
  }

  static async processPurchase({ requestId, machineId, lines, actor, user, context = {} }) {
    const existingReservation = MachineStore.getPendingDispense(requestId);
    if (existingReservation) {
      return {
        duplicate: true,
        reservation: existingReservation,
        cart: { itemCount: existingReservation.itemCount, totalPrice: existingReservation.totalPrice, lines: [] }
      };
    }
    if (this.processedRequests.has(requestId) || MachineStore.hasProcessedRequest(requestId)) return { duplicate: true };
    const currencySource = resolveCurrencySource(actor);
    const currencyName = currencySource.label;
    let machine = MachineStore.getMachine(machineId);
    const baseLedger = {
      requestId,
      machineId,
      machineName: machine?.name ?? "Unknown machine",
      actorId: actor?.id ?? "",
      actorName: actor?.name ?? "Unknown actor",
      userId: user?.id ?? "",
      userName: user?.name ?? "Unknown user",
      currencyName
    };

    try {
      if (!canUserOwnActor(user, actor)) {
        throw new Error(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoActor"));
      }
      machine = MachineStore.getMachine(machineId);
      const access = checkMachineAccess({ machine, actor, user, context });
      if (!access.allowed) throw new Error(access.reason);

      const cart = calculateCart(machine, lines);
      if (!cart.lines.length) throw new Error(game.i18n.localize("HOLOSUITEVENDING.Notifications.EmptyCart"));

      if (cart.totalPrice > 0 && currencySource.kind === "invalid") {
        throw new Error(game.i18n.format("HOLOSUITEVENDING.Notifications.CurrencyPathInvalid", {
          path: MachineStore.getCurrencyPath() || "automatic detection"
        }));
      }
      if (cart.totalPrice > 0 && currencySource.value < cart.totalPrice) {
        throw new Error(game.i18n.format("HOLOSUITEVENDING.Notifications.NoCurrency", { currency: currencyName }));
      }

      const resolvedItems = [];
      for (const line of cart.lines) {
        resolvedItems.push({ line, itemData: await resolvePurchaseItem(line.entry) });
      }

      let currencyChange = null;
      const previousStocks = Object.fromEntries(cart.lines.map((line) => [line.entryId, line.entry.stock]));
      let stockReserved = false;
      let reservation = null;
      try {
        currencyChange = await deductCurrency(currencySource, cart.totalPrice);
        const stockUpdates = Object.fromEntries(cart.lines.map((line) => [line.entryId, line.entry.stock - line.quantity]));
        await MachineStore.updateEntryStocks(machineId, stockUpdates);
        stockReserved = true;
        const itemSummary = cart.lines.map((line) => `${line.quantity}× ${line.entry.displayName}`).join(", ");
        reservation = await MachineStore.addPendingDispense({
          id: requestId,
          requestId,
          machineId,
          machineName: machine.name,
          actorUuid: actor.uuid,
          actorId: actor.id,
          actorName: actor.name,
          userId: user.id,
          userName: user.name,
          currencyName,
          itemSummary,
          itemCount: cart.itemCount,
          totalPrice: cart.totalPrice,
          items: resolvedItems.map((resolved) => ({
            itemData: resolved.itemData,
            quantity: resolved.line.quantity,
            displayName: resolved.line.entry.displayName,
            image: resolved.line.entry.image
          })),
          image: cart.itemCount > 1 ? "icons/svg/item-bag.svg" : resolvedItems[0]?.line?.entry?.image ?? "",
          createdAt: Date.now(),
          expiresAt: Date.now() + 10_850,
          status: "pending"
        });
      } catch (error) {
        if (stockReserved) {
          try {
            await MachineStore.updateEntryStocks(machineId, previousStocks);
          } catch (stockRollbackError) {
            console.error(`${MODULE_ID} | Reserved-stock rollback failed`, stockRollbackError);
          }
        }
        try {
          await rollbackCurrency(currencyChange);
        } catch (currencyRollbackError) {
          console.error(`${MODULE_ID} | Currency rollback failed`, currencyRollbackError);
        }
        throw error;
      }

      this.processedRequests.add(requestId);
      if (this.processedRequests.size > 500) {
        this.processedRequests.delete(this.processedRequests.values().next().value);
      }
      this.scheduleDispense(reservation);
      return { cart, reservation };
    } catch (error) {
      await safeAppendLedger({ ...baseLedger, status: "failed", error: error.message });
      throw error;
    }
  }

  static async finalizeDispense({ requestId, user = null, automatic = false, notifyResult = true }) {
    const reservation = MachineStore.getPendingDispense(requestId);
    const decision = getCollectionDecision(reservation, user);
    if (decision === "missing") return { duplicate: true, automatic };
    if (decision === "forbidden") {
      throw new Error(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoActor"));
    }

    if (decision === "busy") {
      throw new Error(game.i18n.localize("HOLOSUITEVENDING.Notifications.CollectionBusy"));
    }

    const actor = await fromUuid(reservation.actorUuid);
    if (!actor) throw new Error(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoActor"));

    await MachineStore.updatePendingDispense(requestId, { status: "delivering" });
    const itemChanges = [];
    try {
      for (const item of reservation.items) {
        itemChanges.push(await addItemToActor(actor, item.itemData, item.quantity));
      }
      await MachineStore.removePendingDispense(requestId);
    } catch (error) {
      try {
        await rollbackAddedItems(itemChanges);
      } catch (rollbackError) {
        console.error(`${MODULE_ID} | Collected-item rollback failed`, rollbackError);
      }
      await MachineStore.updatePendingDispense(requestId, { status: "pending" });
      this.scheduleDispense({ ...reservation, expiresAt: Date.now() + 5_000 });
      throw error;
    }

    const timer = this.dispenseTimers.get(requestId);
    if (timer) window.clearTimeout(timer);
    this.dispenseTimers.delete(requestId);
    await safeAppendLedger({
      requestId,
      machineId: reservation.machineId,
      machineName: reservation.machineName,
      actorId: reservation.actorId,
      actorName: reservation.actorName,
      userId: reservation.userId,
      userName: reservation.userName,
      currencyName: reservation.currencyName,
      status: "success",
      itemSummary: reservation.itemSummary,
      itemCount: reservation.itemCount,
      totalPrice: reservation.totalPrice
    });
    try {
      await createPurchaseChatMessage({
        actor,
        itemSummary: reservation.itemSummary,
        totalPrice: reservation.totalPrice,
        currencyName: reservation.currencyName
      });
    } catch (error) {
      console.warn(`${MODULE_ID} | Could not create purchase chat message`, error);
    }
    await notifyUser(reservation.userId, "info", game.i18n.format("HOLOSUITEVENDING.Notifications.Purchased", {
      actor: reservation.actorName,
      item: reservation.itemSummary,
      price: formatCurrencyAmount(reservation.totalPrice),
      currency: reservation.currencyName
    }));
    if (automatic && notifyResult) {
      notifyCollectionResult(reservation.userId, {
        status: "success",
        requestId,
        machineId: reservation.machineId,
        automatic: true
      });
    }
    return { reservation, automatic };
  }

  static async purchase({ machineId, entryId, actor, user, context = {} }) {
    return this.enqueue({
      requestId: foundry?.utils?.randomID?.(16) ?? `${Date.now()}-${Math.random()}`,
      machineId,
      lines: [{ entryId, quantity: 1 }],
      actor,
      user,
      context
    });
  }
}
