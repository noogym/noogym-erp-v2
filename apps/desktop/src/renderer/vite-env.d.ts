/// <reference types="vite/client" />

interface Window {
  noogym?: {
    getVersion: () => Promise<string>;
    windowControls: {
      minimize: () => Promise<void>;
      maximize: () => Promise<void>;
      close: () => Promise<void>;
    };
    zoomControls?: {
      getZoomFactor: () => Promise<number>;
      setZoomFactor: (zoomFactor: number) => Promise<number>;
    };
    printer?: {
      list: () => Promise<Array<{ id: string; name: string; connectionType: string; isDefault?: boolean }>>;
      printTestPage: (config: unknown) => Promise<{ success: boolean; message: string; code?: string; error?: string }>;
      printReceipt: (data: unknown, config: unknown) => Promise<{ success: boolean; message: string; code?: string; error?: string }>;
      printQRCode: (data: unknown, config: unknown) => Promise<{ success: boolean; message: string; code?: string; error?: string }>;
      openCashDrawer: (config: unknown) => Promise<{ success: boolean; message: string; code?: string; error?: string }>;
    };
  };
}
