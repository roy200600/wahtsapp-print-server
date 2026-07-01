import { Service } from "winser";

const service = new Service({
  name: "WhatsAppPrintServer",
  description: "Print files received through WhatsApp",
  script: process.execPath,
  args: ["dist/main.js"]
});

service.install();
console.log("WhatsAppPrintServer service installed.");
