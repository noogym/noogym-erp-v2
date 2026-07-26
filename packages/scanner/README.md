# @noogym/scanner

Utilities for barcode and QR scanners that work as USB keyboard-wedge devices.

Most handheld USB scanners type the scanned value into the focused field and end
the scan with `Enter` or `Tab`. This package listens to keyboard events,
separates fast scanner input from normal typing, classifies the value and emits a
single scan event.

```ts
import { createKeyboardScanner } from "@noogym/scanner";

const scanner = createKeyboardScanner({
  onScan: (scan) => console.log(scan.type, scan.value),
});

scanner.start();
```
