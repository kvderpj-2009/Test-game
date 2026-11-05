type Ctx = CanvasRenderingContext2D;
export const TILE_W = 64,
  TILE_H = 32;
export function iso(x: number, y: number) {
  return { x: (x - y) * 32, y: (x + y) * 16 };
}
export function uniso(x: number, y: number) {
  return { x: x / 64 + y / 32, y: y / 32 - x / 64 };
}
export function polygon(
  c: Ctx,
  points: number[][],
  fill: string | CanvasGradient,
  stroke?: string,
) {
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = 1;
    c.stroke();
  }
}
export function ellipse(
  c: Ctx,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: string | CanvasGradient,
) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fillStyle = color;
  c.fill();
}
export function line(c: Ctx, points: number[][], color: string, width = 1) {
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.strokeStyle = color;
  c.lineWidth = width;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.stroke();
}
export function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  return (
    '#' +
    [n >> 16, (n >> 8) & 255, n & 255]
      .map((v) =>
        Math.max(0, Math.min(255, v + amount))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}
export function gradient(c: Ctx, y: number, height: number, color: string) {
  const g = c.createLinearGradient(-30, y - height, 30, y);
  g.addColorStop(0, shade(color, 20));
  g.addColorStop(1, shade(color, -12));
  return g;
}
export function box(c: Ctx, x: number, y: number, w: number, h: number, z: number, color: string) {
  polygon(
    c,
    [
      [x - w, y - h],
      [x, y],
      [x, y - z],
      [x - w, y - h - z],
    ],
    gradient(c, y, z, color),
    '#304b4935',
  );
  polygon(
    c,
    [
      [x, y],
      [x + w, y - h],
      [x + w, y - h - z],
      [x, y - z],
    ],
    gradient(c, y, z, shade(color, -30)),
    '#304b4935',
  );
  polygon(
    c,
    [
      [x - w, y - h - z],
      [x, y - 2 * h - z],
      [x + w, y - h - z],
      [x, y - z],
    ],
    shade(color, 30),
  );
  line(
    c,
    [
      [x - w, y - h - z],
      [x, y - z],
      [x + w, y - h - z],
    ],
    shade(color, 48),
    1.4,
  );
}
