/**
 * Register a stub for the `server-only` package so acquisition scripts
 * can run outside the Next.js runtime.
 */
import Module from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const shim = path.join(path.dirname(fileURLToPath(import.meta.url)), "server-only.js");

const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === "server-only") {
    return shim;
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};
