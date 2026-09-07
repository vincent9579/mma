import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import mdx from "@mdx-js/rollup";
import path from "node:path";

export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(import.meta.dirname, "src"),
		},
		dedupe: [
			"@luma.gl/core",
			"@luma.gl/engine",
			"@luma.gl/shadertools",
			"@luma.gl/webgl",
			"@luma.gl/webgpu",
			"@luma.gl/gpgpu",
			"@deck.gl/core",
			"@deck.gl/layers",
			"@deck.gl/extensions",
			"@deck.gl/google-maps",
			"@deck.gl/mapbox",
		],
	},
	define: {
		__APP_VERSION__: JSON.stringify(process.env.npm_package_version),
	},
	clearScreen: false,
	plugins: [{ ...mdx(), enforce: "pre" }, react({ include: /\.(jsx|js|mdx|tsx|ts)$/ })],
	server: {
		strictPort: true,
		watch: {
			ignored: ["**/src-tauri/**"],
		},
	},
	optimizeDeps: {
		include: [
			"@deck.gl/core",
			"@deck.gl/layers",
			"@deck.gl/google-maps",
			"@luma.gl/core",
			"@luma.gl/shadertools",
			"@luma.gl/engine",
			"@luma.gl/webgl",
		],
	},
});
