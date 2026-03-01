export interface IElectronAPI {
  sendMessage: (data: unknown) => void;
  onMessage: (callback: (data: unknown) => void) => void;
}

declare global {
  interface Window {
    versions: {
      node: () => string;
      chrome: () => string;
      electron: () => string;
      ping: () => Promise<string>;
    };
    electronAPI: IElectronAPI;
  }
}
