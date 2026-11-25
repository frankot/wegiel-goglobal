import "dotenv/config";
import Module from "node:module";

// server-only stub
const loader = Module as unknown as {
  _resolveFilename: (request: string, ...rest: unknown[]) => string;
};
const resolve = loader._resolveFilename;
loader._resolveFilename = function (request: string, ...rest: unknown[]) {
  if (request === "server-only") return __filename;
  return resolve.call(this, request, ...rest);
};

export const DEMO_PREFIX = "cdemo";
