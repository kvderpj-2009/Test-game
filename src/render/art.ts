import { BUILDING } from '../game/data';
import { random } from '../game/world';
type Ctx = CanvasRenderingContext2D;
export const TILE_W = 64,
  TILE_H = 32;
export function iso(x: number, y: number) {
  return { x: ((x - y) * TILE_W) / 2, y: ((x + y) * TILE_H) / 2 };
}
export function uniso(x: number, y: number) {
  return { x: x / TILE_W + y / TILE_H, y: y / TILE_H - x / TILE_W };
}
export function polygon(c: Ctx, points: number[][], fill: string, stroke?: string) {
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
export function ellipse(c: Ctx, x: number, y: number, rx: number, ry: number, color: string) {
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
function box(c: Ctx, x: number, y: number, w: number, h: number, z: number, color: string) {
  polygon(
    c,
    [
      [x - w, y - h],
      [x, y],
      [x, y - z],
      [x - w, y - h - z],
    ],
    color,
  );
  polygon(
    c,
    [
      [x, y],
      [x + w, y - h],
      [x + w, y - h - z],
      [x, y - z],
    ],
    '#b4a082',
  );
  polygon(
    c,
    [
      [x - w, y - h - z],
      [x, y - 2 * h - z],
      [x + w, y - h - z],
      [x, y - z],
    ],
    '#e6d3ad',
  );
}
function crate(c: Ctx, x: number, y: number) {
  box(c, x, y, 7, 3.5, 9, '#b18a57');
  line(
    c,
    [
      [x - 6, y - 11],
      [x, y - 3],
      [x + 6, y - 11],
    ],
    '#775b3c',
    1,
  );
}
function barrel(c: Ctx, x: number, y: number) {
  ellipse(c, x, y, 5, 2.5, '#80623d');
  c.fillStyle = '#ae8a54';
  c.fillRect(x - 5, y - 10, 10, 10);
  ellipse(c, x, y - 10, 5, 2.5, '#c4a66d');
  line(
    c,
    [
      [x - 5, y - 7],
      [x, y - 5],
      [x + 5, y - 7],
    ],
    '#6e6250',
    1.4,
  );
}
export function buildingArt(type: string, level = 1): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 288;
  canvas.height = 260;
  const c = canvas.getContext('2d')!;
  c.translate(144, 180);
  const def = BUILDING[type],
    s = def.size;
  ellipse(c, 6, 3, s * 28, s * 12, '#344d3a25');
  if (type === 'bridge') {
    polygon(
      c,
      [
        [0, -16],
        [32, 0],
        [0, 16],
        [-32, 0],
      ],
      '#b89766',
      '#766345',
    );
    for (let i = 1; i < 8; i++) {
      const x = -32 + i * 8;
      line(
        c,
        [
          [x, -16 + Math.abs(x) / 2],
          [x, 16 - Math.abs(x) / 2],
        ],
        '#796749',
        1,
      );
    }
    return canvas;
  }
  if (type === 'road') {
    polygon(
      c,
      [
        [0, -16],
        [32, 0],
        [0, 16],
        [-32, 0],
      ],
      '#c4b99a',
    );
    for (let i = 0; i < 6; i++) {
      const x = (random(i, 1) - 0.5) * 35,
        y = (random(i, 3) - 0.5) * 15;
      polygon(
        c,
        [
          [x - 5, y],
          [x, y - 3],
          [x + 6, y],
          [x + 1, y + 3],
        ],
        i % 2 ? '#d9cdb0' : '#b5aa8f',
      );
    }
    return canvas;
  }
  if (type === 'wall' || type === 'gate' || type === 'trap') {
    if (type === 'trap') {
      for (let i = 0; i < 5; i++)
        line(
          c,
          [
            [-18 + i * 8, 4],
            [-22 + i * 8, -17],
          ],
          '#8b6947',
          4,
        );
    } else {
      for (let i = 0; i < 5; i++) {
        const x = -22 + i * 11,
          y = i * 5.5 - 10;
        polygon(
          c,
          [
            [x - 4, y],
            [x + 3, y - 3],
            [x + 3, y - 31],
            [x, y - 38],
            [x - 4, y - 33],
          ],
          i % 2 ? '#b29160' : '#a38154',
        );
      }
      line(
        c,
        [
          [-24, -23],
          [23, 0],
        ],
        '#6f543a',
        3,
      );
      line(
        c,
        [
          [-24, -9],
          [23, 14],
        ],
        '#6f543a',
        3,
      );
      if (type === 'gate') {
        line(
          c,
          [
            [-23, -42],
            [23, -20],
          ],
          '#80613f',
          6,
        );
      }
    }
    return canvas;
  }
  if (type === 'fire') {
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      ellipse(c, Math.cos(a) * 17, Math.sin(a) * 8, 5, 3.5, i % 2 ? '#bbb7a4' : '#969f8f');
    }
    line(
      c,
      [
        [-12, 2],
        [12, -3],
      ],
      '#70513a',
      5,
    );
    line(
      c,
      [
        [-9, -5],
        [10, 4],
      ],
      '#91633e',
      5,
    );
    polygon(
      c,
      [
        [-8, -2],
        [-11, -12],
        [-5, -9],
        [0, -28],
        [5, -17],
        [9, -23],
        [11, -5],
        [3, 1],
      ],
      '#e99a4e',
    );
    polygon(
      c,
      [
        [-4, -3],
        [0, -18],
        [5, -5],
        [2, 0],
      ],
      '#f5d48a',
    );
    return canvas;
  }
  if (type === 'plaza') {
    polygon(
      c,
      [
        [0, -29],
        [58, 0],
        [0, 29],
        [-58, 0],
      ],
      '#bcb49a',
      '#a39e86',
    );
    for (let i = -2; i <= 2; i++) {
      line(
        c,
        [
          [-50 + i * 8, i * 4],
          [i * 8, 25 + i * 4],
        ],
        '#d8cdb0',
      );
      line(
        c,
        [
          [i * 8, -25 + i * 4],
          [50 + i * 8, i * 4],
        ],
        '#d8cdb0',
      );
    }
    box(c, 0, 4, 12, 6, 12, '#c8b995');
    ellipse(c, 0, -8, 12, 6, '#7f9a86');
    return canvas;
  }
  polygon(
    c,
    [
      [0, -s * 15],
      [s * 30, 0],
      [0, s * 15],
      [-s * 30, 0],
    ],
    '#c3b996',
    '#aab18a',
  );
  if (type === 'farm') {
    polygon(
      c,
      [
        [0, -24],
        [75, 14],
        [24, 39],
        [-51, 1],
      ],
      '#8d7750',
    );
    for (let i = 0; i < 7; i++) {
      line(
        c,
        [
          [-42 + i * 9, 2 + i * 4.5],
          [4 + i * 9, -20 + i * 4.5],
        ],
        '#b19d5d',
        4,
      );
      for (let j = 0; j < 7; j++) {
        let x = -40 + i * 9 + j * 6,
          y = 2 + i * 4.5 - j * 3;
        line(
          c,
          [
            [x, y],
            [x, y - 9],
          ],
          '#d9bd67',
          2,
        );
        line(
          c,
          [
            [x, y - 5],
            [x - 3, y - 9],
          ],
          '#e4ce88',
          1,
        );
      }
    }
  }
  if (type === 'quarry' || type === 'mine') {
    for (let i = 0; i < 6; i++) {
      const x = -35 + random(i, 3) * 65,
        y = -10 + random(i, 5) * 24;
      rock(c, x, y, 12 + random(i, 9) * 11, type === 'mine' ? '#a8a18b' : '#a5aaa1');
    }
    line(
      c,
      [
        [15, 9],
        [15, -42],
        [40, -29],
      ],
      '#826843',
      5,
    );
    line(
      c,
      [
        [39, -29],
        [39, 0],
      ],
      '#d5c49d',
      1.5,
    );
    box(c, 37, 7, 9, 4.5, 8, '#aa8d5c');
    crate(c, -23, 18);
    return canvas;
  }
  if (type === 'woodstore') {
    for (let j = 0; j < 3; j++)
      for (let i = 0; i < 4 - j; i++) {
        const x = -20 + i * 12 + j * 6,
          y = 14 - j * 8;
        line(
          c,
          [
            [x, y],
            [x + 30, y - 15],
          ],
          '#916e45',
          9,
        );
        ellipse(c, x, y, 5, 4, '#d0b27e');
        ellipse(c, x, y, 2, 1.6, '#9c774f');
      }
    return canvas;
  }
  if (type === 'stonestore') {
    for (let i = 0; i < 12; i++)
      rock(c, (random(i, 3) - 0.5) * 65, random(i, 9) * 16, 8 + random(i, 7) * 7, '#a7afa8');
    crate(c, 30, 15);
    return canvas;
  }
  const isHall = type === 'hall',
    isTower = type === 'tower',
    isMill = type === 'mill';
  const w = isTower ? 17 : type === 'farm' ? 31 : Math.min(s * 22, 54),
    h = w * 0.5,
    H = isTower ? 72 : isHall ? 43 : 28 + level * 3;
  const R = isHall ? 33 : 24,
    y = type === 'farm' ? -17 : 10;
  c.save();
  if (type === 'farm') c.translate(-23, -9);
  box(c, 0, y, w, h, H, def.color);
  // Timber framing, plaster panels and warm recessed windows.
  for (const x of [-w, 0, w]) {
    const yy = y - Math.abs(x) * 0.5;
    line(
      c,
      [
        [x, yy],
        [x, yy - H],
      ],
      '#826c4c',
      2.5,
    );
  }
  line(
    c,
    [
      [-w, y - h - 3],
      [0, y - 3],
      [w, y - h - 3],
    ],
    '#8c7957',
    2,
  );
  line(
    c,
    [
      [-w, y - h - H + 3],
      [0, y - H + 3],
      [w, y - h - H + 3],
    ],
    '#8c7957',
    2,
  );
  polygon(
    c,
    [
      [7, y - 4],
      [18, y - 9.5],
      [18, y - 28],
      [7, y - 22.5],
    ],
    '#655c46',
  );
  polygon(
    c,
    [
      [9, y - 5],
      [16, y - 8.5],
      [16, y - 25],
      [9, y - 21.5],
    ],
    '#a78957',
  );
  const window = (x: number, yy: number, side: number) => {
    polygon(
      c,
      [
        [x, yy],
        [x + 10, yy + side * 5],
        [x + 10, yy + side * 5 - 12],
        [x, yy - 12],
      ],
      '#645f48',
    );
    polygon(
      c,
      [
        [x + 2, yy - 2],
        [x + 8, yy + side * 3 - 2],
        [x + 8, yy + side * 3 - 10],
        [x + 2, yy - 10],
      ],
      '#efcb7c',
    );
    line(
      c,
      [
        [x + 5, yy - 1],
        [x + 5, yy - 11],
      ],
      '#8e7853',
      1,
    );
  };
  window(-w + 10, y - h + 3, 1);
  if (w > 32) window(-18, y - 11, 1);
  if (w > 30) window(w - 17, y - h + 1, -1);
  const A = [-w - 6, y - h - H],
    B = [0, y - H + 6],
    C = [w + 6, y - h - H],
    D = [0, y - 2 * h - H - 6],
    E = [-w * 0.5, y - h * 1.5 - H - R],
    F = [w * 0.5, y - h * 0.5 - H - R];
  polygon(c, [E, F, C, D], def.roof);
  polygon(c, [B, C, F], def.color, '#826c4c');
  polygon(c, [A, B, F, E], def.roof, '#775d43');
  c.save();
  c.beginPath();
  [A, B, F, E].forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
  c.closePath();
  c.clip();
  for (let i = 1; i < 8; i++) {
    const k = i / 8;
    line(
      c,
      [
        [A[0] + (E[0] - A[0]) * k, A[1] + (E[1] - A[1]) * k],
        [B[0] + (F[0] - B[0]) * k, B[1] + (F[1] - B[1]) * k],
      ],
      '#ffedc222',
      1.2,
    );
  }
  for (let i = -6; i < 12; i++)
    line(
      c,
      [
        [i * 9, y - H + 15],
        [i * 9 + 27, y - H - 65],
      ],
      '#3b3b3020',
    );
  c.restore();
  line(c, [A, B, C], '#775d43', 2.5);
  line(c, [E, F], '#eed4a355', 2);
  if (isHall || type === 'barracks' || isTower) {
    const fx = isHall ? -w * 0.5 : 0,
      fy = y - H - R - 6;
    line(
      c,
      [
        [fx, fy + 12],
        [fx, fy - 21],
      ],
      '#6f6449',
      2,
    );
    polygon(
      c,
      [
        [fx, fy - 21],
        [fx + 21, fy - 17],
        [fx + 16, fy - 7],
        [fx, fy - 9],
      ],
      type === 'barracks' ? '#a66b5a' : '#547d76',
    );
    polygon(
      c,
      [
        [fx + 8, fy - 17],
        [fx + 12, fy - 15],
        [fx + 8, fy - 12],
        [fx + 4, fy - 15],
      ],
      '#d8c79b',
    );
  }
  if (type === 'research') {
    box(c, -8, y - h - H - R + 5, 8, 4, 7, '#c1b69e');
    ellipse(c, -8, y - h - H - R - 3, 6, 3, '#cfb675');
  }
  if (type === 'workshop' || type === 'smelter' || isHall) {
    box(c, -w * 0.6, y - h - H, 7, 3.5, 22, '#a6a28e');
    polygon(
      c,
      [
        [-w * 0.6 - 7, y - h - H - 25],
        [-w * 0.6, y - h - H - 29],
        [-w * 0.6 + 7, y - h - H - 25],
        [-w * 0.6, y - h - H - 21],
      ],
      '#5c665d',
    );
  }
  if (isMill) {
    line(
      c,
      [
        [17, y - H - 12],
        [17, y - H - 66],
      ],
      '#806c4f',
      3,
    );
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + 0.6,
        x = 17,
        y0 = y - H - 27;
      line(
        c,
        [
          [x, y0],
          [x + Math.cos(a) * 30, y0 + Math.sin(a) * 30],
        ],
        '#e3d7b8',
        5,
      );
      line(
        c,
        [
          [x + Math.cos(a) * 12, y0 + Math.sin(a) * 12],
          [x + Math.cos(a) * 30, y0 + Math.sin(a) * 30],
        ],
        '#b4a283',
        9,
      );
    }
    ellipse(c, 17, y - H - 27, 4, 4, '#806c4f');
  }
  if (type === 'market') {
    polygon(
      c,
      [
        [-w - 5, y - 7],
        [0, y + 15],
        [0, y - 5],
        [-w - 5, y - 27],
      ],
      '#c08b60',
    );
    for (let i = 0; i < 4; i++)
      polygon(
        c,
        [
          [-w + i * 11, y - 5 + i * 5.5],
          [-w + i * 11 + 6, y - 2 + i * 5.5],
          [-w + i * 11 + 6, y - 22 + i * 5.5],
          [-w + i * 11, y - 25 + i * 5.5],
        ],
        '#ead9b4',
      );
  }
  c.restore();
  if (!isTower) {
    crate(c, w - 1, 15);
    barrel(c, -w - 6, 3);
    ellipse(c, -w + 6, 17, 9, 5, '#567b50');
    for (let i = 0; i < 4; i++)
      ellipse(c, -w + 2 + i * 3, 13 + Math.sin(i) * 3, 2.5, 2.5, i % 2 ? '#d1a9a0' : '#eddb9c');
  }
  if (type === 'fishery') {
    line(
      c,
      [
        [30, 20],
        [56, 7],
      ],
      '#b1966a',
      8,
    );
    line(
      c,
      [
        [50, 10],
        [50, -12],
      ],
      '#7d6e4d',
      2,
    );
    line(
      c,
      [
        [50, -12],
        [66, -3],
        [62, 10],
      ],
      '#c6c6aa',
      1,
    );
  }
  if (type === 'healer') {
    c.fillStyle = '#ded2ae';
    c.fillRect(9, -34, 13, 14);
    c.fillStyle = '#a57168';
    c.fillRect(14, -32, 3, 10);
    c.fillRect(11, -29, 9, 3);
  }
  if (type === 'lumber') {
    for (let i = 0; i < 3; i++) {
      line(
        c,
        [
          [20 + i * 7, 25],
          [39 + i * 7, 15],
        ],
        '#947347',
        7,
      );
      ellipse(c, 20 + i * 7, 25, 4, 3, '#d4b880');
    }
  }
  return canvas;
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
    color,
  );
  polygon(
    c,
    [
      [x - size, y],
      [x - size * 0.7, y - size * 0.7],
      [x + size * 0.1, y - size],
      [x, y],
    ],
    '#ccd0b440',
  );
  line(
    c,
    [
      [x, y],
      [x + size * 0.1, y - size],
    ],
    '#566b5b40',
  );
}
export function treeArt(variant: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 100;
  canvas.height = 140;
  const c = canvas.getContext('2d')!;
  c.translate(50, 120);
  const size = 0.8 + (variant % 4) * 0.08;
  c.scale(size, size);
  ellipse(c, 8, 0, 24, 9, '#2b493729');
  line(
    c,
    [
      [0, 0],
      [-2, -56],
    ],
    '#7c6d45',
    6,
  );
  line(
    c,
    [
      [-1, -24],
      [-14, -49],
    ],
    '#786c45',
    3,
  );
  if (variant % 3 === 0) {
    const colors = ['#345b48', '#4b7051', '#6f8a56'];
    for (let i = 0; i < 4; i++) {
      const y = -24 - i * 19,
        w = 34 - i * 5;
      polygon(
        c,
        [
          [-w, y],
          [0, y - 43],
          [w, y],
          [10, y + 8],
          [-13, y + 5],
        ],
        colors[i % 3],
      );
      polygon(
        c,
        [
          [0, y - 43],
          [0, y + 4],
          [-w, y],
        ],
        '#a5b86c21',
      );
    }
  } else {
    const colors =
      variant % 2
        ? ['#4e7853', '#6f9059', '#85a364', '#9aac6a']
        : ['#526e4c', '#758957', '#8ea164', '#a5af75'];
    for (let i = 0; i < 9; i++) {
      const x = (random(i, variant + 6) - 0.5) * 42,
        y = -48 - random(i, variant + 1) * 40;
      ellipse(c, x, y, 18 + random(i, 3) * 8, 18 + random(i, 6) * 9, colors[i % 4]);
    }
    for (let i = 0; i < 10; i++)
      ellipse(c, (random(i, 6) - 0.5) * 39, -49 - random(i, 9) * 33, 3, 2, '#c5cd8a22');
  }
  return canvas;
}
const thumbs = new Map<string, string>();
export function thumbnail(type: string) {
  if (!thumbs.has(type)) thumbs.set(type, buildingArt(type).toDataURL());
  return thumbs.get(type)!;
}
