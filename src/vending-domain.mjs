export const MACHINE_STATES = Object.freeze({
  ONLINE: "online",
  OFFLINE: "offline",
  SOLD_OUT: "sold-out"
});

const currencyFormatters = new Map();

function getCurrencyFormatter(locale) {
  const key = locale || "__default__";
  let formatter = currencyFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    currencyFormatters.set(key, formatter);
  }
  return formatter;
}

export function formatCurrencyAmount(value, locale) {
  const number = Number(value) || 0;
  return getCurrencyFormatter(locale)
    .format(Math.round((number + Number.EPSILON) * 100) / 100);
}

export function chooseInitialEntryId(entries = [], balance = 0) {
  const products = Array.isArray(entries) ? entries : [];
  return products.find((entry) => Number(entry?.stock ?? 0) > 0 && Number(entry?.price ?? 0) <= Number(balance))?.id
    ?? products.find((entry) => Number(entry?.stock ?? 0) > 0)?.id
    ?? products[0]?.id
    ?? null;
}

export function partitionInventory(entries = [], maximum = 6, archivedEntries = []) {
  const inventory = Array.isArray(entries) ? entries : [];
  const overflow = Array.isArray(archivedEntries) ? archivedEntries : [];
  const limit = Math.max(0, Math.floor(Number(maximum) || 0));
  return {
    active: inventory.slice(0, limit),
    overflow: [...inventory.slice(limit), ...overflow]
  };
}

export function normalizePurchaseLines(lines = []) {
  const quantities = new Map();
  for (const line of Array.isArray(lines) ? lines : []) {
    const entryId = String(line?.entryId ?? "").trim();
    const quantity = Math.min(99, Math.max(0, Math.floor(Number(line?.quantity ?? 0))));
    if (!entryId || quantity < 1) continue;
    quantities.set(entryId, Math.min(99, (quantities.get(entryId) ?? 0) + quantity));
  }
  return Array.from(quantities, ([entryId, quantity]) => ({ entryId, quantity }));
}

export function calculateCart(machine, lines = []) {
  const normalized = normalizePurchaseLines(lines);
  const inventory = Array.isArray(machine?.inventory) ? machine.inventory : [];
  const cartLines = normalized.map((line) => {
    const entry = inventory.find((candidate) => candidate?.id === line.entryId);
    if (!entry) throw new Error("Inventory entry not found.");
    const stock = Math.max(0, Number(entry.stock ?? 0));
    if (line.quantity > stock) throw new Error(`${entry.displayName ?? "Item"} does not have enough stock.`);
    const unitPrice = Math.max(0, Number(entry.price ?? 0));
    return {
      entry,
      entryId: line.entryId,
      quantity: line.quantity,
      unitPrice,
      totalPrice: unitPrice * line.quantity
    };
  });

  return {
    lines: cartLines,
    itemCount: cartLines.reduce((total, line) => total + line.quantity, 0),
    totalPrice: cartLines.reduce((total, line) => total + line.totalPrice, 0)
  };
}

export function getMachineState(machine) {
  if (machine?.status === MACHINE_STATES.OFFLINE) return MACHINE_STATES.OFFLINE;
  const inventory = Array.isArray(machine?.inventory) ? machine.inventory : [];
  if (inventory.length > 0 && inventory.every((entry) => Number(entry?.stock ?? 0) <= 0)) {
    return MACHINE_STATES.SOLD_OUT;
  }
  return MACHINE_STATES.ONLINE;
}

export function getMachineDisplayImage(machine) {
  return machine?.image || "icons/environment/settlement/stall.webp";
}
