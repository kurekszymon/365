export interface IElectronAPI {
  sendMessage: (data: any) => void;
  onMessage: (callback: (data: any) => void) => void;
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