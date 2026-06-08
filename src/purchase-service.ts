import { MODULE_ID, SOCKET_NAME } from "./constants.js";
import { MachineStore } from "./machine-store.js";

const QUANTITY_PATHS = [
  "system.quantity",
  "system.qty",
  "system.amount",
  "system.count",
  "system.stack",
  "system.uses.value"
];

function getQuantity(item) {
  for (const path of QUANTITY_PATHS) {
    const value = foundry.utils.getProperty(item, path);
    if (Number.isFinite(Number(value))) return { path, value: Number(value) };
  }
  return { path: null, value: 1 };
}

async function changeItemQuantity(item, quantity) {
  const current = getQuantity(item);
  if (!current.path) {
    if (quantity <= 0) await item.delete();
    return;
  }

  if (quantity <= 0) await item.delete();
  else await item.update({ [current.path]: quantity });
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

function actorItems(actor): any[] {
  return Array.from(actor?.items ?? []);
}

function findCurrencyItem(actor, currencyName) {
  const expected = String(currencyName).trim().toLocaleLowerCase();
  return actorItems(actor).find((item) => String(item.name).trim().toLocaleLowerCase() === expected);
}

async function addItemToActor(actor, itemData) {
  const data = foundry.utils.deepClone(itemData);
  delete data._id;
  data.name = data.name || "Vended Item";
  data.img = data.img || "icons/svg/item-bag.svg";

  const incomingQty = getQuantity(data).value || 1;
  const existing = actorItems(actor).find((item) => item.name === data.name && item.type === data.type);
  if (existing) {
    const current = getQuantity(existing);
    if (current.path) {
      await existing.update({ [current.path]: current.value + incomingQty });
      return existing;
    }
  }

  await actor.createEmbeddedDocuments("Item", [data]);
  return null;
}

function canUserOwnActor(user, actor) {
  if (!actor || !user) return false;
  if (user.isGM) return true;
  return actor.testUserPermission?.(user, "OWNER") ?? false;
}

async function notifyUser(userId, level, message) {
  if (game.user.id === userId) {
    ui.notifications[level]?.(message);
    return;
  }

  game.socket.emit(SOCKET_NAME, {
    type: "notify",
    userId,
    level,
    message
  });
}

async function createPurchaseChatMessage({ actor, entry, price, currencyName }) {
  const content = game.i18n.format("HOLOSUITEVENDING.Notifications.Purchased", {
    actor: actor.name,
    item: entry.displayName,
    price,
    currency: currencyName
  });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content
  });
}

export class PurchaseService {
  static registerSocket() {
    game.socket.on(SOCKET_NAME, async (payload) => {
      if (!payload || payload.moduleId && payload.moduleId !== MODULE_ID) return;

      if (payload.type === "notify" && payload.userId === game.user.id) {
        ui.notifications[payload.level || "info"]?.(payload.message);
        return;
      }

      if (payload.type === "purchase" && game.user.isGM && this.isResponsibleGM()) {
        await this.handlePurchaseRequest(payload);
      }
    });
  }

  static isResponsibleGM() {
    const gm = game.users.find((user) => user.active && user.isGM);
    return gm?.id === game.user.id;
  }

  static async requestPurchase({ machineId, entryId, actor }) {
    if (!actor) {
      ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoActor"));
      return;
    }

    if (game.user.isGM) {
      await this.purchase({ machineId, entryId, actor, user: game.user });
      return;
    }

    if (!canUserOwnActor(game.user, actor)) {
      ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoActor"));
      return;
    }

    const gm = game.users.find((user) => user.active && user.isGM);
    if (!gm) {
      ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoGM"));
      return;
    }

    game.socket.emit(SOCKET_NAME, {
      type: "purchase",
      moduleId: MODULE_ID,
      userId: game.user.id,
      machineId,
      entryId,
      actorUuid: actor.uuid
    });
  }

  static async handlePurchaseRequest(payload) {
    const user = game.users.get(payload.userId);
    const actor = await fromUuid(payload.actorUuid);
    try {
      await this.purchase({
        machineId: payload.machineId,
        entryId: payload.entryId,
        actor,
        user
      });
    } catch (error) {
      console.warn(`${MODULE_ID} | Purchase failed`, error);
      await notifyUser(payload.userId, "warn", error.message);
    }
  }

  static async purchase({ machineId, entryId, actor, user }) {
    if (!canUserOwnActor(user, actor)) {
      throw new Error(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoActor"));
    }

    const machine = MachineStore.getMachine(machineId);
    const entry = machine?.inventory?.find((candidate) => candidate.id === entryId);
    if (!machine || !entry) throw new Error(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoMachine"));
    if (entry.stock <= 0) throw new Error(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoStock"));

    const currencyName = MachineStore.getCurrencyName();
    const currencyItem = findCurrencyItem(actor, currencyName);
    const currencyQuantity = currencyItem ? getQuantity(currencyItem).value : 0;
    if (!currencyItem || currencyQuantity < entry.price) {
      throw new Error(game.i18n.format("HOLOSUITEVENDING.Notifications.NoCurrency", { currency: currencyName }));
    }

    const itemData = await resolvePurchaseItem(entry);
    await changeItemQuantity(currencyItem, currencyQuantity - entry.price);
    await addItemToActor(actor, itemData);
    await MachineStore.updateEntryStock(machineId, entryId, entry.stock - 1);
    await createPurchaseChatMessage({ actor, entry, price: entry.price, currencyName });
    await notifyUser(user.id, "info", game.i18n.format("HOLOSUITEVENDING.Notifications.Purchased", {
      actor: actor.name,
      item: entry.displayName,
      price: entry.price,
      currency: currencyName
    }));
  }
}
