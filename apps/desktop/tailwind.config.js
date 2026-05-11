const sharedConfig = require("../../packages/config/tailwind.config.js");

/** @type {import('tailwindcss').Config} */
module.exports = {
  ...sharedConfig,
  content: [
    "./index.html",
    "./src/renderer/**/*.{ts,tsx}",
    "../../packages/admin/src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}"
  ]
};
