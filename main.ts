// Copyright (c) justjavac. All rights reserved. MIT License.

import { bundle } from "@deno/emit";

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
    const { code } = await bundle(new URL("./src/entry.ts", import.meta.url), {
      cacheRoot: "./cache",
    });

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
