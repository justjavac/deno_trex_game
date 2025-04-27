// Copyright (c) justjavac. All rights reserved. MIT License.

import * as esbuild from "esbuild";
import { denoPlugins } from "@luca/esbuild-deno-loader";

const result = await esbuild.build({
  plugins: [...denoPlugins()],
  entryPoints: [new URL("./src/entry.ts", import.meta.url).toString()],
  bundle: true,
  write: false,
  minify: true,
  format: "esm",
});

const code = result.outputFiles?.[0].text;

async function handleRequest(request: Request) {
  const { pathname } = new URL(request.url);

  if (pathname.startsWith("/favicon.ico")) {
    return new Response(await Deno.readFile("assets/favicon.ico"), {
      headers: {
        "content-type": "image/x-icon",
      },
    });
  }

  if (pathname.endsWith(".css")) {
    const file = await Deno.readFile(pathname.substring(1));
    return new Response(file, {
      headers: {
        "content-type": "text/css",
      },
    });
  }

  if (pathname.endsWith(".png")) {
    const file = await Deno.readFile(pathname.substring(1));
    return new Response(file, {
      headers: {
        "content-type": "image/png",
      },
    });
  }

  if (pathname.endsWith(".mpeg")) {
    const file = await Deno.readFile(pathname.substring(1));
    return new Response(file, {
      headers: {
        "content-type": "video/mpeg",
      },
    });
  }

  if (pathname.startsWith("/bundled.js")) {
    return new Response(code, {
      headers: {
        "content-type": "text/javascript",
      },
    });
  }

  return new Response(await Deno.readFile("index.html"), {
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });
}

Deno.serve(handleRequest);
