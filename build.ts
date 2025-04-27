// Copyright (c) justjavac. All rights reserved. MIT License.

import * as esbuild from "esbuild";
import { denoPlugins } from "@luca/esbuild-deno-loader";

await esbuild.build({
  plugins: [...denoPlugins()],
  entryPoints: [new URL("./src/entry.ts", import.meta.url).toString()],
  outdir: "dist",
  bundle: true,
  minify: true,
  format: "esm",
});

console.log("Build completed successfully.");
