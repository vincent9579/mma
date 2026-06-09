import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { RgbColorPicker } from "react-colorful";

type Rgb = { r: number; g: number; b: number };

/** A color swatch that opens the picker in a popover on click. */
export function ColorPicker({
	color,
	onChange,
	ariaLabel = "Pick color",
}: {
	color: Rgb;
	onChange: (color: Rgb) => void;
	ariaLabel?: string;
}) {
	const [open, setOpen] = useState(false);
	return (
		<Popover.Root open={open} onOpenChange={setOpen}>
			<Popover.Trigger asChild>
				<button
					type="button"
					className="color-picker__swatch"
					aria-label={ariaLabel}
					style={{ backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})` }}
				/>
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Content
					className="color-picker__popover"
					sideOffset={4}
					align="start"
					collisionPadding={8}
				>
					<RgbColorPicker color={color} onChange={onChange} />
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
}
