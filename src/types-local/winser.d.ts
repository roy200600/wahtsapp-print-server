declare module "winser" {
  export class Service {
    constructor(options: {
      name: string;
      description?: string;
      script: string;
      args?: string[];
    });
    install(): void;
    uninstall(): void;
  }
}
