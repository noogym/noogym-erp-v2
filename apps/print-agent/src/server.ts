import http from "node:http";
import {
  getAvailablePrinters,
  openCashDrawer,
  printReceipt,
  printTestPage,
} from "@noogym/printer";
import type { PrinterConfig, ReceiptData } from "@noogym/printer";

type JsonObject = Record<string, unknown>;

const host = process.env.NOOGYM_PRINT_AGENT_HOST ?? "127.0.0.1";
const port = Number(process.env.NOOGYM_PRINT_AGENT_PORT ?? 47891);
const allowedOrigin = process.env.NOOGYM_PRINT_AGENT_ORIGIN ?? "*";

const server = http.createServer(async (request, response) => {
  setCors(response);

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  try {
    if (request.method === "GET" && request.url === "/health") {
      sendJson(response, 200, {
        success: true,
        service: "noogym-print-agent",
        version: "0.0.0",
      });
      return;
    }

    if (request.method === "GET" && request.url === "/v1/printers") {
      sendJson(response, 200, await getAvailablePrinters());
      return;
    }

    if (request.method === "POST" && request.url === "/v1/print/test") {
      const body = await readJson(request);
      sendJson(response, 200, await printTestPage(body.config as PrinterConfig));
      return;
    }

    if (request.method === "POST" && request.url === "/v1/print/receipt") {
      const body = await readJson(request);
      sendJson(response, 200, await printReceipt(body.data as ReceiptData, body.config as PrinterConfig));
      return;
    }

    if (request.method === "POST" && request.url === "/v1/printer/cash-drawer") {
      const body = await readJson(request);
      sendJson(response, 200, await openCashDrawer(body.config as PrinterConfig));
      return;
    }

    sendJson(response, 404, {
      success: false,
      code: "NOT_FOUND",
      message: "Endpoint do Print Agent nao encontrado.",
    });
  } catch (error) {
    sendJson(response, 500, {
      success: false,
      code: "PRINT_AGENT_ERROR",
      message: "Falha no Noogym Print Agent.",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

server.listen(port, host, () => {
  console.log(`Noogym Print Agent listening on http://${host}:${port}`);
});

function setCors(response: http.ServerResponse) {
  response.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Access-Control-Max-Age", "86400");
}

function sendJson(response: http.ServerResponse, status: number, payload: unknown) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function readJson(request: http.IncomingMessage) {
  return new Promise<JsonObject>((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
      if (Buffer.concat(chunks).byteLength > 1024 * 1024) {
        reject(new Error("Payload too large"));
        request.destroy();
      }
    });
    request.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw) as JsonObject);
      } catch {
        reject(new Error("Invalid JSON payload"));
      }
    });
    request.on("error", reject);
  });
}
