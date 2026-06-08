import { MODULE_ID, TEMPLATES } from "./constants.js";
import { MachineStore } from "./machine-store.js";
import { PurchaseService } from "./purchase-service.js";

const openApps = new Set<VendingApp>();

function getDefaultActor(actor) {
  if (actor) return actor;
  if (canvas?.tokens?.controlled?.[0]?.actor) return canvas.tokens.controlled[0].actor;
  return game.user.character ?? null;
}

export class VendingApp extends Application {
  machineId: string;
  actor: any;
  selectedEntryId: string | null;

  constructor(machineId: string, options: any = {}) {
    super(options);
    this.machineId = machineId;
    this.actor = getDefaultActor(options.actor);
    this.selectedEntryId = options.selectedEntryId ?? null;
    (this as any).options.id = `holosuite-vending-machine-${machineId}`;
    openApps.add(this);
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "holosuite-vending-machine",
      classes: ["holosuite-vending-window", "holosuite-vending-app"],
      template: TEMPLATES.vending,
      width: 720,
      height: 900,
      resizable: true,
      title: "HoloSuite Vending Machine"
    });
  }

  get title() {
    return MachineStore.getMachine(this.machineId)?.name ?? "HoloSuite Vending Machine";
  }

  async close(options) {
    openApps.delete(this);
    return super.close(options);
  }

  get machine() {
    return MachineStore.getMachine(this.machineId);
  }

  async getData() {
    const machine = this.machine;
    const entries = machine?.inventory ?? [];
    if (!this.selectedEntryId && entries.length) this.selectedEntryId = entries[0].id;
    const selected = entries.find((entry) => entry.id === this.selectedEntryId) ?? entries[0] ?? null;

    return {
      machine,
      entries: entries.map((entry) => ({
        ...entry,
        selected: selected?.id === entry.id,
        soldOut: entry.stock <= 0
      })),
      selected,
      selectedSoldOut: !selected || selected.stock <= 0,
      actorName: this.actor?.name ?? "",
      currencyName: MachineStore.getCurrencyName()
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find("[data-action='select-entry']").on("click", (event) => {
      this.selectedEntryId = event.currentTarget.dataset.entryId;
      this.render(false);
    });

    html.find("[data-action='buy']").on("click", async () => {
      if (!this.actor) {
        ui.notifications.warn(game.i18n.localize("HOLOSUITEVENDING.Notifications.NoActor"));
        return;
      }

      const entryId = this.selectedEntryId;
      if (!entryId) return;
      await PurchaseService.requestPurchase({ machineId: this.machineId, entryId, actor: this.actor });
    });
  }

  static refreshMachine(machineId) {
    for (const app of openApps) {
      if (app.machineId === machineId) app.render(false);
    }
  }

  static refreshAll() {
    for (const app of openApps) app.render(false);
  }
}
