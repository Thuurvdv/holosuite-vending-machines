# HoloSuite Vending Machines

A free HoloSuite module for Foundry VTT v12/v13. GMs can configure vending machines, attach them to Scene Tiles, and players can buy limited-stock items with an inventory currency item such as Credits.

## MVP behavior

- Machines are stored in a hidden world setting.
- Tile attachments are stored on Tile document flags under `holosuite-vending-machines.machineId`.
- Player purchases are routed through the module socket to an active GM for validation and stock updates.
- Currency is system-agnostic and represented by an Item in the actor inventory.

## Public API

```js
game.holosuiteVending.openMachine(machineId, actor);
game.holosuiteVending.attachMachineToTile(tile, machineId);
game.holosuiteVending.getMachines();
```

