import { fromFileUrl, relative } from "https://deno.land/std/path/mod.ts";
import * as log from "https://deno.land/std/log/mod.ts";
import { parse } from "https://deno.land/std/flags/mod.ts";

const args = parse(Deno.args, {
  boolean: [
    "watch",
  ],
  string: [
    "entrypoint",
  ],
  default: {
    watch: true,
    entrypoint: "src/Runner.ts",
  },
});

await Deno.mkdir("assets/js/sprite", { recursive: true });

if (args.watch) {
  log.info("Rebuilding on change...");
  watch(args.entrypoint);
} else {
  once(args.entrypoint);
}

function run(entrypoint: string): Deno.Process {
  return Deno.run({
    cmd: [
      Deno.execPath(),
      "run",
      "--unstable",
      "--allow-read",
      "--allow-write",
      "--allow-run",
      import.meta.url,
      "entrypoint",
      entrypoint,
      "--no-watch",
    ],
  });
}

async function once(entrypoint: string) {
  const { errors } = await analyzeDeps(entrypoint);
  for (const error of errors) {
    log.error(error);
  }
  if (errors.length !== 0) Deno.exit(1);
  build(entrypoint);
}

async function build(entrypoint: string) {
  const source = new URL(entrypoint, import.meta.url);
  const { files, diagnostics } = await Deno.emit(source, {
    compilerOptions: {
      checkJs: true,
      sourceMap: false,
      lib: ["dom", "dom.iterable", "deno.ns", "deno.unstable"],
    },
  });
  if (diagnostics.length) {
    console.warn(Deno.formatDiagnostics(diagnostics));
  }

  for (let [fileName, text] of Object.entries(files)) {
    fileName = relative("src", fromFileUrl(fileName));
    const outputFile = `assets/js/${fileName}`;
    log.info(`emitted ${outputFile} [${text.length}]`);
    Deno.writeTextFile(outputFile, text);
  }
}

async function watch(entrypoint: string) {
  let { deps, errors } = await analyzeDeps(entrypoint);
  for (const error of errors) {
    log.error(error);
  }
  let proc: Deno.Process | null = null;
  if (errors.length === 0) {
    proc = run(entrypoint);
  }
  let debouncer = null;

  while (true) {
    const watcher = Deno.watchFs(deps);
    for await (const event of watcher) {
      if (typeof debouncer == "number") clearTimeout(debouncer);
      debouncer = setTimeout(async () => {
        console.warn(log.info(`${event.paths[0]} changed. Restarting...`));
        if (proc) {
          proc.close();
          proc = null;
        }
        const { deps: newDeps, errors: newErrors } = await analyzeDeps(
          entrypoint,
        );
        errors = newErrors;
        for (const error of errors) {
          log.error(error);
        }
        const depsChanged = new Set([...deps, ...newDeps]).size;
        if (depsChanged && errors.length === 0) {
          deps = newDeps;
          watcher.close();
          // watcher.return?.();
        }
        if (errors.length === 0) {
          proc = run(entrypoint);
        }
      }, 100);
    }
  }
}

async function analyzeDeps(
  specifier: string,
): Promise<{ deps: string[]; errors: string[] }> {
  try {
    const proc = Deno.run({
      cmd: [
        Deno.execPath(),
        "info",
        "--json",
        "--unstable",
        specifier,
      ],
      stdout: "piped",
    });
    const raw = await proc.output();
    const status = await proc.status();
    if (!status) throw new Error("Failed to analyze dependencies.");
    const modules: Array<{ specifier: string; error?: string }> =
      JSON.parse(new TextDecoder().decode(raw)).modules;

    const deps = modules.filter((module) => module.error === undefined)
      .map((module) => module.specifier)
      .filter((file) => file.startsWith("file://"))
      .map((file) => fromFileUrl(file));
    const errors = modules.filter((module) => module.error !== undefined)
      .map((module) => module.error!);

    return { deps, errors };
  } catch (error) {
    return { deps: [], errors: [error.message] };
  }
}
