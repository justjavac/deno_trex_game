import { fromFileUrl, relative } from "https://deno.land/std/path/mod.ts";
import * as log from "https://deno.land/std/log/mod.ts";

const source = new URL("src/Runner.ts", import.meta.url);
const { files, diagnostics } = await Deno.emit(source, {
  // bundle: "module",
  compilerOptions: {
    checkJs: true,
    sourceMap: false,
    lib: ["dom", "dom.iterable", "deno.ns", "deno.unstable"],
  },
});
if (diagnostics.length) {
  console.warn(Deno.formatDiagnostics(diagnostics));
}

await Deno.remove("assets/js", { recursive: true });
await Deno.mkdir("assets/js/sprite", { recursive: true });

for (let [fileName, text] of Object.entries(files)) {
  fileName = relative("src", fromFileUrl(fileName));
  const outputFile = `assets/js/${fileName}`;
  log.info(`emitted ${outputFile} [${text.length}]`);
  Deno.writeTextFile(outputFile, text);
}
