export const DEFAULT_CURRENCY_MULTIPLIERS = Object.freeze({
  cp: 0.01,
  sp: 0.1,
  ep: 0.5,
  gp: 1,
  pp: 10
});

function roundAmount(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100_000_000) / 100_000_000;
}

export function getCurrencyMultiplier(key, multipliers = DEFAULT_CURRENCY_MULTIPLIERS) {
  return Number(multipliers[String(key).toLocaleLowerCase()]) || 1;
}

export function calculateCurrencyTotal(entries = [], multipliers = DEFAULT_CURRENCY_MULTIPLIERS) {
  return roundAmount((Array.isArray(entries) ? entries : []).reduce((total, entry) => {
    return total + (Number(entry?.amount) || 0) * getCurrencyMultiplier(entry?.key, multipliers);
  }, 0));
}

export function allocateCurrencyRemainder(entries = [], price = 0, multipliers = DEFAULT_CURRENCY_MULTIPLIERS) {
  const values = Array.isArray(entries) ? entries : [];
  const totalBefore = calculateCurrencyTotal(values, multipliers);
  let remainder = roundAmount(Math.max(0, totalBefore - Math.max(0, Number(price) || 0)));
  const sorted = [...values].sort((left, right) => {
    return getCurrencyMultiplier(right?.key, multipliers) - getCurrencyMultiplier(left?.key, multipliers);
  });
  const updates = {};

  sorted.forEach((entry, index) => {
    const multiplier = getCurrencyMultiplier(entry?.key, multipliers);
    const isSmallestDenomination = index === sorted.length - 1;
    const amount = isSmallestDenomination
      ? roundAmount(remainder / multiplier)
      : Math.floor(roundAmount(remainder / multiplier));
    updates[entry.path] = amount;
    remainder = roundAmount(Math.max(0, remainder - amount * multiplier));
  });

  return {
    updates,
    totalBefore,
    totalAfter: calculateCurrencyTotal(
      values.map((entry) => ({ ...entry, amount: updates[entry.path] ?? entry.amount })),
      multipliers
    )
  };
}

export function getCollectionDecision(reservation, user = null) {
  if (!reservation) return "missing";
  if (user && !user.isGM && reservation.userId !== user.id) return "forbidden";
  if (reservation.status === "delivering") return "busy";
  return "deliver";
}

export function getDispenseDelay(expiresAt, now = Date.now()) {
  return Math.max(0, Number(expiresAt) - Number(now));
}
