import { Service } from "winser";

const service = new Service({
  name: "WhatsAppPrintServer",
  script: process.execPath,
  args: ["dist/main.js"]
});

service.uninstall();
console.log("WhatsAppPrintServer service removed.");
