const BINARY_NAME = "mma-vision";

const IS_WIN = navigator.userAgent.includes("Windows");
const SEP = IS_WIN ? "\\" : "/";

let _pluginDir: string | null = null;
async function pluginDir(): Promise<string> {
	if (!_pluginDir) {
		const appData = await MMA.cmd.getAppDataDir();
		_pluginDir = `${appData}${SEP}plugins${SEP}vision`;
	}
	return _pluginDir;
}

async function modelDir(): Promise<string> {
	return `${await pluginDir()}${SEP}models`;
}

async function clipCacheDir(): Promise<string> {
	return `${await pluginDir()}${SEP}clip-cache`;
}

interface SidecarProcess {
	kill(): void;
	onLine(cb: (line: string) => void): void;
	onStderr(cb: (line: string) => void): void;
	onClose(cb: (code: number | null) => void): void;
}

let tempCounter = 0;

async function writeInputFile(data: unknown): Promise<string> {
	const name = `mma_vision_${Date.now()}_${tempCounter++}.json`;
	return MMA.cmd.writeTempFile(name, JSON.stringify(data));
}

function spawnCommand(
	args: string[],
): { process: SidecarProcess; done: Promise<void> } {
	const lineCallbacks: ((line: string) => void)[] = [];
	const stderrCallbacks: ((line: string) => void)[] = [];
	const closeCallbacks: ((code: number | null) => void)[] = [];
	let child: { kill(): void } | null = null;

	const proc: SidecarProcess = {
		kill() { child?.kill(); },
		onLine(cb) { lineCallbacks.push(cb); },
		onStderr(cb) { stderrCallbacks.push(cb); },
		onClose(cb) { closeCallbacks.push(cb); },
	};

	const done = (async () => {
		const cmd = MMA.shell.Command.create(BINARY_NAME, args);
		cmd.stdout.on("data", (line: string) => {
			const trimmed = line.trim();
			if (trimmed) lineCallbacks.forEach((cb) => cb(trimmed));
		});
		cmd.stderr.on("data", (line: string) => {
			console.error("[vision]", line);
			const trimmed = line.trim();
			if (trimmed) stderrCallbacks.forEach((cb) => cb(trimmed));
		});
		child = await cmd.spawn();
		await new Promise<void>((resolve) => {
			cmd.on("close", (ev: { code: number | null }) => {
				closeCallbacks.forEach((cb) => cb(ev.code));
				resolve();
			});
		});
	})();

	return { process: proc, done };
}

interface PanoEntry {
	panoId: string;
	worldWidth: number;
	worldHeight: number;
}

async function resolveWorldSizes(panoIds: string[]): Promise<PanoEntry[]> {
	const BATCH = 200;
	const entries: PanoEntry[] = [];
	for (let i = 0; i < panoIds.length; i += BATCH) {
		const batch = panoIds.slice(i, i + BATCH);
		const metas = await MMA.fetchSvMetadata(batch);
		for (let j = 0; j < batch.length; j++) {
			const m = metas[j];
			const ws = m?.tiles?.worldSize;
			entries.push({
				panoId: batch[j],
				worldWidth: ws?.width ?? 6656,
				worldHeight: ws?.height ?? 3328,
			});
		}
	}
	return entries;
}

export async function spawnEmbed(panoIds: string[]): ReturnType<typeof spawnCommand> {
	const panos = await resolveWorldSizes(panoIds);
	const inputPath = await writeInputFile({ panos });
	const md = await modelDir();
	const cd = await clipCacheDir();
	return spawnCommand(["embed", "--input", inputPath, "--model-dir", md, "--cache-dir", cd]);
}

export async function spawnTextSearch(query: string, k: number | null, threshold: number | null): ReturnType<typeof spawnCommand> {
	const inputPath = await writeInputFile({ query, k, threshold });
	const md = await modelDir();
	const cd = await clipCacheDir();
	return spawnCommand(["search-text", "--input", inputPath, "--model-dir", md, "--cache-dir", cd]);
}

export async function spawnImageSearch(panoId: string, k: number | null, threshold: number | null): ReturnType<typeof spawnCommand> {
	const inputPath = await writeInputFile({ panoId, k, threshold });
	const cd = await clipCacheDir();
	return spawnCommand(["search-image", "--input", inputPath, "--cache-dir", cd]);
}
