function collectionEntries(collection) {
  if (!collection) return [];
  if (Array.isArray(collection)) return collection;
  if (Array.isArray(collection.contents)) return collection.contents;
  if (typeof collection.values === "function") return Array.from(collection.values());
  try {
    return Array.from(collection);
  } catch (_error) {
    return [];
  }
}

export function getCollectionEntry(collection, id) {
  const expected = String(id ?? "");
  if (!collection || !expected) return null;
  return collection.get?.(expected)
    ?? collectionEntries(collection).find((entry) => String(entry?.id ?? entry?._id ?? "") === expected)
    ?? null;
}

function collectionContainsDocument(collection, id) {
  const expected = String(id ?? "");
  if (!collection || !expected) return false;
  if (collection.has?.(expected) || collection.get?.(expected)) return true;
  return collectionEntries(collection).some((entry) => {
    const value = Array.isArray(entry) ? entry[1] : entry;
    return String(value?.id ?? value?._id ?? value ?? "") === expected;
  });
}

function isCollectionLike(value) {
  return Boolean(value) && (
    Array.isArray(value)
    || Array.isArray(value.contents)
    || typeof value.has === "function"
    || typeof value.values === "function"
    || typeof value[Symbol.iterator] === "function"
  );
}

function tokenMatchesActor(token, actor) {
  if (!token || !actor) return false;
  const actorId = String(actor.id ?? actor._id ?? "");
  return Boolean(actorId) && String(token.actorId ?? token.actor?.id ?? token.document?.actorId ?? "") === actorId;
}

export function getActorTokens(scene, actor, requestedTokenId = "") {
  if (!scene || !actor) return [];
  const tokens = collectionEntries(scene.tokens);
  const requested = getCollectionEntry(scene.tokens, requestedTokenId);
  const matches = [];
  const matchedIds = new Set();
  if (tokenMatchesActor(requested, actor)) {
    matches.push(requested);
    matchedIds.add(String(requested.id));
  }
  for (const token of tokens) {
    const tokenId = String(token?.id ?? "");
    if (tokenMatchesActor(token, actor) && !matchedIds.has(tokenId)) {
      matches.push(token);
      matchedIds.add(tokenId);
    }
  }
  return matches;
}

function tokenCenter(scene, token) {
  const document = token?.document ?? token;
  const gridSize = Number(scene?.grid?.size ?? scene?.dimensions?.size ?? globalThis.canvas?.grid?.size ?? 100) || 100;
  const x = Number(document?.x);
  const y = Number(document?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return {
    x: x + (Number(document?.width ?? 1) * gridSize / 2),
    y: y + (Number(document?.height ?? 1) * gridSize / 2),
    elevation: Number(document?.elevation ?? 0)
  };
}

function membershipFromToken(token, regionId) {
  const candidates = [token?.regions, token?._regions, token?.document?.regions, token?.document?._regions, token?.object?.regions];
  for (const candidate of candidates) {
    if (isCollectionLike(candidate)) return { known: true, present: collectionContainsDocument(candidate, regionId) };
  }
  return { known: false, present: false };
}

function membershipFromRegion(region, tokenId) {
  const candidates = [region?.tokens, region?._tokens, region?.document?.tokens, region?.object?.tokens];
  for (const candidate of candidates) {
    if (isCollectionLike(candidate)) return { known: true, present: collectionContainsDocument(candidate, tokenId) };
  }
  return { known: false, present: false };
}

export function regionContainsToken(region, token, scene) {
  const regionId = String(region?.id ?? region?._id ?? "");
  const tokenId = String(token?.id ?? token?._id ?? token?.document?.id ?? "");
  if (!regionId || !tokenId) return false;

  const tokenMembership = membershipFromToken(token, regionId);
  if (tokenMembership.known) return tokenMembership.present;
  const regionMembership = membershipFromRegion(region, tokenId);
  if (regionMembership.known) return regionMembership.present;

  const point = tokenCenter(scene, token);
  if (!point) return false;
  for (const candidate of [region, region?.object]) {
    if (!candidate) continue;
    if (typeof candidate.testPoint === "function") {
      const result = candidate.testPoint(point, point.elevation);
      if (typeof result === "boolean") return result;
    }
    if (typeof candidate.contains === "function") {
      const result = candidate.contains(point.x, point.y) ?? candidate.contains(point);
      if (typeof result === "boolean") return result;
    }
  }
  return false;
}

export function findMachineRegionPresence({ scene, machine, actor, tokenId = "" }) {
  if (!scene || !machine || !actor) return null;
  const linkedRegionIds = new Set((machine.regionIds ?? []).map((id) => String(id)));
  if (!linkedRegionIds.size) return null;
  const regions = collectionEntries(scene.regions).filter((region) => linkedRegionIds.has(String(region?.id ?? region?._id ?? "")));
  for (const token of getActorTokens(scene, actor, tokenId)) {
    for (const region of regions) {
      if (regionContainsToken(region, token, scene)) return { region, token: token.document ?? token };
    }
  }
  return null;
}

export function findMachineRegionPresences({ scene, machines = [], actor, tokenId = "" }) {
  const presenceByMachine = new Map();
  if (!scene || !actor || !Array.isArray(machines) || !machines.length) return presenceByMachine;

  const linkedRegionIds = new Set(machines.flatMap((machine) => (
    (machine.regionIds ?? []).map((id) => String(id))
  )));
  const regions = collectionEntries(scene.regions)
    .filter((region) => linkedRegionIds.has(String(region?.id ?? region?._id ?? "")));
  const presenceByRegion = new Map();

  for (const token of getActorTokens(scene, actor, tokenId)) {
    for (const region of regions) {
      const regionId = String(region?.id ?? region?._id ?? "");
      if (!presenceByRegion.has(regionId) && regionContainsToken(region, token, scene)) {
        presenceByRegion.set(regionId, { region, token: token.document ?? token });
      }
    }
  }

  for (const machine of machines) {
    const presence = (machine.regionIds ?? [])
      .map((regionId) => presenceByRegion.get(String(regionId)))
      .find(Boolean);
    if (presence) presenceByMachine.set(machine.id, presence);
  }
  return presenceByMachine;
}
