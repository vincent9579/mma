// autotag/src/index.ts (built)
var { registerPlugin } = MMA;
registerPlugin({
  activate() {
    console.log("[autotag] plugin active - core autotag commands available");
    return () => console.log("[autotag] deactivated");
  }
});
