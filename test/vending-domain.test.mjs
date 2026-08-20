import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateCart,
  chooseInitialEntryId,
  distanceInGridSpaces,
  formatCurrencyAmount,
  getMachineDisplayImage,
  getMachineState,
  isWithinProximity,
  normalizePurchaseLines,
  partitionInventory
} from "../src/vending-domain.mjs";

test("formats fractional system currency without floating-point noise", () => {
  assert.equal(formatCurrencyAmount(0.30000000000000004, "en-US"), "0.3");
  assert.equal(formatCurrencyAmount(1250, "en-US"), "1,250");
});

test("selects an available affordable product first", () => {
  const entries = [
    { id: "sold", stock: 0, price: 1 },
    { id: "expensive", stock: 2, price: 20 },
    { id: "affordable", stock: 1, price: 5 }
  ];
  assert.equal(chooseInitialEntryId(entries, 10), "affordable");
  assert.equal(chooseInitialEntryId(entries, 0), "expensive");
  assert.equal(chooseInitialEntryId([], 10), null);
});

test("normalizes, combines, and bounds purchase lines", () => {
  assert.deepEqual(normalizePurchaseLines([
    { entryId: "cola", quantity: 2 },
    { entryId: "cola", quantity: 3 },
    { entryId: "", quantity: 4 },
    { entryId: "chips", quantity: -1 }
  ]), [{ entryId: "cola", quantity: 5 }]);
  assert.deepEqual(normalizePurchaseLines([{ entryId: "cola", quantity: 500 }]), [{ entryId: "cola", quantity: 99 }]);
});

test("calculates multi-line cart totals and rejects unavailable stock", () => {
  const machine = { inventory: [
    { id: "cola", displayName: "Cola", price: 3, stock: 5 },
    { id: "chips", displayName: "Chips", price: 4, stock: 2 }
  ] };
  const cart = calculateCart(machine, [
    { entryId: "cola", quantity: 2 },
    { entryId: "chips", quantity: 1 }
  ]);
  assert.equal(cart.itemCount, 3);
  assert.equal(cart.totalPrice, 10);
  assert.throws(() => calculateCart(machine, [{ entryId: "chips", quantity: 3 }]), /enough stock/);
});

test("derives visual machine states and state images", () => {
  const machine = {
    status: "online",
    image: "online.webp",
    offlineImage: "offline.webp",
    soldOutImage: "empty.webp",
    inventory: [{ stock: 0 }]
  };
  assert.equal(getMachineState(machine), "sold-out");
  assert.equal(getMachineDisplayImage(machine), "empty.webp");
  machine.status = "offline";
  assert.equal(getMachineState(machine), "offline");
  assert.equal(getMachineDisplayImage(machine), "offline.webp");
});

test("measures token-to-machine proximity in grid spaces", () => {
  const token = { x: 0, y: 0, width: 1, height: 1 };
  const tile = { x: 200, y: 0, width: 100, height: 100 };
  assert.equal(distanceInGridSpaces(token, tile, 100), 2);
  assert.equal(isWithinProximity(token, tile, 100, 2), true);
  assert.equal(isWithinProximity(token, tile, 100, 1), false);
});

test("keeps nine active products and preserves excess products in the archive", () => {
  const products = Array.from({ length: 11 }, (_, index) => ({ id: `product-${index + 1}` }));
  const archived = [{ id: "previously-archived" }];
  const result = partitionInventory(products, 9, archived);

  assert.deepEqual(result.active.map((entry) => entry.id), products.slice(0, 9).map((entry) => entry.id));
  assert.deepEqual(result.overflow.map((entry) => entry.id), ["product-10", "product-11", "previously-archived"]);
  assert.equal(products.length, 11, "partitioning must not mutate the editor draft");
});
