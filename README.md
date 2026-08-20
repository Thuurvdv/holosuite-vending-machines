# HoloSuite Vending Machines

A free HoloSuite module for Foundry VTT v12-v14. GMs can configure vending machines, link them to Scene Regions, and let players buy limited-stock items using an inventory currency item such as Credits.

## Features

- Machine manager with duplication, JSON import/export, bulk restocking, and live online/offline controls.
- Drag-and-drop stocking from world Items, compendiums, or actor sheets.
- Quantity selection and multi-product carts with a single confirmed checkout.
- Serialized GM-authoritative purchases with duplicate-request protection and compensating rollback.
- Persistent success/failure transaction ledger with JSON export.
- Terminal-style linked Regions that prompt a player when their token enters.
- Optional Region-presence/proximity and required-item access rules.
- Online, offline, and automatically derived sold-out states with optional state-specific tile art.
- Per-machine manufacturer branding and structural machine styles (Industrial Chassis or Corporate Kiosk).
- Draft-safe machine editing with nine physical product slots, slot reordering, and live style previews.
- Persisted dispense reservations: stock and payment are authorized first, while items transfer on tray collection or timeout.
- Automatic synchronization of `tokenEnter` Region Behaviors for every linked machine.
- System-agnostic item currency and quantity detection.

Existing version-1 and version-2 machine data and tile flags are normalized automatically when loaded.

## Player flow

GMs create Regions with Foundry's Region tools and select them in each machine's editor. When a player's token enters a linked Region, the module prompts that player to open the machine. The player can then add products to a cart and confirm checkout. A connected GM validates actor ownership, Region access, stock, and currency before applying the purchase.

The player window is presented as a physical vending machine: a fixed compartment matrix, product control terminal, telemetry header, dispense queue, and retrieval bay. Its decorative SVGs live in `assets/ui/`; see `assets/ui/README.md` for Photoshop master sizes and the filename-stable replacement workflow. Runtime labels and controls intentionally remain HTML/CSS.

Legacy tile flags remain readable so existing worlds do not lose access, but new machine placement is Region-based.

## Public API

```js
game.holosuiteVending.openMachine(machineId, actor, { source, sceneId, regionId, tokenId });
game.holosuiteVending.promptMachineAccess(machineId, { actor, context });
game.holosuiteVending.attachMachineToTile(tile, machineId);
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
