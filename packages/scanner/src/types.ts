export type ScannerCodeType = "qr" | "barcode" | "unknown";

export type ScannerSource = "keyboard-wedge" | "manual" | "camera";

export interface ScannerEvent {
  value: string;
  rawValue: string;
  type: ScannerCodeType;
  source: ScannerSource;
  timestamp: number;
  durationMs: number;
  characterCount: number;
  terminator?: string;
}

export interface KeyboardScannerConfig {
  target?: Document | HTMLElement | Window;
  minLength?: number;
  maxInterKeyDelayMs?: number;
  maxAverageKeyDelayMs?: number;
  resetDelayMs?: number;
  terminatorKeys?: string[];
  preventDefaultOnTerminator?: boolean;
  ignoreEditableElements?: boolean;
  onScan: (event: ScannerEvent) => void;
  onPartialInput?: (value: string) => void;
}

export interface KeyboardScannerController {
  start: () => void;
  stop: () => void;
  reset: () => void;
  isRunning: () => boolean;
}
