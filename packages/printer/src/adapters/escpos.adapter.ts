import type { QRCodePrintData } from "../types";
import { sanitizeText } from "../utils/sanitize-text";

const encoder = new TextEncoder();

const ESC = 0x1b;
const GS = 0x1d;

function bytesFromText(value: string) {
  return Array.from(encoder.encode(sanitizeText(value)));
}

function qrCorrectionLevel(level: QRCodePrintData["correctionLevel"]) {
  switch (level) {
    case "L":
      return 48;
    case "Q":
      return 50;
    case "H":
      return 51;
    case "M":
    default:
      return 49;
  }
}

export class EscPosBuilder {
  private chunks: number[] = [];

  initialize() {
    this.chunks.push(ESC, 0x40);
    return this;
  }

  align(value: "left" | "center" | "right") {
    const mode = value === "center" ? 1 : value === "right" ? 2 : 0;
    this.chunks.push(ESC, 0x61, mode);
    return this;
  }

  bold(enabled = true) {
    this.chunks.push(ESC, 0x45, enabled ? 1 : 0);
    return this;
  }

  size(width = 1, height = 1) {
    const widthValue = Math.max(1, Math.min(width, 8)) - 1;
    const heightValue = Math.max(1, Math.min(height, 8)) - 1;
    this.chunks.push(GS, 0x21, (widthValue << 4) | heightValue);
    return this;
  }

  text(value: string) {
    this.chunks.push(...bytesFromText(value));
    return this;
  }

  line(value = "") {
    this.text(value);
    this.chunks.push(0x0a);
    return this;
  }

  feed(lines = 1) {
    for (let index = 0; index < lines; index += 1) this.chunks.push(0x0a);
    return this;
  }

  separator(width: number) {
    return this.line("-".repeat(width));
  }

  qrCode(data: QRCodePrintData) {
    const value = sanitizeText(data.value);
    if (!value) return this;

    const payload = encoder.encode(value);
    const length = payload.length + 3;
    const pL = length % 256;
    const pH = Math.floor(length / 256);
    const size = Math.max(1, Math.min(data.size ?? 6, 16));

    this.chunks.push(GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);
    this.chunks.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, size);
    this.chunks.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, qrCorrectionLevel(data.correctionLevel));
    this.chunks.push(GS, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30, ...Array.from(payload));
    this.chunks.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30);
    return this;
  }

  cashDrawer(pin: 0 | 1 = 0, onTimeMs = 50, offTimeMs = 250) {
    this.chunks.push(ESC, 0x70, pin, Math.round(onTimeMs / 2), Math.round(offTimeMs / 2));
    return this;
  }

  cut(partial = true) {
    this.chunks.push(GS, 0x56, partial ? 0x42 : 0x00, 0x00);
    return this;
  }

  raw(bytes: number[]) {
    this.chunks.push(...bytes);
    return this;
  }

  build() {
    return Uint8Array.from(this.chunks);
  }
}
