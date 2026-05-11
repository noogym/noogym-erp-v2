const sharedConfig = require("../../packages/config/tailwind.config.js");

/** @type {import('tailwindcss').Config} */
module.exports = {
  ...sharedConfig,
  content: ["./app/**/*.{ts,tsx}", "../../packages/admin/src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"]
};
