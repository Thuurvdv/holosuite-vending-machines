import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

const projectUrl = new URL("../", import.meta.url);
const readProjectFile = (path) => readFile(new URL(path, projectUrl), "utf8");

async function collectFiles(directory) {
  const files = [];
  for (const entry of await readdir(new URL(`${directory}/`, projectUrl), { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) files.push(...await collectFiles(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

test("keeps package and Foundry release metadata aligned", async () => {
  const [packageData, lockData, moduleData] = await Promise.all([
    readProjectFile("package.json").then(JSON.parse),
    readProjectFile("package-lock.json").then(JSON.parse),
    readProjectFile("module.json").then(JSON.parse)
  ]);

  assert.equal(packageData.version, moduleData.version);
  assert.equal(lockData.version, moduleData.version);
  assert.equal(lockData.packages[""].version, moduleData.version);
  assert.equal(moduleData.version, "1.5.1");
  assert.equal(moduleData.compatibility.minimum, "12");
  assert.equal(moduleData.compatibility.verified, "14");
  assert.equal(
    moduleData.download,
    `https://github.com/Thuurvdv/holosuite-vending-machines/releases/download/v${moduleData.version}/holosuite-vending-machines-v${moduleData.version}.zip`
  );
});

test("release workflow follows the proven HoloSuite release contract", async () => {
  const workflow = await readProjectFile(".github/workflows/release.yml");

  assert.match(workflow, /node-version:\s*22/);
  assert.match(workflow, /run:\s*npm ci/);
  assert.match(workflow, /Build module[\s\S]*npm run build[\s\S]*Test module[\s\S]*npm test/);
  assert.match(workflow, /Tag version \(\$VERSION\) does not match module\.json version/);
  assert.match(workflow, /MANIFEST_URL="https:\/\/github\.com\/\$REPO\/releases\/latest\/download\/module\.json"/);
  assert.match(workflow, /DOWNLOAD_URL="https:\/\/github\.com\/\$REPO\/releases\/download\/\$TAG\/\$ZIP_NAME"/);
  assert.match(workflow, /zip -r "\$ZIP_NAME" "\$MODULE_ID"/);
  assert.match(workflow, /Verify packaged files and metadata/);
  assert.match(workflow, /gh release create[\s\S]*module\.json[\s\S]*--generate-notes/);
  assert.doesNotMatch(workflow, /run:\s*npm install/);
});

test("all manifest runtime files exist in the release tree", async () => {
  const moduleData = JSON.parse(await readProjectFile("module.json"));
  const runtimeFiles = [
    ...moduleData.esmodules,
    ...moduleData.styles,
    ...moduleData.languages.map((language) => language.path),
    "templates/vending-app.hbs",
    "templates/machine-browser.hbs",
    "templates/machine-manager.hbs",
    "templates/machine-edit.hbs"
  ];

  await Promise.all(runtimeFiles.map((path) => access(new URL(path, projectUrl))));
});

test("ships the GPL license declared by the module manifest", async () => {
  const [moduleData, license, workflow] = await Promise.all([
    readProjectFile("module.json").then(JSON.parse),
    readProjectFile("LICENSE"),
    readProjectFile(".github/workflows/release.yml")
  ]);

  assert.equal(moduleData.license, "GPL-3.0-or-later");
  assert.match(license, /GNU GENERAL PUBLIC LICENSE/);
  assert.match(license, /Version 3, 29 June 2007/);
  assert.match(workflow, /"\$MODULE_ID\/LICENSE"/);
});

test("documents and packages the provenance of every shipped SVG and OGG asset", async () => {
  const [attribution, workflow] = await Promise.all([
    readProjectFile("ATTRIBUTION.md"),
    readProjectFile(".github/workflows/release.yml")
  ]);
  const assetFiles = (await collectFiles("assets"))
    .filter((path) => /\.(?:svg|ogg)$/i.test(path));

  assert.match(attribution, /original works created by Mage Tower Studios/);
  assert.match(attribution, /GPL-3\.0-or-later/);
  for (const path of assetFiles) {
    assert.match(attribution, new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(workflow, /README\.md CHANGELOG\.md LICENSE ATTRIBUTION\.md/);
  assert.match(workflow, /"\$MODULE_ID\/ATTRIBUTION\.md"/);
});

test("shipped interface text contains no en or em dashes", async () => {
  const roots = ["src", "templates", "lang", "styles"];
  const files = (await Promise.all(roots.map(collectFiles))).flat();

  for (const path of files) {
    const content = await readProjectFile(path);
    assert.doesNotMatch(content, /[\u2013\u2014]/, `${path} contains a long dash`);
  }
});
