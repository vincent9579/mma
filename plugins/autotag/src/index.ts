import type { MMA } from "mma-plugin-types";
declare const MMA: MMA;
// Plugin shell: core provides store_generate_auto_tags / store_apply_auto_tags.
// This plugin adds bulk dialog (multi-select) and could host future settings UI.
// The LocationPreview dashed suggestions live in core for now to ensure selection padding sync.
MMA.registerPlugin({
  activate() {
    console.log("[autotag] plugin active - core autotag commands available");
    return () => console.log("[autotag] deactivated");
  },
});
