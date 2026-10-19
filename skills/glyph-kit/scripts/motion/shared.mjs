import { Grid } from "../live/grid.mjs";

/** Run a fresh diagram up to its still step and return that frame, with text settled. */
export function stillGrid(make, still) {
  const frame = make();
  let g;
  for (let s = 0; s < still; s++) frame(s, 0);
  Grid.settled = true;
  try { g = frame(still, 0); } finally { Grid.settled = false; }
  return g;
}


