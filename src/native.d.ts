interface Window {
  PocketAndroid?: {
    ready?(): void;
    exportSave(text: string): void;
    importSave(): void;
    exitApp(): void;
  };
}
