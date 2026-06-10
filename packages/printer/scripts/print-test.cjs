const { printTestPage } = require("../dist/index.js");

const config = {
  name: "Noogym Dry Run Printer",
  connectionType: "network",
  profile: "generic",
  paperWidth: 58,
  dryRun: true,
  network: {
    host: "127.0.0.1",
    port: 9100,
    timeoutMs: 1000
  }
};

printTestPage(config)
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
