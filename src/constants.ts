export const MODULE_ID = "holosuite-vending-machines";
export const MODULE_TITLE = "HoloSuite Vending Machines";
export const SOCKET_NAME = `module.${MODULE_ID}`;

export const DEFAULT_MANUFACTURER_NAME = "HoloSuite";
export const DEFAULT_MACHINE_STYLE = "industrial";
export const MAX_MACHINE_PRODUCTS = 6;
export const MACHINE_STYLES = [
  {
    id: "industrial",
    label: "Alien Market",
    description: "A colorful off-world market terminal with armored bays and custom vendor hardware."
  },
  {
    id: "corporate-kiosk",
    label: "Executive Terminal",
    description: "A dark blue executive terminal with rounded cards and restrained cyan accents."
  },
  {
    id: "corporate-kiosk-white",
    label: "Corporate Kiosk",
    description: "A warm ivory corporate kiosk with restrained retro-future detailing."
  },
  {
    id: "neon",
    label: "Neon",
    description: "A black-violet market terminal charged with hot-pink neon and electric cyan details."
  }
] as const;

export const SETTINGS = {
  machines: "machines",
  currencyMode: "currencyMode",
  currencyPath: "currencyActorPath",
  currencyName: "currencyItemName",
  creditTransformer: "creditTransformer",
  audioEnabled: "audioEnabled",
  audioVolume: "audioVolume",
  audioSelect: "audioSelect",
  audioPurchase: "audioPurchase",
  audioDispense: "audioDispense",
  audioCollect: "audioCollect",
  audioFailure: "audioFailure",
  dispenses: "pendingDispenses",
  ledger: "transactionLedger"
};

export const DEFAULT_AUDIO_PATHS = {
  select: `modules/${MODULE_ID}/assets/sounds/vending_select.ogg`,
  purchase: `modules/${MODULE_ID}/assets/sounds/vending_purchase.ogg`,
  dispense: `modules/${MODULE_ID}/assets/sounds/vending_dispense.ogg`,
  collect: `modules/${MODULE_ID}/assets/sounds/vending_collect.ogg`,
  failure: `modules/${MODULE_ID}/assets/sounds/vending_failure.ogg`
};

export const TEMPLATES = {
  vending: `modules/${MODULE_ID}/templates/vending-app.hbs`,
  browser: `modules/${MODULE_ID}/templates/machine-browser.hbs`,
  manager: `modules/${MODULE_ID}/templates/machine-manager.hbs`,
  editor: `modules/${MODULE_ID}/templates/machine-edit.hbs`
};
