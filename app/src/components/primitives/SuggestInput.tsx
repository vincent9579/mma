import { useState, useEffect, useRef, type ReactNode, type CSSProperties } from "react";

/** Autocomplete input: owns open/close state, outside-click dismissal,
 *  Enter-picks-first, and Escape-closes. Suggestion sourcing stays at the call
 *  site (sync filter or debounced fetch) — the dropdown shows whenever
 *  `suggestions` is non-empty and not dismissed. Default classes render the
 *  standard `.search-results` dropdown; override them for other skins. */
export function SuggestInput<T>({
	value,
	onChange,
	suggestions,
	onPick,
	renderItem,
	getKey,
	placeholder,
	containerClassName,
	inputClassName = "input",
	listClassName = "search-results",
	itemClassName = "search-result",
	listStyle,
	autoFocus,
	disabled,
	pickOnEnter = true,
}: {
	value: string;
	onChange: (v: string) => void;
	suggestions: T[];
	onPick: (item: T) => void;
	renderItem: (item: T) => ReactNode;
	getKey: (item: T) => string | number;
	placeholder?: string;
	containerClassName?: string;
	inputClassName?: string;
	listClassName?: string;
	itemClassName?: string;
	listStyle?: CSSProperties;
	autoFocus?: boolean;
	disabled?: boolean;
	/** When false, Enter closes the dropdown and falls through (e.g. to a form submit). */
	pickOnEnter?: boolean;
}) {
	const [open, setOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const handler = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [open]);

	const pick = (item: T) => {
		onPick(item);
		setOpen(false);
	};

	return (
		<div
			ref={containerRef}
			className={containerClassName}
			style={{ position: "relative" }}
			aria-expanded={open && suggestions.length > 0}
		>
			<input
				className={inputClassName}
				type="text"
				placeholder={placeholder}
				value={value}
				autoFocus={autoFocus}
				disabled={disabled}
				onChange={(e) => {
					onChange(e.target.value);
					setOpen(true);
				}}
				onFocus={() => suggestions.length > 0 && setOpen(true)}
				onKeyDown={(e) => {
					if (e.key === "Enter" && open) {
						if (pickOnEnter && suggestions.length > 0) {
							e.preventDefault();
							pick(suggestions[0]);
						} else {
							setOpen(false);
						}
					}
					if (e.key === "Escape" && open) {
						e.stopPropagation();
						setOpen(false);
					}
				}}
			/>
			<ol className={listClassName} hidden={!open || suggestions.length === 0} style={listStyle}>
				{suggestions.map((item) => (
					<li key={getKey(item)}>
						<button type="button" className={itemClassName} onClick={() => pick(item)}>
							{renderItem(item)}
						</button>
					</li>
				))}
			</ol>
		</div>
	);
}
