// Runner for the perf/bench specs, isolated from the normal e2e suite. Extends the base
// config (test DB, stdout->log capture) but runs a single spec, picked via PERF_SPEC, and
// optionally targets the release binary (production-representative timings) via PERF_RELEASE.
// The numbers we optimize against come from mma.log, not asserts.
//
//   npx wdio run wdio.perf.conf.ts                       # import perf (default), debug binary
//   PERF_SPEC=perf-sel    npx wdio run wdio.perf.conf.ts # selection sync probe
//   PERF_SPEC=benchmarks  npx wdio run wdio.perf.conf.ts # add/save/open/undo microbenchmarks
//   PERF_RELEASE=1        npx wdio run wdio.perf.conf.ts # against target/release (build first)
// PowerShell: $env:PERF_SPEC="perf-sel"; npx wdio run wdio.perf.conf.ts
import path from "path";
import { config as base } from "./wdio.conf";

const spec = process.env.PERF_SPEC ?? "perf-import";
const release = process.env.PERF_RELEASE === "1";

export const config: WebdriverIO.Config = {
	...base,
	specs: [`./test/e2e/${spec}.test.ts`],
	exclude: [],
	...(release && {
		capabilities: [
			{
				"tauri:options": {
					application: path.resolve("./src-tauri/target/release/map-making-app.exe"),
					args: ["--test-db"],
				},
			},
		],
	}),
};
