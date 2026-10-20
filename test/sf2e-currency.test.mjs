import assert from "node:assert/strict";
import test from "node:test";

import {
  addSf2eCredits,
  getSf2eCurrencyProfile,
  removeSf2eCredits
} from "../src/sf2e-currency.mjs";

function createActor(credits = 0, removeResult = true) {
  const calls = [];
  return {
    calls,
    actor: {
      inventory: {
        currency: { credits },
        async removeCurrency(value) {
          calls.push(["remove", value]);
          return removeResult;
        },
        async addCurrency(value) {
          calls.push(["add", value]);
        }
      }
    }
  };
}

test("reads SF2e credits from the native actor inventory currency profile", () => {
  const { actor } = createActor(275);

  assert.deepEqual(getSf2eCurrencyProfile(actor, "sf2e"), {
    value: 275,
    label: "Credits"
  });
  assert.equal(getSf2eCurrencyProfile(actor, "pf2e"), null);
});

test("requires the native SF2e currency mutation API", () => {
  const actor = { inventory: { currency: { credits: 50 } } };

  assert.equal(getSf2eCurrencyProfile(actor, "sf2e"), null);
  assert.equal(getSf2eCurrencyProfile(null, "sf2e"), null);
});

test("uses SF2e inventory methods to debit and restore credstick value", async () => {
  const { actor, calls } = createActor(275);

  assert.equal(await removeSf2eCredits(actor, 40), true);
  await addSf2eCredits(actor, 40);

  assert.deepEqual(calls, [
    ["remove", { credits: 40 }],
    ["add", { credits: 40 }]
  ]);
});

test("preserves a failed native debit result for the purchase service", async () => {
  const { actor, calls } = createActor(10, false);

  assert.equal(await removeSf2eCredits(actor, 20), false);
  assert.deepEqual(calls, [["remove", { credits: 20 }]]);
});
