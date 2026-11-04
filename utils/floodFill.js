// Tap-to-fill for coloring pages. Pure function over ImageData-like objects
// ({ width, height, data: Uint8ClampedArray RGBA }) so it can be tested without a browser.

const TOLERANCE = 120; // sum of |dR|+|dG|+|dB| allowed vs. the tapped pixel
const LINE_LUMA = 70; // tapped pixels darker than this count as outline: ignore
const EDGE_LUMA = 100; // anti-aliased edge pixels lighter than this get tinted too

export const hexToRgb = (hex) => {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const luma = (d, i) => d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;

// Returns true if any pixels changed.
export function floodFill(imageData, x, y, rgb) {
  const { width, height, data } = imageData;
  if (x < 0 || y < 0 || x >= width || y >= height) return false;
  const [r, g, b] = rgb;
  const start = (y * width + x) * 4;
  const tr = data[start], tg = data[start + 1], tb = data[start + 2];

  if (luma(data, start) < LINE_LUMA) return false; // tapped an outline
  if (tr === r && tg === g && tb === b) return false; // already this color

  const visited = new Uint8Array(width * height);
  const match = (px, py) => {
    const i = (py * width + px) * 4;
    return (
      !visited[py * width + px] &&
      Math.abs(data[i] - tr) + Math.abs(data[i + 1] - tg) + Math.abs(data[i + 2] - tb) <= TOLERANCE
    );
  };
  const paint = (px, py) => {
    const i = (py * width + px) * 4;
    data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
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
  const grow = [];
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      if (!visited[py * width + px]) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = px + dx, ny = py + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        if (visited[ny * width + nx]) continue;
        if (luma(data, (ny * width + nx) * 4) > EDGE_LUMA) grow.push(nx, ny);
      }
    }
  }
  for (let k = 0; k < grow.length; k += 2) {
    const i = (grow[k + 1] * width + grow[k]) * 4;
    // Only tint pixels that are still light; leave real outline pixels alone
    data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
  }
  return true;
}
