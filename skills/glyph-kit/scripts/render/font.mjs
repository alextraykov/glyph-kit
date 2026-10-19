// The same existing Departure Mono asset used by the kit site, embedded for offline exports.
import { readFileSync } from "node:fs";
const font = readFileSync(new URL("../../assets/DepartureMono-Regular.woff2", import.meta.url)).toString("base64");
export const FONT_CSS = `@font-face{font-family:"Departure Mono";src:url(data:font/woff2;base64,${font}) format("woff2");font-weight:400;font-display:block}`;
