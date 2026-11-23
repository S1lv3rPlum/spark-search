// Tap-to-fill for coloring pages. Pure function over ImageData-like objects
// ({ width, height, data: Uint8ClampedArray RGBA }) so it can be tested without a browser.
//
// Regions are worked out from the ORIGINAL artwork (`source`), and the color is painted onto
// the current canvas (`target`). That way a region you already colored never merges with its
// neighbors, even if they happen to be the same color.

const TOLERANCE = 120; // sum of |dR|+|dG|+|dB| allowed vs. the tapped pixel
const LINE_LUMA = 140; // tapped pixels darker than this count as outline: ignore the tap
const EDGE_LUMA = 170; // only anti-aliased pixels lighter than this get tinted by the 1px grow

export const hexToRgb = (hex) => {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const luma = (d, i) => d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;

// Returns 'filled', 'line' (tapped an outline) or 'same' (already that color).
export function floodFill(target, x, y, rgb, source = target) {
  const { width, height } = source;
  const src = source.data;
  const dst = target.data;
  if (x < 0 || y < 0 || x >= width || y >= height) return 'line';
  const [r, g, b] = rgb;
  const start = (y * width + x) * 4;
  const tr = src[start], tg = src[start + 1], tb = src[start + 2];

  if (luma(src, start) < LINE_LUMA) return 'line';
  if (dst[start] === r && dst[start + 1] === g && dst[start + 2] === b) return 'same';

  const visited = new Uint8Array(width * height);
  const match = (px, py) => {
    const i = (py * width + px) * 4;
    return (
      !visited[py * width + px] &&
      Math.abs(src[i] - tr) + Math.abs(src[i + 1] - tg) + Math.abs(src[i + 2] - tb) <= TOLERANCE
    );
  };
  const paint = (px, py) => {
    const i = (py * width + px) * 4;
    dst[i] = r; dst[i + 1] = g; dst[i + 2] = b; dst[i + 3] = 255;
    visited[py * width + px] = 1;
  };

  const stack = [x, y];
  while (stack.length) {
    const cy = stack.pop();
    let px = stack.pop();
    while (px >= 0 && match(px, cy)) px--;
    px++;
    let up = false, down = false;
    while (px < width && match(px, cy)) {
      paint(px, cy);
      if (cy > 0) {
        const m = match(px, cy - 1);
        if (m && !up) { stack.push(px, cy - 1); up = true; } else if (!m) up = false;
      }
      if (cy < height - 1) {
        const m = match(px, cy + 1);
        if (m && !down) { stack.push(px, cy + 1); down = true; } else if (!m) down = false;
      }
      px++;
    }
  }

  // One-pixel grow into light anti-aliased edge pixels so no white halo is left by the outline.
  // Pixels dark enough to be part of the line itself are never touched.
  const grow = [];
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      if (!visited[py * width + px]) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = px + dx, ny = py + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        if (visited[ny * width + nx]) continue;
        if (luma(src, (ny * width + nx) * 4) > EDGE_LUMA) grow.push(nx, ny);
      }
    }
  }
  for (let k = 0; k < grow.length; k += 2) {
    const i = (grow[k + 1] * width + grow[k]) * 4;
    dst[i] = r; dst[i + 1] = g; dst[i + 2] = b; dst[i + 3] = 255;
  }
  return 'filled';
}
