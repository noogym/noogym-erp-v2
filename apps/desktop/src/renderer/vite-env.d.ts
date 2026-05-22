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
  };
}
