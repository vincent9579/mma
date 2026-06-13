import { useEffect, useRef } from "react";

export function FpsCounter() {
	const ref = useRef<HTMLDivElement>(null);
	useEffect(() => {
		let frames = 0;
		let last = performance.now();
		let rafId = 0;
		const tick = () => {
			frames++;
			const now = performance.now();
			if (now - last >= 1000) {
				if (ref.current) ref.current.textContent = `${frames} fps`;
				frames = 0;
				last = now;
			}
			rafId = requestAnimationFrame(tick);
		};
		rafId = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(rafId);
	}, []);
	return (
		<div
			ref={ref}
			style={{
				position: "absolute",
				top: 8,
				right: 8,
				zIndex: 999,
				background: "rgba(0,0,0,0.7)",
				color: "#0f0",
				padding: "2px 6px",
				fontSize: 12,
				fontFamily: "monospace",
				borderRadius: 3,
				pointerEvents: "none",
			}}
		/>
	);
}
