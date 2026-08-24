import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const templateUrl = new URL("../templates/vending-app.hbs", import.meta.url);
const stylesUrl = new URL("../styles/vending-machine-styles.css", import.meta.url);

test("renders industrial frame SVGs as independent image layers", async () => {
  const [template, styles] = await Promise.all([
    readFile(templateUrl, "utf8"),
    readFile(stylesUrl, "utf8")
  ]);

  assert.match(template, /<svg class="hsv-status-frame-art"[^>]+preserveAspectRatio="none"[^>]*>[\s\S]*?<image[^>]+machine-header-frame\.svg\?v=[^>]+preserveAspectRatio="none"/);
  assert.equal((template.match(/class="hsv-slot-frame-art"/g) ?? []).length, 2);
  assert.match(template, /<svg class="hsv-slot-frame-art"[^>]+preserveAspectRatio="none"[^>]*>[\s\S]*?<image[^>]+slot-frame\.svg\?v=[^>]+preserveAspectRatio="none"/);
  assert.match(template, /<svg class="hsv-product-display-frame-art"[^>]+preserveAspectRatio="none"[^>]*>[\s\S]*?<image[^>]+product-display-frame\.svg\?v=[^>]+preserveAspectRatio="none"/);
  assert.match(template, /class="hsv-preview-product-art"[^>]+src="\{\{selected\.image\}\}"/);
  assert.match(template, /<svg class="hsv-retrieval-frame-art"[^>]+preserveAspectRatio="none"[^>]*>[\s\S]*?<image[^>]+retrieval-bay\.svg\?v=[^>]+preserveAspectRatio="none"/);

  assert.match(styles, /\.hsv-status-frame-art\s*\{[^}]*inset:\s*-3px;[^}]*width:\s*calc\(100% \+ 6px\)\s*!important;/s);
  assert.match(styles, /\.hsv-slot-frame-art\s*\{[^}]*position:\s*absolute;[^}]*width:\s*100%\s*!important;/s);
  assert.match(styles, /\.hsv-product-display-frame-art\s*\{[^}]*inset:\s*-1px;[^}]*height:\s*calc\(100% \+ 2px\)\s*!important;/s);
  assert.match(styles, /\.hsv-preview-product-art\s*\{[^}]*border:\s*0 !important;/s);
  assert.match(styles, /\.hsv-retrieval-frame-art\s*\{[^}]*inset:\s*-3px;[^}]*width:\s*calc\(100% \+ 6px\)\s*!important;/s);
  assert.match(styles, /\.hsv-status-module\s*\{[^}]*width:\s*calc\(100% \+ 60px\);[^}]*margin-left:\s*-30px;/s);
});

test("allows replacement SVGs to stretch without modifying their source metadata", async () => {
  const template = await readFile(templateUrl, "utf8");

  assert.equal((template.match(/<svg class="hsv-(?:status|slot|product-display|retrieval)-frame-art"/g) ?? []).length, 5);
  assert.equal((template.match(/<image href="modules\/holosuite-vending-machines\/assets\/vendor\//g) ?? []).length, 5);
  assert.equal((template.match(/preserveAspectRatio="none"/g) ?? []).length, 10);
});

test("keeps an empty terminal header spacer and sizes its action buttons", async () => {
  const [template, styles] = await Promise.all([
    readFile(templateUrl, "utf8"),
    readFile(stylesUrl, "utf8")
  ]);

  assert.match(template, /<div class="hsv-terminal-header" aria-hidden="true"><\/div>/);
  assert.doesNotMatch(template, /HOLOSUITEVENDING\.Player\.AutomatedTerminal<\/strong>/);
  assert.match(styles, /\.hsv-terminal-actions \.hsv-clear-button,[^}]+\.hsv-terminal-actions \.hsv-dispense-button\s*\{[^}]*height:\s*36px !important;[^}]*min-height:\s*36px !important;[^}]*max-height:\s*36px !important;/s);
  assert.match(styles, /\.hsv-terminal-actions \.hsv-dispense-button\s*\{\s*margin-left:\s*5px;/s);
});

test("applies the neutral industrial detail pass without decorative LEDs", async () => {
  const [template, styles, tokens] = await Promise.all([
    readFile(templateUrl, "utf8"),
    readFile(stylesUrl, "utf8"),
    readFile(new URL("../styles/vending.css", import.meta.url), "utf8")
  ]);

  assert.match(template, /<div class="hsv-machine-service-rail hsv-machine-service-rail-right" aria-hidden="true"><\/div>/);
  assert.match(tokens, /--hsv-asset-vent:\s*none;/);
  assert.match(tokens, /--hsv-asset-service-panel:\s*none;/);
  assert.match(styles, /\.hsv-status-frame-art\s*\{[^}]*filter:\s*brightness\(0\.78\)/s);
  assert.match(styles, /\.hsv-control-terminal\s*\{[^}]*border-color:\s*#596970;[^}]*#75838a/s);
  assert.match(styles, /\.hsv-control-terminal::after\s*\{[^}]*display:\s*none;[^}]*content:\s*none;/s);
  assert.match(styles, /\.hsv-dispense-button,[^}]+\.hsv-dispense-button:disabled\s*\{[^}]*border-radius:\s*999px !important;[^}]*clip-path:\s*none !important;/s);
});

test("uses the shared Alien Market cyan throughout the header", async () => {
  const [template, styles, manager, store, domain] = await Promise.all([
    readFile(new URL("../templates/machine-edit.hbs", import.meta.url), "utf8"),
    readFile(stylesUrl, "utf8"),
    readFile(new URL("../src/machine-manager-app.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/machine-store.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/vending-domain.mjs", import.meta.url), "utf8")
  ]);

  assert.doesNotMatch(template, /machine\.(?:offlineImage|soldOutImage)/);
  assert.doesNotMatch(manager, /formData\.machine\?\.(?:offlineImage|soldOutImage)/);
  assert.doesNotMatch(store, /(?:offlineImage|soldOutImage):/);
  assert.doesNotMatch(domain, /machine\?\.(?:offlineImage|soldOutImage)/);
  assert.match(styles, /\.hsv-brand-block\s*\{[^}]*border:\s*2px solid var\(--vendor-cyan\);/s);
  assert.match(styles, /\.hsv-brand-block strong\s*\{[^}]*color:\s*var\(--vendor-cyan\);/s);
  assert.match(styles, /\.hsv-identity-block h2\s*\{[^}]*color:\s*var\(--vendor-cyan\);/s);
  assert.match(styles, /\.hsv-telemetry span\s*\{\s*color:\s*var\(--vendor-cyan\);\s*\}/s);
});

test("keeps checkout controls inside the terminal artwork safe area", async () => {
  const [template, styles, language] = await Promise.all([
    readFile(templateUrl, "utf8"),
    readFile(stylesUrl, "utf8"),
    readFile(new URL("../lang/en.json", import.meta.url), "utf8")
  ]);

  assert.doesNotMatch(template, /<header><div><h3>\{\{localize "HOLOSUITEVENDING\.Player\.DispenseQueue"/);
  assert.match(template, /\{\{localize "HOLOSUITEVENDING\.Player\.Buy"\}\}/);
  assert.doesNotMatch(template, /fa-cube\{\{\/if\}\}/);
  assert.equal(JSON.parse(language)["HOLOSUITEVENDING.Player.Buy"], "Buy");
  assert.match(styles, /\.hsv-dispense-queue\s*\{[^}]*grid-template-rows:\s*minmax\(56px, 1fr\) auto;[^}]*padding:\s*var\(--vendor-space-2\) 0 42px;/s);
  assert.match(styles, /\.hsv-terminal-actions\s*\{[^}]*padding-right:\s*10px;[^}]*padding-left:\s*10px;/s);
  assert.match(styles, /\.hsv-status-module::before\s*\{[^}]*border:\s*3px solid #172126;[^}]*inset 0 0 0 1px #7b898f/s);
});
