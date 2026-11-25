import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import {fileURLToPath, URL} from "node:url";
import {createHash} from "node:crypto";
import {readFileSync, readdirSync} from "node:fs";

const publicDirectory = new URL("./public/", import.meta.url);
const photoVersions = Object.fromEntries(readdirSync(publicDirectory, {withFileTypes: true})
  .filter(file => file.isFile() && file.name.endsWith(".jpg"))
  .map(({name}) => [name, createHash("sha256").update(readFileSync(new URL(name, publicDirectory))).digest("hex").slice(0, 12)]));

export default defineConfig({
  base: "/ui-ux-pr3/",
  plugins: [react(), tailwindcss()],
  define: {__PHOTO_VERSIONS__: JSON.stringify(photoVersions)},
  resolve: {alias: {"@": fileURLToPath(new URL("./src", import.meta.url))}},
});
