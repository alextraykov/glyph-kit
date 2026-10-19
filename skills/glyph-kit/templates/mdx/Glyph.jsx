// Glyph kit figure for React MDX (Next.js, Docusaurus, etc.). Renders the spec to SVG on the server.
// Copy next to your MDX and adjust the import to where you keep the skill's scripts folder.
// Usage in MDX:  import Glyph from "./Glyph.jsx";   <Glyph theme="paper" spec={{ kind: "funnel", … }} />
import { renderSvg } from "../../scripts/render/svg.mjs"; // ← adjust to your copy of glyph-kit/scripts

export default function Glyph({ spec, theme = "paper", frame = true }) {
  const svg = renderSvg(spec, { theme, frame });
  return <figure style={{ margin: "2rem 0", overflowX: "auto" }} dangerouslySetInnerHTML={{ __html: svg }} />;
}
