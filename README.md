# HoloSuite Vending Machines

A free HoloSuite module for Foundry VTT v12-v14. GMs can configure vending machines, link them to Scene Regions, and let players buy limited-stock items using an inventory currency item such as Credits.

## Features

- Machine manager with duplication, JSON import/export, bulk restocking, and live online/offline controls.
- Drag-and-drop stocking from world Items, compendiums, or actor sheets.
- Quantity selection and multi-product carts with a single confirmed checkout.
- Serialized GM-authoritative purchases with duplicate-request protection and compensating rollback.
- Persistent success/failure transaction ledger with JSON export.
- Terminal-style linked Regions that prompt a player when their token enters.
- Linked-Region presence enforcement, enabled by default for new machines.
- Player HoloSuite launcher access is disabled by default and can be enabled by a GM in module settings.
- Online, offline, and automatically derived sold-out states.
- Per-machine manufacturer branding and four machine styles (Alien Market, Neon, Executive Terminal, or Corporate Kiosk).
- Draft-safe machine editing with six physical product slots, slot reordering, and live style previews.
- Persisted dispense reservations: stock and payment are authorized first, while items transfer on tray collection or timeout.
- Automatic synchronization of `tokenEnter` Region Behaviors for every linked machine.
- System-agnostic item currency and quantity detection.

## Player flow

GMs create Regions with Foundry's Region tools and select them in each machine's editor. When a player's token enters a linked Region, the module prompts that player to open the machine. The player can then add products to a cart and confirm checkout. A connected GM validates actor ownership, Region access, stock, and currency before applying the purchase.

The player window is presented as a physical vending machine: a fixed compartment matrix, product control terminal, telemetry header, dispense queue, and retrieval bay. Active Alien Market and Neon decorative SVGs live in `assets/vendor/`; see `assets/vendor/README.md` for replacement sizes. Earlier art-source references remain in `assets/ui/`. Runtime labels and controls intentionally remain HTML/CSS.

## Release history

See [CHANGELOG.md](CHANGELOG.md) for release notes.

## License

HoloSuite Vending Machines is released under the GNU General Public License v3.0 or later. See [LICENSE](LICENSE).

## Public API

```js
game.holosuiteVending.openMachine(machineId, actor, { source, sceneId, regionId, tokenId });
game.holosuiteVending.promptMachineAccess(machineId, { actor, context });
game.holosuiteVending.getMachines();
game.holosuiteVending.getLedger();
game.holosuiteVending.restockMachine(machineId);
game.holosuiteVending.exportMachines();
game.holosuiteVending.syncRegionLinks();
```

## Development

```sh
npm install
npm test
npm run build
```

The package is self-contained; its Foundry compatibility helpers live under `src/` and are bundled into `dist/main.js`.
