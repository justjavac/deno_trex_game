async function handleRequest(request: Request) {
  const { pathname } = new URL(request.url);

  if (pathname.startsWith("/favicon.ico")) {
    const favicon = new URL("favicon.ico", import.meta.url);
    return fetch(favicon);
  }

  if (pathname.startsWith("/assets/css")) {
    const style = new URL(pathname.substr(1), import.meta.url);
    const response = await fetch(style);
    const headers = new Headers(response.headers);
    headers.set("content-type", "text/css; charset=utf-8");
    return new Response(response.body, { ...response, headers });
  }

  if (pathname.startsWith("/assets")) {
    const assets = new URL(pathname.substr(1), import.meta.url);
    return fetch(assets);
  }

  if (pathname.startsWith("/bundle.js")) {
    const source = new URL("src/Runner.ts", import.meta.url);
    const { files, diagnostics } = await Deno.emit(source, {
      bundle: "module",
      compilerOptions: {
        checkJs: true,
        sourceMap: false,
        lib: ["dom", "dom.iterable", "deno.ns", "deno.unstable"],
      },
    });
    if (diagnostics.length) {
      console.warn(Deno.formatDiagnostics(diagnostics));
    }
    return new Response(files["deno:///bundle.js"], {
      headers: {
        "content-type": "text/javascript; charset=utf-8",
      },
    });
  }

  const html = new URL("index.html", import.meta.url);
  const response = await fetch(html);

  return new Response(response.body, {
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });
}

addEventListener("fetch", (event: FetchEvent) => {
  event.respondWith(handleRequest(event.request));
});
