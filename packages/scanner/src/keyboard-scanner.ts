import { classifyScanValue, normalizeScanValue } from "./classify";
import type {
  KeyboardScannerConfig,
  KeyboardScannerController,
  ScannerEvent,
} from "./types";

const defaultTerminatorKeys = ["Enter", "Tab"];

const isEditableElement = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target.isContentEditable
  );
};

export function createKeyboardScanner(
  config: KeyboardScannerConfig,
): KeyboardScannerController {
  let running = false;
  let buffer = "";
  let startedAt = 0;
  let lastKeyAt = 0;
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const minLength = config.minLength ?? 3;
  const maxInterKeyDelayMs = config.maxInterKeyDelayMs ?? 80;
  const maxAverageKeyDelayMs = config.maxAverageKeyDelayMs ?? 55;
  const resetDelayMs = config.resetDelayMs ?? 250;
  const terminatorKeys = config.terminatorKeys ?? defaultTerminatorKeys;
  const target = config.target ?? globalThis.document;

  const reset = () => {
    buffer = "";
    startedAt = 0;
    lastKeyAt = 0;
    if (timeout) clearTimeout(timeout);
    timeout = undefined;
  };

  const scheduleReset = () => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(reset, resetDelayMs);
  };

  const emit = (terminator?: string) => {
    const rawValue = buffer;
    const value = normalizeScanValue(rawValue);
    const durationMs = Math.max(0, lastKeyAt - startedAt);
    const averageDelay = value.length > 1 ? durationMs / Math.max(1, value.length - 1) : 0;
    const shouldEmit =
      value.length >= minLength &&
      (value.length <= 4 || averageDelay <= maxAverageKeyDelayMs);

    reset();

    if (!shouldEmit) return;

    const event: ScannerEvent = {
      value,
      rawValue,
      type: classifyScanValue(value),
      source: "keyboard-wedge",
      timestamp: Date.now(),
      durationMs,
      characterCount: value.length,
      terminator,
    };

    config.onScan(event);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.altKey || event.metaKey) return;

    if (config.ignoreEditableElements && isEditableElement(event.target)) {
      return;
    }

    const now = Date.now();
    if (lastKeyAt && now - lastKeyAt > maxInterKeyDelayMs) {
      reset();
    }

    if (terminatorKeys.includes(event.key)) {
      if (buffer && config.preventDefaultOnTerminator !== false) {
        event.preventDefault();
      }
      emit(event.key);
      return;
    }

    if (event.key.length !== 1) return;

    if (!buffer) startedAt = now;
    buffer += event.key;
    lastKeyAt = now;
    config.onPartialInput?.(buffer);
    scheduleReset();
  };

  return {
    start: () => {
      if (running || !target?.addEventListener) return;
      target.addEventListener("keydown", onKeyDown as EventListener, true);
      running = true;
    },
    stop: () => {
      if (!running || !target?.removeEventListener) return;
      target.removeEventListener("keydown", onKeyDown as EventListener, true);
      running = false;
      reset();
    },
    reset,
    isRunning: () => running,
  };
}
