// The same existing Departure Mono asset used by the kit site, embedded for offline exports.
import { readFileSync } from "node:fs";
let font;
// Read only when exporting a document. Consumers may import deck palettes during bundling,
// where import.meta.url no longer points at the kit's source tree.
export const FONT_CSS = () => {
  font ??= readFileSync(new URL("../../assets/DepartureMono-Regular.woff2", import.meta.url)).toString("base64");
  return `@font-face{font-family:"Departure Mono";src:url(data:font/woff2;base64,${font}) format("woff2");font-weight:400;font-display:block}`;
};
