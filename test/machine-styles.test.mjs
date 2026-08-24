import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readProjectFile = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("offers Alien Market, Neon, Executive Terminal, and Corporate Kiosk styles", async () => {
  const [constants, app, template, previewStyles] = await Promise.all([
    readProjectFile("src/constants.ts"),
    readProjectFile("src/vending-app.ts"),
    readProjectFile("templates/vending-app.hbs"),
    readProjectFile("styles/vending.css")
  ]);

  assert.match(constants, /id: "industrial",\s*label: "Alien Market"/s);
  assert.match(constants, /id: "corporate-kiosk",\s*label: "Executive Terminal"/s);
  assert.match(constants, /id: "corporate-kiosk-white",\s*label: "Corporate Kiosk"/s);
  assert.match(constants, /id: "neon",\s*label: "Neon"/s);
  assert.match(app, /machineStyleId === "corporate-kiosk-white"[\s\S]+\? "corporate-kiosk"[\s\S]+machineStyleId === "neon"[\s\S]+\? "industrial"/);
  assert.match(template, /data-machine-style="\{\{machineStyleBaseId\}\}" data-machine-style-variant="\{\{machineStyleId\}\}"/);
  assert.match(previewStyles, /\.hsv-style-preview\[data-machine-style="corporate-kiosk-white"\]/);
  assert.match(previewStyles, /\.hsv-style-preview\[data-machine-style="neon"\]/);
});

test("defines Neon as a color-only Alien Market derivative", async () => {
  const styles = await readProjectFile("styles/vending-machine-styles.css");

  assert.match(styles, /\[data-machine-style-variant="neon"\]\s*\{[^}]*--vendor-cyan:\s*#ff2bc7;[^}]*--hs-color-primary:\s*#ff2bc7;/s);
  assert.match(styles, /\[data-machine-style-variant="neon"\] \.hsv-machine-chassis\s*\{[^}]*var\(--hsv-asset-shell\)/s);
  assert.match(styles, /\[data-machine-style-variant="neon"\] \.hsv-status-frame-art,[^}]+\.hsv-slot-frame-art,[^}]+\.hsv-product-display-frame-art,[^}]+\.hsv-retrieval-frame-art\s*\{[^}]*filter:[^}]*sepia\(0\.48\)[^}]*hue-rotate\(255deg\)[^}]*drop-shadow/s);
  assert.doesNotMatch(styles, /\[data-machine-style-variant="neon"\] \.(?:hsv-caution-plate|hsv-thanks-plate)[^{]*\{[^}]*filter:/s);
  assert.match(styles, /\[data-machine-style-variant="neon"\][^}]+\.hsv-dispense-button:disabled\s*\{[^}]*background:\s*linear-gradient\(180deg, #ff43ce 0%, #d20da7 58%, #85086d 100%\) !important;/s);
  assert.doesNotMatch(styles, /\[data-machine-style-variant="neon"\][^{]*\{[^}]*(?:grid-template|inset:|width:|height:|padding:|margin:)/s);
});

test("keeps kiosk checkout actions visible while only cart lines scroll", async () => {
  const styles = await readProjectFile("styles/vending-machine-styles.css");

  assert.match(styles, /\[data-machine-style="corporate-kiosk"\] \.hsv-control-terminal\s*\{[^}]*grid-template-rows:\s*40px auto minmax\(0, 1fr\);[^}]*overflow:\s*hidden;/s);
  assert.match(styles, /\[data-machine-style="corporate-kiosk"\] \.hsv-dispense-queue\s*\{[^}]*grid-template-rows:\s*minmax\(52px, 1fr\) auto;[^}]*overflow:\s*hidden;/s);
  assert.match(styles, /\[data-machine-style="corporate-kiosk"\] \.hsv-queue-lines\s*\{[^}]*min-height:\s*0;[^}]*max-height:\s*none;[^}]*overflow-y:\s*auto;/s);
  assert.match(styles, /\[data-machine-style="corporate-kiosk"\] \.hsv-transaction-footer\s*\{[^}]*align-self:\s*end;/s);
  assert.match(styles, /\[data-machine-style="corporate-kiosk"\] \.hsv-credit-lock\s*\{[^}]*display:\s*none;/s);
});

test("defines a light Corporate Kiosk palette over the executive layout", async () => {
  const styles = await readProjectFile("styles/vending-machine-styles.css");

  assert.match(styles, /\[data-machine-style-variant="corporate-kiosk-white"\]\s*\{[^}]*--hsv-kiosk-panel:\s*rgba\(242, 236, 224, 0\.99\);[^}]*--hs-text-primary:\s*#342f29;/s);
  assert.match(styles, /\[data-machine-style-variant="corporate-kiosk-white"\] \.hsv-machine-chassis\s*\{[^}]*linear-gradient\(135deg, #f9f4ea/s);
  assert.match(styles, /\[data-machine-style-variant="corporate-kiosk-white"\] \.hsv-product-chamber,[^}]+\.hsv-control-terminal\s*\{[^}]*background-color:\s*#eee7da;/s);
  assert.match(styles, /\[data-machine-style-variant="corporate-kiosk-white"\] \.hsv-slot-viewport\s*\{[^}]*linear-gradient\(180deg, #dedfd9, #bdc0bd 76%\);/s);
  assert.match(styles, /\[data-machine-style-variant="corporate-kiosk-white"\] \.hsv-product-console \.hsv-preview-image\s*\{[^}]*linear-gradient\(180deg, #dedfd9, #bfc2bf\);/s);
  assert.match(styles, /\[data-machine-style-variant="corporate-kiosk-white"\][^}]+\.hsv-dispense-button:disabled\s*\{[^}]*background:\s*linear-gradient\(180deg, #b8724e, #8f4d31\) !important;/s);
});

test("uses the six-slot capacity to stretch both kiosk inventories into two rows", async () => {
  const constants = await readProjectFile("src/constants.ts");
  const styles = await readProjectFile("styles/vending-machine-styles.css");

  assert.match(constants, /MAX_MACHINE_PRODUCTS = 6/);
  assert.match(styles, /\[data-machine-style="corporate-kiosk"\] \.hsv-slot-grid\s*\{[^}]*grid-template-rows:\s*repeat\(2, minmax\(0, 1fr\)\);[^}]*overflow-y:\s*hidden;/s);
  assert.match(styles, /\[data-machine-style="corporate-kiosk"\] \.hsv-product-slot\s*\{[^}]*height:\s*100%;[^}]*aspect-ratio:\s*auto;/s);
});
