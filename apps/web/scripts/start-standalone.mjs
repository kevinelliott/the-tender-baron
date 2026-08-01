import { cp, mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const appRoot = process.cwd();
const standaloneRoot = resolve(appRoot, ".next/standalone/apps/web");
const standaloneNext = resolve(standaloneRoot, ".next");

await mkdir(standaloneNext, { recursive: true });
await cp(resolve(appRoot, ".next/static"), resolve(standaloneNext, "static"), {
  recursive: true,
  force: true,
});

process.env.HOSTNAME ??= "127.0.0.1";
process.env.PORT ??= "3107";

await import(pathToFileURL(resolve(standaloneRoot, "server.js")).href);
