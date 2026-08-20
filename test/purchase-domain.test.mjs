import assert from "node:assert/strict";
import test from "node:test";

import {
  allocateCurrencyRemainder,
  calculateCurrencyTotal,
  getCollectionDecision,
  getCurrencyMultiplier,
  getDispenseDelay
} from "../src/purchase-domain.mjs";

test("converts standard D&D denominations into a GP-equivalent total", () => {
  const entries = [
    { key: "cp", amount: 5 },
    { key: "sp", amount: 4 },
    { key: "ep", amount: 1 },
    { key: "gp", amount: 3 },
    { key: "pp", amount: 2 }
  ];

  assert.equal(getCurrencyMultiplier("cp"), 0.01);
  assert.equal(getCurrencyMultiplier("pp"), 10);
  assert.equal(calculateCurrencyTotal(entries), 23.95);
});

test("deducts a price across D&D denominations without creating or losing value", () => {
  const entries = [
    { key: "cp", path: "system.currency.cp", amount: 5 },
    { key: "sp", path: "system.currency.sp", amount: 4 },
    { key: "ep", path: "system.currency.ep", amount: 1 },
    { key: "gp", path: "system.currency.gp", amount: 3 },
    { key: "pp", path: "system.currency.pp", amount: 2 }
  ];
  const result = allocateCurrencyRemainder(entries, 3.47);

  assert.equal(result.totalBefore, 23.95);
  assert.equal(result.totalAfter, 20.48);
  assert.deepEqual(result.updates, {
    "system.currency.pp": 2,
    "system.currency.gp": 0,
    "system.currency.ep": 0,
    "system.currency.sp": 4,
    "system.currency.cp": 8
  });
});

test("preserves fractional values for systems with one numeric currency field", () => {
  const entries = [{ key: "wealth", path: "system.wealth", amount: 1 }];
  const result = allocateCurrencyRemainder(entries, 0.1);

  assert.deepEqual(result.updates, { "system.wealth": 0.9 });
  assert.equal(result.totalAfter, 0.9);
});

test("uses the smallest available field for exact system-agnostic change", () => {
  const entries = [
    { key: "gp", path: "system.currency.gp", amount: 1 },
    { key: "sp", path: "system.currency.sp", amount: 0 }
  ];
  const result = allocateCurrencyRemainder(entries, 0.05);

  assert.deepEqual(result.updates, {
    "system.currency.gp": 0,
    "system.currency.sp": 9.5
  });
  assert.equal(result.totalAfter, 0.95);
});

test("authorizes only the purchaser or a GM to collect a pending item", () => {
  const reservation = { userId: "buyer", status: "pending" };

  assert.equal(getCollectionDecision(reservation, { id: "buyer", isGM: false }), "deliver");
  assert.equal(getCollectionDecision(reservation, { id: "intruder", isGM: false }), "forbidden");
  assert.equal(getCollectionDecision(reservation, { id: "gm", isGM: true }), "deliver");
  assert.equal(getCollectionDecision(reservation, null), "deliver", "the responsible GM's timeout has no player user");
});

test("treats completed collection as idempotent and rejects concurrent delivery", () => {
  assert.equal(getCollectionDecision(null, { id: "buyer", isGM: false }), "missing");
  assert.equal(getCollectionDecision({ userId: "buyer", status: "delivering" }, { id: "buyer", isGM: false }), "busy");
});

test("schedules future collection and immediately recovers overdue reservations", () => {
  assert.equal(getDispenseDelay(12_000, 10_000), 2_000);
  assert.equal(getDispenseDelay(8_000, 10_000), 0);
});
