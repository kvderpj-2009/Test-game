import { BUILDING } from '../game/data';
import { random } from '../game/world';
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
function shade(hex: string, amount: number) {
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
function gradient(c: Ctx, y: number, height: number, color: string) {
  const g = c.createLinearGradient(-30, y - height, 30, y);
  g.addColorStop(0, shade(color, 20));
  g.addColorStop(1, shade(color, -12));
  return g;
}
function box(c: Ctx, x: number, y: number, w: number, h: number, z: number, color: string) {
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
function roof(
  c: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string,
  thatch = false,
) {
  const a = [x - w - 5, y - h],
    b = [x, y + 3],
    d = [x, y - 2 * h - 4],
    e = [x - w * 0.48, y - h * 1.5 - r],
    f = [x + w * 0.52, y - h * 0.5 - r],
    cc = [x + w + 5, y - h];
  polygon(c, [e, f, cc, d], shade(color, -23), '#29413955');
  polygon(c, [b, cc, f], shade(color, -13));
  polygon(c, [a, b, f, e], gradient(c, y, r + h, color), '#29413955');
  c.save();
  c.beginPath();
  [a, b, f, e].forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
  c.closePath();
  c.clip();
  for (let i = 1; i < 7; i++) {
    const k = i / 7;
    line(
      c,
      [
        [a[0] + (e[0] - a[0]) * k, a[1] + (e[1] - a[1]) * k],
        [b[0] + (f[0] - b[0]) * k, b[1] + (f[1] - b[1]) * k],
      ],
      shade(color, -25),
      1.5,
    );
    line(
      c,
      [
        [a[0] + (e[0] - a[0]) * k, a[1] + (e[1] - a[1]) * k - 1],
        [b[0] + (f[0] - b[0]) * k, b[1] + (f[1] - b[1]) * k - 1],
      ],
      shade(color, 27),
      1,
    );
  }
  for (let i = -10; i < 12; i++)
    line(
      c,
      [
        [x + i * (thatch ? 5 : 15), y + 10],
        [x + i * (thatch ? 5 : 15) + 30, y - r - h * 2],
      ],
      thatch ? '#fff0b52d' : '#512b2430',
      1,
    );
  c.restore();
  line(c, [a, b, cc], shade(color, -45), 4);
  line(c, [e, f], shade(color, 55), 3);
  line(c, [a, e, f], shade(color, 22), 1.3);
}
function windowPane(c: Ctx, x: number, y: number, side = 1, lit = false) {
  polygon(
    c,
    [
      [x, y],
      [x + 10, y + side * 5],
      [x + 10, y + side * 5 + 12],
      [x, y + 12],
    ],
    '#354d55',
    '#f8e3b5',
  );
  polygon(
    c,
    [
      [x + 2, y + 2],
      [x + 8, y + side * 3 + 2],
      [x + 8, y + side * 3 + 9],
      [x + 2, y + 9],
    ],
    lit ? '#ffd880' : '#6ac8d9',
  );
  line(
    c,
    [
      [x + 5, y + side * 2.5],
      [x + 5, y + side * 2.5 + 12],
    ],
    '#f6db9c',
    1.5,
  );
  line(
    c,
    [
      [x - 1, y + 13],
      [x + 11, y + side * 6 + 13],
    ],
    '#fff0c6',
    2,
  );
}
function house(
  c: Ctx,
  w: number,
  height: number,
  wall = '#f1d5a0',
  top = '#ce6941',
  thatch = false,
) {
  box(c, 0, 6, w + 3, w / 2 + 1, 7, '#a0a992');
  box(c, 0, 0, w, w / 2, height, wall);
  line(
    c,
    [
      [-w, -w / 2],
      [-w, -w / 2 - height],
    ],
    '#946d4c',
    3,
  );
  line(
    c,
    [
      [0, 0],
      [0, -height],
    ],
    '#946d4c',
    3,
  );
  line(
    c,
    [
      [w, -w / 2],
      [w, -w / 2 - height],
    ],
    '#76583d',
    3,
  );
  polygon(
    c,
    [
      [8, -4],
      [22, -11],
      [22, -33],
      [8, -26],
    ],
    '#4f4b3c',
  );
  polygon(
    c,
    [
      [10, -5],
      [20, -10],
      [20, -30],
      [10, -25],
    ],
    '#98603e',
  );
  line(
    c,
    [
      [14, -8],
      [14, -25],
    ],
    '#cb8d53',
    1.5,
  );
  ellipse(c, 18, -18, 1, 1.4, '#ffd177');
  box(c, 17, 0, 12, 6, 3, '#c7b79c');
  windowPane(c, -w + 10, -w / 2 - height + 9, 1);
  if (w > 45) windowPane(c, -22, -height + 1, 1, true);
  if (w > 44) windowPane(c, w - 17, -w / 2 - height + 16, -1);
  roof(c, 0, -height, w, w / 2, thatch ? 25 : 22, top, thatch);
}
function crate(c: Ctx, x: number, y: number, size = 9) {
  box(c, x, y, size, size / 2, size * 1.25, '#b47a3e');
  line(
    c,
    [
      [x - size + 2, y - size * 0.5 - size],
      [x - 2, y - 2],
      [x - 2, y - size + 1],
      [x - size + 2, y - size * 0.5 - 2],
    ],
    '#f2c57a',
    1.5,
  );
}
function barrel(c: Ctx, x: number, y: number, color = '#c38b49') {
  const g = c.createLinearGradient(x - 6, 0, x + 6, 0);
  g.addColorStop(0, shade(color, -25));
  g.addColorStop(0.35, shade(color, 25));
  g.addColorStop(1, shade(color, -30));
  c.fillStyle = g;
  c.fillRect(x - 6, y - 12, 12, 12);
  ellipse(c, x, y, 6, 3, shade(color, -25));
  ellipse(c, x, y - 12, 6, 3, shade(color, 35));
  line(
    c,
    [
      [x - 6, y - 4],
      [x, y - 2],
      [x + 6, y - 4],
    ],
    '#5a6662',
    2,
  );
  line(
    c,
    [
      [x - 6, y - 10],
      [x, y - 8],
      [x + 6, y - 10],
    ],
    '#5a6662',
    1.4,
  );
}
function flag(c: Ctx, x: number, y: number, color = '#278fbd') {
  line(
    c,
    [
      [x, y + 18],
      [x, y - 20],
    ],
    '#665c42',
    2,
  );
  polygon(
    c,
    [
      [x, y - 20],
      [x + 13, y - 21],
      [x + 24, y - 17],
      [x + 20, y - 6],
      [x + 11, y - 9],
      [x, y - 7],
    ],
    color,
    '#ffffff35',
  );
  line(
    c,
    [
      [x + 9, y - 17],
      [x + 9, y - 11],
    ],
    '#ffdf7e',
    2,
  );
  ellipse(c, x, y - 21, 2, 2, '#f6cc62');
}
function tank(c: Ctx, x: number, y: number, w: number, h: number, color: string) {
  const g = c.createLinearGradient(x - w, 0, x + w, 0);
  g.addColorStop(0, shade(color, -25));
  g.addColorStop(0.35, shade(color, 30));
  g.addColorStop(1, shade(color, -35));
  c.fillStyle = g;
  c.fillRect(x - w, y - h, w * 2, h);
  ellipse(c, x, y, w, w * 0.43, shade(color, -20));
  ellipse(c, x, y - h, w, w * 0.43, shade(color, 40));
  line(
    c,
    [
      [x - w + 2, y - h + 8],
      [x - w + 2, y - 2],
    ],
    '#ffffff50',
    2,
  );
}
function dome(c: Ctx, x: number, y: number, r: number, color: string) {
  const g = c.createRadialGradient(x - r * 0.35, y - r * 0.7, 1, x, y, r);
  g.addColorStop(0, shade(color, 65));
  g.addColorStop(0.55, color);
  g.addColorStop(1, shade(color, -50));
  c.beginPath();
  c.ellipse(x, y, r, r, 0, Math.PI, Math.PI * 2);
  c.fillStyle = g;
  c.fill();
  ellipse(c, x, y, r, r * 0.36, shade(color, -12));
  line(
    c,
    [
      [x - r, y],
      [x, y + r * 0.3],
      [x + r, y],
    ],
    '#f4d78f',
    3,
  );
}
function logs(c: Ctx, x: number, y: number) {
  for (let row = 1; row >= 0; row--)
    for (let i = 0; i < 3 - row; i++) {
      const px = x + i * 10 + row * 5,
        py = y - row * 7;
      line(
        c,
        [
          [px, py],
          [px + 22, py - 11],
        ],
        '#774d2d',
        9,
      );
      line(
        c,
        [
          [px, py - 2],
          [px + 22, py - 13],
        ],
        '#a9773c',
        3,
      );
      ellipse(c, px, py, 4.5, 4.5, '#edc27d');
      ellipse(c, px, py, 2.5, 2.5, '#bc8b4c');
      ellipse(c, px, py, 1, 1, '#f3d193');
    }
}
function flower(c: Ctx, x: number, y: number) {
  ellipse(c, x, y, 9, 5, '#386b38');
  for (let i = 0; i < 5; i++)
    ellipse(c, x - 7 + i * 3.5, y - 3 - Math.sin(i) * 2, 2.4, 2.4, i % 2 ? '#f1a6ba' : '#ffe49a');
}
function gear(c: Ctx, x: number, y: number, r: number, color = '#f5c469') {
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    line(
      c,
      [
        [x + Math.cos(a) * (r - 2), y + Math.sin(a) * (r - 2)],
        [x + Math.cos(a) * (r + 2), y + Math.sin(a) * (r + 2)],
      ],
      color,
      4,
    );
  }
  ellipse(c, x, y, r, r, color);
  ellipse(c, x, y, r * 0.4, r * 0.4, '#53696b');
}
function industrial(c: Ctx, type: string, w: number, level: number) {
  const future = [
    'electronicsFactory',
    'datacenter',
    'academy',
    'broadcast',
    'fusionReactor',
    'orbitalWorks',
    'spaceLab',
  ].includes(type);
  box(c, 0, 6, w + 4, w / 2 + 2, 7, '#8caaa8');
  if (type === 'oilWell') {
    tank(c, -22, -12, 15, 23, '#5e8791');
    for (const x of [-20, 22])
      line(
        c,
        [
          [x, 3],
          [2, -104],
        ],
        '#536b71',
        5,
      );
    for (let y = -20; y > -90; y -= 20)
      line(
        c,
        [
          [-20 - y * 0.16, y],
          [22 + y * 0.18, y - 6],
        ],
        '#e6bc5f',
        3,
      );
    line(
      c,
      [
        [2, -104],
        [30, -90],
        [4, -74],
      ],
      '#efc965',
      5,
    );
    line(
      c,
      [
        [29, -91],
        [29, -21],
      ],
      '#526569',
      2,
    );
    barrel(c, 43, 0, '#5b8998');
    return;
  }
  if (type === 'fusionReactor') {
    tank(c, 0, -8, 30, 49, '#b3d9d5');
    dome(c, 0, -57, 25, '#53cfce');
    ellipse(c, 0, -36, 37, 13, '#255c7155');
    line(
      c,
      [
        [-36, -39],
        [0, -23],
        [36, -39],
      ],
      '#9affee',
      4,
    );
    for (const x of [-36, 36]) tank(c, x, -4, 8, 32, '#567d91');
    return;
  }
  box(c, 0, 0, w, w / 2, 30 + level * 3, future ? '#c7d8d1' : '#cdad7f');
  const roofY = -33 - level * 3;
  if (future) {
    box(c, 0, roofY, w - 3, w / 2 - 1, 6, '#507f96');
    for (let i = 0; i < 3; i++)
      box(
        c,
        -w / 2 + i * 16,
        roofY - w / 4 + i * 8,
        7,
        3.5,
        2,
        type === 'datacenter' ? '#68d8ec' : '#3d697f',
      );
    for (let i = 0; i < 3; i++) windowPane(c, -w + 9 + i * 14, -w / 2 - 23 + i * 7, 1);
    if (type === 'broadcast') {
      line(
        c,
        [
          [15, roofY - 5],
          [15, roofY - 76],
        ],
        '#a1b6b7',
        4,
      );
      for (let i = 0; i < 3; i++) ellipse(c, 15, roofY - 20 - i * 17, 14 - i * 3, 4, '#e8f3df');
      ellipse(c, 15, roofY - 79, 3, 3, '#ffbc6e');
    }
    if (type === 'spaceLab' || type === 'academy') dome(c, 0, roofY - w / 2, 23, '#53b8c9');
    if (type === 'orbitalWorks') {
      tank(c, 18, -18, 10, 61, '#dbe7dc');
      polygon(
        c,
        [
          [8, -79],
          [18, -96],
          [28, -79],
        ],
        '#e88f4a',
      );
    }
  } else {
    for (let i = 0; i < 3; i++) {
      const x = -w * 0.62 + i * w * 0.58,
        y = roofY - w * 0.8 + i * w * 0.29;
      polygon(
        c,
        [
          [x - 15, y + 9],
          [x - 15, y - 8],
          [x + 8, y - 23],
          [x + 20, y - 7],
        ],
        '#587e88',
        '#cee2cf',
      );
      polygon(
        c,
        [
          [x - 15, y + 9],
          [x + 20, y - 7],
          [x + 20, y + 4],
          [x - 15, y + 20],
        ],
        '#87b5b6',
      );
    }
    for (let i = 0; i < 2; i++) windowPane(c, -w + 10 + i * 18, -w / 2 - 23 + i * 9, 1, true);
    if (['refinery', 'powerplant', 'alloyWorks', 'steelworks'].includes(type)) {
      tank(c, -w * 0.55, -w * 0.75, 10, 64, '#a7b0a2');
      tank(c, -w * 0.55, -w * 0.75 - 52, 11, 7, '#bb6f48');
      if (type === 'refinery') tank(c, w * 0.55, -w * 0.28, 14, 48, '#c1d2ca');
      if (type === 'powerplant') {
        tank(c, 13, -19, 19, 51, '#b4c4b5');
        ellipse(c, 13, -70, 15, 5, '#46585c');
      }
    }
  }
  if (type === 'charcoal') {
    dome(c, 20, 5, 22, '#575f56');
    polygon(
      c,
      [
        [12, 7],
        [26, 0],
        [26, -10],
        [12, -3],
      ],
      '#ef9d43',
    );
  }
  if (['forge', 'smelter', 'steelworks', 'alloyWorks'].includes(type)) {
    polygon(
      c,
      [
        [8, -4],
        [27, -14],
        [27, -30],
        [8, -20],
      ],
      '#54463b',
    );
    polygon(
      c,
      [
        [11, -6],
        [24, -13],
        [24, -26],
        [11, -18],
      ],
      '#ffa64f',
    );
    box(c, -19, 13, 15, 7, 8, '#7d8d8e');
  }
  if (['engineering', 'workshop', 'electronicsFactory'].includes(type)) gear(c, -20, -33, 9);
  crate(c, w - 3, 11);
  barrel(c, -w - 2, -2, future ? '#66a5a9' : '#b98545');
}
function finishBuilding(c: Ctx, canvas: HTMLCanvasElement, type: string, level: number) {
  if (level > 1 && !['road', 'bridge', 'wall', 'gate', 'trap'].includes(type)) {
    const x = BUILDING[type].size * 21,
      y = 14;
    box(c, x, y, 12, 6, 5, level === 3 ? '#d5b35f' : '#a6bcb7');
    for (let i = 0; i < level; i++) ellipse(c, x - 6 + i * 6, y - 6, 1.8, 1.8, '#ffec9c');
  }
  return canvas;
}
/** Original procedural illustrations; the common canvas and foot anchor also define pixel picking. */
export function buildingArt(type: string, level = 1): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 288;
  canvas.height = 260;
  const c = canvas.getContext('2d')!;
  c.translate(144, 180);
  const def = BUILDING[type],
    s = def.size,
    w = s * 25;
  const shadow = c.createRadialGradient(6, 4, 2, 6, 4, w + 15);
  shadow.addColorStop(0, '#1c473a42');
  shadow.addColorStop(1, '#1c473a00');
  c.save();
  c.scale(1, 0.42);
  ellipse(c, 8, 9, w + 18, w + 18, shadow);
  c.restore();
  if (type === 'road' || type === 'bridge') {
    box(c, 0, 16, 32, 16, type === 'bridge' ? 7 : 2, type === 'bridge' ? '#b68851' : '#cbb98e');
    if (type === 'bridge') {
      for (let i = -24; i < 32; i += 8)
        line(
          c,
          [
            [i, -16 + Math.abs(i) / 2],
            [i, 16 - Math.abs(i) / 2],
          ],
          '#e5bc78',
          3,
        );
      for (const x of [-27, 27]) {
        line(
          c,
          [
            [x, 1],
            [x, -18],
          ],
          '#785234',
          4,
        );
        line(
          c,
          [
            [x, -18],
            [x > 0 ? 2 : -2, x > 0 ? -31 : -5],
          ],
          '#a67b49',
          3,
        );
      }
    } else
      for (let i = 0; i < 7; i++) {
        const x = (random(i, 1) - 0.5) * 42,
          y = (random(i, 3) - 0.5) * 17;
        polygon(
          c,
          [
            [x - 5, y],
            [x, y - 3],
            [x + 6, y],
            [x + 1, y + 3],
          ],
          i % 2 ? '#e8d2a5' : '#b4a383',
        );
      }
    return finishBuilding(c, canvas, type, level);
  }
  if (['wall', 'gate', 'trap'].includes(type)) {
    for (let i = 0; i < 5; i++) {
      const x = -24 + i * 12,
        y = -12 + i * 6;
      box(c, x, y, 5, 2.5, type === 'trap' ? 13 : 34, '#b78149');
      polygon(
        c,
        [
          [x - 5, y - (type === 'trap' ? 13 : 34)],
          [x, y - (type === 'trap' ? 23 : 44)],
          [x + 5, y - (type === 'trap' ? 13 : 34)],
          [x, y - (type === 'trap' ? 10 : 31)],
        ],
        '#f1c584',
      );
    }
    if (type !== 'trap')
      for (const y of [-26, -12])
        line(
          c,
          [
            [-26, y - 12],
            [26, y + 14],
          ],
          '#755033',
          4,
        );
    if (type === 'gate') {
      line(
        c,
        [
          [-27, -51],
          [27, -24],
        ],
        '#deb675',
        7,
      );
      flag(c, -27, -64);
    }
    return finishBuilding(c, canvas, type, level);
  }
  if (type === 'fire') {
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      rock(c, Math.cos(a) * 20, Math.sin(a) * 9, 6, '#9fada0');
    }
    logs(c, -10, 4);
    polygon(
      c,
      [
        [-11, -5],
        [-4, -22],
        [0, -15],
        [5, -34],
        [14, -8],
        [8, 1],
        [-4, 2],
      ],
      '#f89c3c',
    );
    polygon(
      c,
      [
        [-4, 0],
        [0, -17],
        [7, -5],
        [4, 2],
      ],
      '#ffe592',
    );
    for (const x of [-43, 35]) box(c, x, 7, 14, 7, 7, '#bd874e');
    return finishBuilding(c, canvas, type, level);
  }
  if (type === 'plaza') {
    box(c, 0, 9, 48, 24, 5, '#c9bd95');
    tank(c, 0, 0, 26, 8, '#dfd6b2');
    ellipse(c, 0, -9, 21, 9, '#5fc7d8');
    tank(c, 0, -10, 7, 25, '#d8dfc4');
    ellipse(c, 0, -36, 14, 5, '#e6e6c7');
    ellipse(c, 0, -37, 11, 3, '#76d8e5');
    for (const x of [-36, 36]) flower(c, x, 1);
    return finishBuilding(c, canvas, type, level);
  }
  if (type === 'farm') {
    box(c, 0, 16, 72, 36, 4, '#86683e');
    for (let row = 0; row < 7; row++)
      for (let col = 0; col < 8; col++) {
        const x = (col - row) * 8,
          y = (col + row) * 4 - 42;
        line(
          c,
          [
            [x, y],
            [x, y - 11],
          ],
          '#d8a83a',
          1.5,
        );
        ellipse(c, x, y - 11, 2.4, 4.5, (row + col) % 3 ? '#ffda69' : '#eebb45');
        line(
          c,
          [
            [x, y - 5],
            [x - 3, y - 9],
          ],
          '#edc656',
          1,
        );
      }
    c.save();
    c.translate(29, 13);
    house(c, 25, 23, '#f3d99e', '#ce6e40');
    c.restore();
    for (const x of [-64, 58])
      line(
        c,
        [
          [x, 7],
          [x, -9],
        ],
        '#d2aa63',
        3,
      );
    barrel(c, -35, 21);
    return finishBuilding(c, canvas, type, level);
  }
  if (['quarry', 'mine', 'ironMine', 'crystalMine'].includes(type)) {
    box(c, 0, 8, 48, 24, 5, '#9caa94');
    rock(c, -8, -8, 40, '#82979a');
    rock(c, 21, -1, 26, '#a0b2ad');
    polygon(
      c,
      [
        [-22, -7],
        [7, 7],
        [7, -23],
        [-22, -37],
      ],
      '#354947',
    );
    line(
      c,
      [
        [-25, -7],
        [-25, -40],
        [10, -24],
        [10, 7],
      ],
      '#c79a5d',
      7,
    );
    line(
      c,
      [
        [-35, -46],
        [-35, -85],
        [28, -53],
        [28, -20],
      ],
      '#d7ac65',
      5,
    );
    line(
      c,
      [
        [-35, -82],
        [2, -26],
      ],
      '#9b7847',
      3,
    );
    line(
      c,
      [
        [27, -51],
        [27, -17],
      ],
      '#546365',
      1.5,
    );
    crate(c, 27, -6, 10);
    line(
      c,
      [
        [-17, 7],
        [5, 20],
      ],
      '#6e7670',
      3,
    );
    line(
      c,
      [
        [-5, 0],
        [17, 13],
      ],
      '#6e7670',
      3,
    );
    if (type !== 'quarry')
      for (let i = 0; i < 4; i++) {
        const x = -35 + i * 10,
          y = 9 + (i % 2) * 5;
        polygon(
          c,
          [
            [x - 5, y],
            [x - 4, y - 12],
            [x + 2, y - 18],
            [x + 6, y - 8],
            [x + 4, y + 2],
          ],
          type === 'crystalMine' ? '#79ebe3' : type === 'mine' ? '#dc9b67' : '#7c92a2',
        );
        line(
          c,
          [
            [x - 4, y - 12],
            [x + 2, y - 18],
            [x + 1, y],
          ],
          '#ffffff77',
        );
      }
    return finishBuilding(c, canvas, type, level);
  }
  if (['woodstore', 'stonestore', 'granary', 'warehouse', 'depot'].includes(type)) {
    box(c, 0, 5, w, w / 2, 6, '#afa884');
    if (type === 'granary') {
      tank(c, -14, -9, 21, 43, '#e5bc6e');
      roof(c, -14, -52, 22, 11, 16, '#c07940', true);
      crate(c, 23, 6);
      barrel(c, 39, -2);
    } else if (type === 'woodstore') {
      logs(c, -32, -11);
      logs(c, -29, 6);
      for (const x of [-43, 43])
        line(
          c,
          [
            [x, -15],
            [x, -55],
          ],
          '#b58448',
          5,
        );
      roof(c, 0, -44, 45, 22, 13, '#3f8b96');
    } else if (type === 'stonestore') {
      for (let i = 3; i >= 0; i--)
        box(c, -25 + (i % 2) * 23, 4 - Math.floor(i / 2) * 13, 14, 7, 11, '#bac5b7');
      crate(c, 28, 4);
    } else {
      house(c, w - 6, 39 + level * 4, '#e3c693', '#408c9a');
      polygon(
        c,
        [
          [8, -4],
          [35, -17],
          [35, -45],
          [8, -32],
        ],
        '#455953',
      );
      for (let i = 0; i < 3; i++) crate(c, 9 + i * 11, 5 - i * 5, 8);
      crate(c, -w + 6, 6, 11);
      barrel(c, -w + 25, 15);
    }
    return finishBuilding(c, canvas, type, level);
  }
  if (['tower', 'stoneTower', 'turret'].includes(type)) {
    box(c, 0, 4, 24, 12, 8, '#a4b6a4');
    if (type === 'tower') {
      for (const x of [-15, 15])
        line(
          c,
          [
            [x, 0],
            [x, -72],
          ],
          '#a87945',
          7,
        );
      line(
        c,
        [
          [-15, -8],
          [15, -58],
          [-15, -72],
          [15, -8],
        ],
        '#d5ac6c',
        3,
      );
      box(c, 0, -64, 25, 12, 13, '#dcb778');
      roof(c, 0, -77, 27, 13, 20, '#367e96');
      flag(c, -12, -116);
    } else {
      box(c, 0, 0, 20, 10, 74, '#becdc0');
      box(c, 0, -64, 26, 13, 16, '#a7bcb2');
      for (const x of [-20, 0, 20]) box(c, x, -77 + Math.abs(x) / 2, 5, 2.5, 10, '#d5dfca');
      windowPane(c, -15, -51, 1);
      if (type === 'turret') {
        tank(c, 0, -83, 15, 12, '#638f9e');
        line(
          c,
          [
            [0, -100],
            [33, -113],
          ],
          '#526f7d',
          9,
        );
        line(
          c,
          [
            [30, -112],
            [36, -114],
          ],
          '#a7e2e2',
          11,
        );
      } else flag(c, 0, -111);
    }
    return finishBuilding(c, canvas, type, level);
  }
  if (type === 'launchpad') {
    box(c, 0, 12, 73, 36, 8, '#779d9f');
    ellipse(c, 0, -13, 45, 21, '#d2dcca');
    ellipse(c, 0, -13, 37, 17, '#688b95');
    for (const x of [-40, 40]) {
      line(
        c,
        [
          [x, -18],
          [x, -119],
        ],
        '#dfad5b',
        5,
      );
      for (let y = -25; y > -110; y -= 19)
        line(
          c,
          [
            [x - 7, y],
            [x + 7, y - 17],
          ],
          '#edd090',
          2,
        );
    }
    tank(c, 0, -17, 15, 91, '#e4ece1');
    tank(c, 0, -55, 15, 9, '#4c9fae');
    polygon(
      c,
      [
        [-15, -108],
        [0, -138],
        [15, -108],
      ],
      '#ef9854',
    );
    polygon(
      c,
      [
        [-15, -48],
        [-28, -12],
        [-14, -19],
      ],
      '#d66f44',
    );
    polygon(
      c,
      [
        [15, -48],
        [28, -12],
        [14, -19],
      ],
      '#b15e3b',
    );
    ellipse(c, 0, -91, 6, 8, '#427c9c');
    ellipse(c, -2, -94, 2, 3, '#c5fbf3');
    flag(c, -40, -144);
    return finishBuilding(c, canvas, type, level);
  }
  if (
    [
      'charcoal',
      'forge',
      'smelter',
      'workshop',
      'engineering',
      'oilWell',
      'steelworks',
      'powerplant',
      'alloyWorks',
      'refinery',
      'electronicsFactory',
      'datacenter',
      'academy',
      'broadcast',
      'fusionReactor',
      'orbitalWorks',
      'spaceLab',
    ].includes(type)
  ) {
    industrial(c, type, w - 4, level);
    return finishBuilding(c, canvas, type, level);
  }
  if (['apartments', 'arcology'].includes(type)) {
    box(c, 0, 4, w, w / 2, 8, '#b7cdbb');
    const h = type === 'arcology' ? 96 : 77;
    box(c, 8, -8, 37, 18, h, '#deead6');
    box(c, -34, -24, 24, 12, h - 28, '#a4c8c1');
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 3; col++)
        windowPane(c, -22 + col * 15, -h - 13 + col * 7.5 + row * 18, 1);
    box(c, 8, -h - 8, 40, 20, 5, '#498c9e');
    if (type === 'arcology') {
      dome(c, 8, -h - 30, 27, '#64cfbf');
      for (const x of [-44, 35]) {
        tank(c, x, -5, 10, 8, '#cbd8be');
        ellipse(c, x, -18, 15, 12, '#74b750');
      }
    }
    flower(c, -37, 6);
    flower(c, 46, -3);
    return finishBuilding(c, canvas, type, level);
  }
  const civic = [
    'research',
    'library',
    'temple',
    'university',
    'bank',
    'observatory',
    'hospital',
  ].includes(type);
  if (civic) {
    house(
      c,
      w - 4,
      38 + level * 3,
      type === 'hospital' ? '#e2ead9' : '#eedcb4',
      type === 'temple' ? '#b46a48' : '#3e91a3',
    );
    if (['temple', 'bank', 'university'].includes(type)) {
      for (let i = 0; i < 3; i++) tank(c, -w + 13 + i * 14, -w / 2 + 9 + i * 7, 4, 27, '#f1e3b9');
      box(c, -w / 2, -w / 4 - 21, 25, 12, 4, '#ead9b3');
    }
    if (['research', 'observatory', 'university'].includes(type)) {
      tank(c, 0, -66, 20, 12, '#e5d7af');
      dome(c, 0, -79, 22, type === 'research' ? '#ddab4b' : '#52aabc');
      if (type === 'observatory') {
        line(
          c,
          [
            [4, -89],
            [25, -110],
          ],
          '#e1c17c',
          10,
        );
        ellipse(c, 27, -112, 7, 5, '#3d6d82');
      } else flag(c, -32, -101);
    }
    if (type === 'library') {
      box(c, -32, 7, 16, 8, 17, '#96663e');
      for (let i = 0; i < 5; i++)
        line(
          c,
          [
            [-43 + i * 5, -10 + i * 2.5],
            [-43 + i * 5, 0 + i * 2.5],
          ],
          ['#d87450', '#4f9ca4', '#e1b155'][i % 3],
          3,
        );
    }
    if (type === 'bank') {
      ellipse(c, 2, -70, 12, 12, '#efc85d');
      ellipse(c, 2, -70, 8, 8, '#c99741');
      line(
        c,
        [
          [-1, -75],
          [5, -75],
          [-1, -65],
          [5, -65],
        ],
        '#ffe9a4',
        2,
      );
    }
    if (type === 'hospital') {
      tank(c, -12, -73, 14, 8, '#dae5d8');
      line(
        c,
        [
          [-12, -89],
          [-12, -72],
        ],
        '#3da786',
        6,
      );
      line(
        c,
        [
          [-20, -81],
          [-4, -81],
        ],
        '#3da786',
        6,
      );
    }
    flower(c, -w + 5, 9);
    return finishBuilding(c, canvas, type, level);
  }
  const colors: Record<string, string> = {
    hut: '#e0b35d',
    cottage: '#388f9c',
    longhouse: '#c2703f',
    stoneHouse: '#498ea5',
    manor: '#497a96',
    townhouse: '#cd794a',
    lumber: '#448981',
    gatherer: '#78a94b',
    hunter: '#b08047',
    fishery: '#429da8',
    mill: '#c46c47',
    healer: '#4c9b84',
    market: '#d27d4e',
    barracks: '#4c7b9c',
    weaver: '#b881a5',
    paperMill: '#60a8a7',
    apothecary: '#5b9e89',
  };
  const wall =
    type === 'hut' ? '#edc88c' : type === 'lumber' || type === 'hunter' ? '#d6ac71' : '#f0d9aa';
  const height =
    type === 'hall'
      ? 48
      : type === 'manor' || type === 'townhouse'
        ? 57
        : type === 'mill'
          ? 60
          : 30 + level * 4;
  house(c, w - 6, height, wall, colors[type] ?? '#c87746', type === 'hut' || type === 'gatherer');
  if (type === 'hall') {
    c.save();
    c.translate(-18, -62);
    box(c, 0, 0, 20, 10, 29, '#f0d39b');
    windowPane(c, -14, -28, 1, true);
    roof(c, 0, -29, 23, 11, 24, '#3193a6');
    flag(c, -9, -72);
    c.restore();
    polygon(
      c,
      [
        [14, -43],
        [31, -51],
        [31, -30],
        [23, -21],
        [14, -26],
      ],
      '#318dae',
    );
    line(
      c,
      [
        [23, -43],
        [23, -32],
      ],
      '#ffe5a0',
      3,
    );
    flower(c, -62, 3);
  }
  if (type === 'barracks') {
    flag(c, -24, -93);
    polygon(
      c,
      [
        [8, -55],
        [25, -64],
        [25, -45],
        [17, -33],
        [8, -39],
      ],
      '#387c9f',
    );
    line(
      c,
      [
        [14, -54],
        [20, -43],
      ],
      '#f8e8b9',
      3,
    );
    line(
      c,
      [
        [21, -56],
        [13, -41],
      ],
      '#f8e8b9',
      3,
    );
    crate(c, 58, 3);
  }
  if (type === 'mill') {
    const cx = 15,
      cy = -88;
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + 0.4,
        ex = cx + Math.cos(a) * 36,
        ey = cy + Math.sin(a) * 36;
      line(
        c,
        [
          [cx, cy],
          [ex, ey],
        ],
        '#6e593c',
        3,
      );
      line(
        c,
        [
          [cx + Math.cos(a) * 15, cy + Math.sin(a) * 15],
          [ex, ey],
        ],
        '#fff1c5',
        8,
      );
      line(
        c,
        [
          [cx + Math.cos(a) * 15 + 2, cy + Math.sin(a) * 15 + 2],
          [ex + 2, ey + 2],
        ],
        '#d2ad70',
        2,
      );
    }
    ellipse(c, cx, cy, 5, 5, '#bb8848');
  }
  if (type === 'lumber') {
    logs(c, 14, 21);
    box(c, -35, 7, 18, 9, 9, '#b7874d');
    gear(c, -40, -14, 10, '#ccd3bd');
  }
  if (type === 'hunter') {
    line(
      c,
      [
        [3, -63],
        [-7, -72],
        [-10, -83],
      ],
      '#f2deac',
      2.5,
    );
    line(
      c,
      [
        [3, -63],
        [14, -75],
        [14, -84],
      ],
      '#f2deac',
      2.5,
    );
    line(
      c,
      [
        [-6, -74],
        [-15, -76],
      ],
      '#f2deac',
      2,
    );
    line(
      c,
      [
        [13, -75],
        [21, -77],
      ],
      '#f2deac',
      2,
    );
  }
  if (type === 'gatherer') {
    barrel(c, -35, 12);
    for (let i = 0; i < 7; i++)
      ellipse(c, -39 + (i % 3) * 4, random(i, 2) * 5 - 5, 2.5, 2.5, i % 2 ? '#d16b77' : '#f0bd51');
    flower(c, 33, 8);
  }
  if (type === 'fishery') {
    box(c, 45, 22, 30, 15, 3, '#c7985c');
    for (let i = 0; i < 5; i++)
      line(
        c,
        [
          [20 + i * 7, 6 + i * 3.5],
          [41 + i * 7, -5 + i * 3.5],
        ],
        '#efd097',
        2,
      );
    line(
      c,
      [
        [60, 14],
        [60, -23],
        [42, -31],
      ],
      '#725b3e',
      2,
    );
    for (let i = 0; i < 4; i++)
      line(
        c,
        [
          [38 + i * 6, -23 + i * 2],
          [44 + i * 6, -3 + i * 2],
        ],
        '#e2dfb9',
        1,
      );
    for (let i = 0; i < 4; i++)
      line(
        c,
        [
          [39 + i, -22 + i * 6],
          [58 + i, -14 + i * 6],
        ],
        '#e2dfb9',
        1,
      );
  }
  if (['healer', 'apothecary'].includes(type)) {
    box(c, 18, -22, 8, 4, 19, '#f4e5b7');
    ellipse(c, 17, -40, 4, 6, '#4e9b6f');
    barrel(c, -36, 8);
    ellipse(c, -36, -10, 7, 7, '#7eb563');
  }
  if (type === 'market' || type === 'weaver') {
    for (let i = 0; i < 5; i++)
      polygon(
        c,
        [
          [-w - 1 + i * 10, -w / 2 - 13 + i * 5],
          [-w + 9 + i * 10, -w / 2 - 8 + i * 5],
          [-w + 9 + i * 10, -w / 2 + 8 + i * 5],
          [-w - 1 + i * 10, -w / 2 + 3 + i * 5],
        ],
        i % 2 ? '#fff0cb' : type === 'weaver' ? '#a36694' : '#e19750',
      );
    crate(c, -35, 14);
    for (let i = 0; i < 5; i++)
      ellipse(c, -44 + i * 5, -2 + i * 2, 3, 3, ['#dc7752', '#edc766', '#83aa4b'][i % 3]);
  }
  if (type === 'paperMill') {
    gear(c, 32, -9, 16, '#b38954');
    box(c, -26, 16, 13, 6, 7, '#eee4c7');
  }
  if (type === 'cottage' || type === 'stoneHouse' || type === 'manor' || type === 'townhouse') {
    flower(c, -w + 2, 8);
    box(c, -w * 0.5, -height - w * 0.7, 7, 3.5, 19, '#b8b8a0');
  }
  if (level > 1) {
    box(c, -6, 10, 12, 6, 4, '#b3bb9e');
    for (let i = 0; i < level - 1; i++) ellipse(c, -5 + i * 8, -9, 2.4, 2.4, '#ffdc73');
  }
  return finishBuilding(c, canvas, type, level);
}
export function rock(c: Ctx, x: number, y: number, size: number, color: string) {
  polygon(
    c,
    [
      [x - size, y],
      [x - size * 0.7, y - size * 0.7],
      [x + size * 0.1, y - size],
      [x + size * 0.8, y - size * 0.5],
      [x + size, y],
      [x + size * 0.2, y + size * 0.3],
    ],
    gradient(c, y, size, color),
    '#42635535',
  );
  polygon(
    c,
    [
      [x - size, y],
      [x - size * 0.7, y - size * 0.7],
      [x + size * 0.1, y - size],
      [x, y],
    ],
    shade(color, 28),
  );
  polygon(
    c,
    [
      [x + size * 0.1, y - size],
      [x + size * 0.8, y - size * 0.5],
      [x, y],
    ],
    shade(color, 10),
  );
  line(
    c,
    [
      [x - size * 0.7, y - size * 0.7],
      [x + size * 0.1, y - size],
      [x + size * 0.8, y - size * 0.5],
    ],
    shade(color, 45),
    1.3,
  );
}
export function treeArt(variant: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 100;
  canvas.height = 140;
  const c = canvas.getContext('2d')!;
  c.translate(50, 120);
  c.scale(0.8 + (variant % 4) * 0.06, 0.8 + (variant % 4) * 0.06);
  ellipse(c, 5, 2, 28, 10, '#244b3234');
  line(
    c,
    [
      [-1, 0],
      [-2, -61],
    ],
    '#795538',
    8,
  );
  line(
    c,
    [
      [-3, -1],
      [-4, -61],
    ],
    '#c29a55',
    3,
  );
  line(
    c,
    [
      [-2, -28],
      [-16, -54],
    ],
    '#8e683b',
    4,
  );
  if (variant % 3 === 0) {
    for (let i = 0; i < 4; i++) {
      const y = -22 - i * 18,
        w = 31 - i * 5;
      polygon(
        c,
        [
          [-w, y],
          [0, y - 37],
          [w, y],
          [10, y + 8],
          [-12, y + 4],
        ],
        gradient(c, y, 40, ['#3c794b', '#488d50', '#5a9f53', '#70af5a'][i]),
      );
      polygon(
        c,
        [
          [-w, y],
          [0, y - 37],
          [0, y + 4],
        ],
        '#b8d96b24',
      );
      line(
        c,
        [
          [-w + 5, y - 2],
          [-13, y + 1],
          [0, y - 2],
        ],
        '#a0ca673d',
        1.5,
      );
    }
  } else {
    const centers = [
      [-13, -49, 23],
      [13, -53, 25],
      [-24, -70, 20],
      [22, -75, 20],
      [-5, -86, 29],
      [2, -65, 28],
    ];
    for (const [x, y, r] of centers) {
      const g = c.createRadialGradient(x - 7, y - 9, 2, x, y, r);
      g.addColorStop(0, variant === 5 ? '#c0cc65' : '#a2cc64');
      g.addColorStop(0.5, variant === 5 ? '#96b94f' : '#75b250');
      g.addColorStop(1, '#43874b');
      ellipse(c, x, y, r, r * 0.85, g);
    }
    for (let i = 0; i < 13; i++)
      ellipse(
        c,
        (random(i, variant + 4) - 0.5) * 49,
        -54 - random(i, variant + 8) * 44,
        3,
        1.5,
        '#d8e98a44',
      );
    if (variant === 2)
      for (let i = 0; i < 5; i++) {
        const x = (random(i, 3) - 0.5) * 40,
          y = -52 - random(i, 9) * 34;
        ellipse(c, x, y, 3, 3, '#e6a55d');
      }
  }
  return canvas;
}
const thumbs = new Map<string, string>();
export function thumbnail(type: string) {
  if (!thumbs.has(type)) thumbs.set(type, buildingArt(type).toDataURL());
  return thumbs.get(type)!;
}
