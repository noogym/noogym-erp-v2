interface Window {
  noogym?: {
    getVersion: () => Promise<string>;
    windowControls: {
      minimize: () => Promise<void>;
      maximize: () => Promise<void>;
      close: () => Promise<void>;
    };
  };
}
