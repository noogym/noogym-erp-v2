/// <reference types="vite/client" />

interface Window {
  noogym?: {
    getVersion: () => Promise<string>;
  };
}
