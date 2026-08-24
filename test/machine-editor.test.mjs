import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readProjectFile = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("moves presentation helper copy into accessible hover information", async () => {
  const template = await readProjectFile("templates/machine-edit.hbs");

  assert.doesNotMatch(template, /<small>Printed verbatim on the machine\.<\/small>/);
  assert.doesNotMatch(template, /<small>Used for scene listings and the machine's brand mark\.<\/small>/);
  assert.match(template, /hsv-field-info[^>]+title="Printed verbatim on the machine\."[^>]+aria-label="Printed verbatim on the machine\."/);
  assert.match(template, /hsv-field-info[^>]+title="Used for scene listings and the machine's brand mark\."[^>]+aria-label="Used for scene listings and the machine's brand mark\."/);
});

test("marks Credit Transformer as experimental in accessible hover information", async () => {
  const [template, language] = await Promise.all([
    readProjectFile("templates/machine-manager.hbs"),
    readProjectFile("lang/en.json")
  ]);
  const translations = JSON.parse(language);

  assert.match(template, /holosuite-vending-credit-transformer-row[\s\S]*hsv-field-info[^>]+ExperimentalHint[^>]+aria-label=[^>]+ExperimentalHint/);
  assert.match(translations["HOLOSUITEVENDING.Settings.CreditTransformer.ExperimentalHint"], /Experimental:[\s\S]*compatibility may vary[\s\S]*not yet been tested with every game system/i);
});

test("scrolls newly added, restored, and dropped products into view after rendering", async () => {
  const source = await readProjectFile("src/machine-manager-app.ts");

  assert.match(source, /renderAtEntry\(entryId: string\)[\s\S]*this\.pendingScrollEntryId = entryId;[\s\S]*this\.render\(false\);/);
  assert.match(source, /restorePendingEntryScroll\(html\)[\s\S]*requestAnimationFrame[\s\S]*scrollTop = container\.scrollHeight;[\s\S]*scrollIntoView/);
  assert.equal((source.match(/this\.renderAtEntry\(entry\.id\);/g) ?? []).length, 3);
  assert.match(source, /this\.restorePendingEntryScroll\(html\);\s*\n\s*\}/);
});

test("preserves the exact editor scroll position when products are reordered", async () => {
  const source = await readProjectFile("src/machine-manager-app.ts");

  assert.match(source, /renderPreservingScroll\(sourceElement: HTMLElement\)[\s\S]*form:\s*Number\(form\?\.scrollTop\)[\s\S]*windowContent:\s*Number\(windowContent\?\.scrollTop\)[\s\S]*this\.render\(false\);/);
  assert.match(source, /restorePendingEditorScroll\(html\)[\s\S]*form\.scrollTop = pending\.form;[\s\S]*windowContent\.scrollTop = pending\.windowContent;/);
  assert.equal((source.match(/this\.renderPreservingScroll\(event\.currentTarget\);/g) ?? []).length, 2);
  assert.match(source, /this\.restorePendingEditorScroll\(html\);\s*\n\s*this\.restorePendingEntryScroll\(html\);/);
});
