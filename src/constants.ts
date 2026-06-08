export const MODULE_ID = "holosuite-vending-machines";
export const MODULE_TITLE = "HoloSuite Vending Machines";
export const MACHINE_FLAG = "machineId";
export const SOCKET_NAME = `module.${MODULE_ID}`;

export const SETTINGS = {
  machines: "machines",
  currencyName: "currencyItemName"
};

export const TEMPLATES = {
  vending: `modules/${MODULE_ID}/templates/vending-app.hbs`,
  browser: `modules/${MODULE_ID}/templates/machine-browser.hbs`,
  manager: `modules/${MODULE_ID}/templates/machine-manager.hbs`,
  editor: `modules/${MODULE_ID}/templates/machine-edit.hbs`
};
