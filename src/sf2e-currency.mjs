export function getSf2eCurrencyProfile(actor, systemId = globalThis.game?.system?.id) {
  if (systemId !== "sf2e") return null;

  const inventory = actor?.inventory;
  const credits = Number(inventory?.currency?.credits);
  if (
    !Number.isFinite(credits) ||
    typeof inventory?.removeCurrency !== "function" ||
    typeof inventory?.addCurrency !== "function"
  ) {
    return null;
  }

  return { value: Math.max(0, credits), label: "Credits" };
}

export async function removeSf2eCredits(actor, amount) {
  return actor.inventory.removeCurrency({ credits: Math.max(0, Number(amount) || 0) });
}

export async function addSf2eCredits(actor, amount) {
  await actor.inventory.addCurrency({ credits: Math.max(0, Number(amount) || 0) });
}
