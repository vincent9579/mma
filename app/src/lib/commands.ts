import { commands } from "@/bindings.gen";
import { mmaBufUrl } from "@/lib/util/util";

type ExtractOk<T> = [T] extends [{ status: "ok"; data: infer D } | { status: "error"; error: unknown }] ? D : T;

type Unwrapped = {
	[K in keyof typeof commands]: (...args: Parameters<(typeof commands)[K]>) =>
		Promise<ExtractOk<Awaited<ReturnType<(typeof commands)[K]>>>>;
};

function unwrap(result: any) {
	if (result && typeof result === "object" && "status" in result) {
		if (result.status === "error") throw result.error;
		return result.data;
	}
	return result;
}

export const cmd = new Proxy(commands, {
	get(target, prop) {
		const fn = target[prop as keyof typeof commands];
		if (typeof fn !== "function") return fn;
		return (...args: unknown[]) => (fn as Function)(...args).then(unwrap);
	},
}) as unknown as Unwrapped;

export async function fetchViaFile<T>(pathPromise: Promise<string | null>): Promise<T | null> {
	const path = await pathPromise;
	if (!path) return null;
	const resp = await fetch(mmaBufUrl(path));
	return resp.json();
}
