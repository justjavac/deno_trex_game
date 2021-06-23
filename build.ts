const source = new URL("src/Runner.ts", import.meta.url);
const { files, diagnostics } = await Deno.emit(source, {
  //   bundle: "module",
  compilerOptions: {
    checkJs: true,
    sourceMap: false,
    lib: ["dom", "dom.iterable", "deno.ns", "deno.unstable"],
  },
});
if (diagnostics.length) {
  console.warn(Deno.formatDiagnostics(diagnostics));
}

for (const [fileName, text] of Object.entries(files)) {
  const outputFile = "assets/js/" +
    fileName.substr(fileName.lastIndexOf("/") + 1);
  console.log(`emitted ${outputFile} with a length of ${text.length}`);
  Deno.writeTextFile(
    outputFile,
    text,
  );
}
