import { BUILDING } from '../game/data';
import { box, ellipse, gradient, line, polygon } from './shapes';
type Ctx = CanvasRenderingContext2D;
const early = new Set([
  'hall',
  'hut',
  'cottage',
  'longhouse',
  'lumber',
  'quarry',
  'gatherer',
  'hunter',
  'fishery',
  'farm',
  'mill',
  'workshop',
  'granary',
  'woodstore',
  'stonestore',
  'warehouse',
  'plaza',
  'research',
  'healer',
  'market',
  'barracks',
  'tower',
  'wall',
  'gate',
  'trap',
  'road',
  'mine',
  'smelter',
  'stoneHouse',
]);
/** Three visual families, shared by thumbnails, world sprites and pixel picking. */
export function buildingAppearance(type: string, age: number) {
  return early.has(type) && age < 3 ? (age === 0 ? 0 : 1) : 2;
}
function stone(c: Ctx, x: number, y: number, size: number, color = '#b1b5a0') {
  polygon(
    c,
    [
      [x - size, y],
      [x - size * 0.6, y - size * 0.9],
      [x + size * 0.3, y - size],
      [x + size, y - size * 0.2],
      [x + size * 0.5, y + size * 0.25],
    ],
    gradient(c, y, size, color),
  );
  polygon(
    c,
    [
      [x - size * 0.6, y - size * 0.9],
      [x + size * 0.3, y - size],
      [x + size * 0.08, y - size * 0.22],
      [x - size, y],
    ],
    '#e4e4cb66',
  );
}
function logs(c: Ctx, x: number, y: number, n = 4) {
  for (let i = 0; i < n; i++) {
    const xx = x + (i % 3) * 8,
      yy = y - Math.floor(i / 3) * 7;
    line(
      c,
      [
        [xx - 17, yy - 12],
        [xx + 3, yy],
      ],
      '#795a36',
      7,
    );
    line(
      c,
      [
        [xx - 17, yy - 14],
        [xx + 3, yy - 2],
      ],
      '#ba8e53',
      2,
    );
    ellipse(c, xx + 3, yy, 4, 3, '#d6b77c');
    ellipse(c, xx + 3, yy, 2, 1.5, '#92693b');
  }
}
function basket(c: Ctx, x: number, y: number, full = true) {
  polygon(
    c,
    [
      [x - 7, y - 11],
      [x + 7, y - 11],
      [x + 5, y],
      [x - 5, y],
    ],
    '#ac8950',
  );
  ellipse(c, x, y - 11, 7, 3, full ? '#e6cb7c' : '#695533');
  for (let j = 0; j < 3; j++)
    line(
      c,
      [
        [x - 6, y - 8 + j * 3],
        [x + 6, y - 8 + j * 3],
      ],
      '#d8b87c',
      1,
    );
}
function hide(c: Ctx, x: number, y: number, w: number) {
  for (const dx of [-w, w])
    line(
      c,
      [
        [x + dx, y],
        [x + dx, y - 46],
      ],
      '#775635',
      4,
    );
  polygon(
    c,
    [
      [x - w - 4, y - 43],
      [x - 8, y - 64],
      [x + w + 3, y - 43],
      [x + 8, y - 27],
    ],
    gradient(c, y - 27, 37, '#c7a16c'),
    '#936d42',
  );
  line(
    c,
    [
      [x - 8, y - 64],
      [x + 8, y - 27],
    ],
    '#ead6a3',
    2,
  );
  for (let i = 0; i < 4; i++)
    line(
      c,
      [
        [x - 5 + i * 3, y - 58 + i * 8],
        [x + 1 + i * 3, y - 60 + i * 8],
      ],
      '#836b46',
      1,
    );
}
function hut(c: Ctx, w: number, h: number, level: number, phase: number, reed = true) {
  const ground = phase ? '#bd9c71' : '#ad8b5d';
  ellipse(c, 0, -5, w + 5, w * 0.33, '#c4b28a');
  c.fillStyle = gradient(c, 0, h, ground);
  c.beginPath();
  c.moveTo(-w, -h);
  c.lineTo(-w, -9);
  c.bezierCurveTo(-w, 12, w, 12, w, -9);
  c.lineTo(w, -h);
  c.closePath();
  c.fill();
  for (let x = -w + 6; x < w; x += 10) {
    const yy = -5 + Math.sqrt(Math.max(0, 1 - (x * x) / (w * w))) * 7;
    line(
      c,
      [
        [x, -h],
        [x, yy],
      ],
      '#82674166',
      2,
    );
    if (!phase)
      for (let y = -h + 6; y < yy; y += 7)
        line(
          c,
          [
            [x - 4, y],
            [x + 4, y + 1],
          ],
          '#d4b57c77',
          1,
        );
  }
  // An open entrance: no glazed windows, dressed masonry or tiled roof.
  c.fillStyle = '#4d4731';
  c.beginPath();
  c.moveTo(5, 4);
  c.lineTo(5, -h + 8);
  c.quadraticCurveTo(16, -h - 3, 27, -h + 8);
  c.lineTo(27, 0);
  c.closePath();
  c.fill();
  line(
    c,
    [
      [5, 2],
      [5, -h + 7],
      [16, -h + 1],
      [27, -h + 7],
      [27, 0],
    ],
    '#735334',
    3,
  );
  const peak = -h - w * 0.85 - 10;
  c.beginPath();
  c.moveTo(-w - 7, -h + 1);
  c.quadraticCurveTo(-w * 0.45, peak + 18, -3, peak);
  c.quadraticCurveTo(w * 0.5, peak + 20, w + 7, -h + 1);
  c.quadraticCurveTo(0, -h + 29, -w - 7, -h + 1);
  c.closePath();
  c.fillStyle = gradient(c, -h + 10, w, reed ? '#c5a55e' : '#b9996b');
  c.fill();
  for (let i = 0; i <= 24; i++) {
    const x = -w - 5 + ((2 * w + 10) * i) / 24;
    const y = -h + 2 + 13 * Math.sin((i / 24) * Math.PI);
    line(
      c,
      [
        [-3 + (i - 12) * 0.25, peak + 9],
        [x * 0.52, peak + (y - peak) * 0.58],
        [x, y],
      ],
      i % 3 === 0 ? '#e9ce87aa' : '#8b703d55',
      i % 3 === 0 ? 1.7 : 1,
    );
  }
  line(
    c,
    [
      [-8, peak + 3],
      [4, peak - 2],
    ],
    '#785631',
    3,
  );
  for (let i = 0; i < level; i++) basket(c, -w + 9 + i * 12, 7);
  for (let i = 0; i < 5; i++) stone(c, -w + 6 + (i * (2 * w - 12)) / 4, 9 + Math.sin(i) * 3, 4);
}
function quern(c: Ctx, x: number, y: number) {
  ellipse(c, x, y, 17, 8, '#818d7d');
  ellipse(c, x, y - 4, 16, 7, '#c2c3a7');
  ellipse(c, x + 2, y - 7, 9, 4, '#e1ddba');
  line(
    c,
    [
      [x + 6, y - 8],
      [x + 7, y - 16],
    ],
    '#8f683a',
    3,
  );
  basket(c, x - 25, y - 1);
}
export function earlyBuilding(type: string, level: number, phase: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 288;
  canvas.height = 260;
  const c = canvas.getContext('2d')!;
  c.translate(144, 180);
  const size = BUILDING[type].size,
    w = size * 21;
  if (type !== 'road') ellipse(c, 4, 7, w + 12, w * 0.4 + 6, '#27483729');
  if (type === 'road') {
    polygon(
      c,
      [
        [-32, 0],
        [0, -16],
        [32, 0],
        [0, 16],
      ],
      '#bea777',
    );
    polygon(
      c,
      [
        [-28, 0],
        [0, -13],
        [28, 0],
        [0, 13],
      ],
      '#cdb985',
    );
    for (let i = 0; i < 7; i++) {
      const x = ((i * 17) % 45) - 22,
        y = ((i * 7) % 12) - 6;
      ellipse(c, x, y, 2, 1, '#a4916744');
    }
  } else if (type === 'wall' || type === 'gate') {
    for (let i = 0; i < 7; i++) {
      if (type === 'gate' && i > 1 && i < 5) continue;
      const x = (i - 3) * 8,
        y = x * 0.5;
      line(
        c,
        [
          [x, y],
          [x, y - 39 - level * 3],
        ],
        i % 2 ? '#a4834d' : '#87683e',
        7,
      );
      polygon(
        c,
        [
          [x - 3, y - 39 - level * 3],
          [x, y - 46 - level * 3],
          [x + 3, y - 39 - level * 3],
        ],
        '#c6a675',
      );
    }
    line(
      c,
      [
        [-24, -22],
        [24, 2],
      ],
      '#d0b47c',
      3,
    );
    if (type === 'gate')
      line(
        c,
        [
          [-24, -48],
          [24, -24],
        ],
        '#9c7747',
        7,
      );
  } else if (type === 'trap') {
    ellipse(c, 0, 0, 22, 10, '#5e5f3b');
    for (let i = 0; i < 6; i++)
      line(
        c,
        [
          [-19 + i * 7, -5],
          [0, -22 - (i % 2) * 6],
        ],
        '#b89b60',
        3,
      );
  } else if (type === 'plaza') {
    ellipse(c, 0, -6, 40, 19, '#c5b084');
    for (let i = 0; i < 9; i++) stone(c, 32 * Math.cos(i * 0.7), -6 + 13 * Math.sin(i * 0.7), 7);
    stone(c, 0, -8, 14);
  } else if (
    type === 'hall' ||
    ['hut', 'cottage', 'longhouse', 'stoneHouse', 'barracks', 'warehouse'].includes(type)
  ) {
    hut(c, type === 'hall' ? 60 : w, type === 'hall' ? 35 : 25, level, phase, type !== 'barracks');
    if (type === 'hall') {
      logs(c, -62, 4, 5);
      line(
        c,
        [
          [49, -8],
          [49, -78],
        ],
        '#795e36',
        4,
      );
      polygon(
        c,
        [
          [49, -77],
          [70, -72],
          [65, -59],
          [49, -64],
        ],
        '#ba7551',
      );
      line(
        c,
        [
          [54, -73],
          [61, -66],
          [55, -62],
        ],
        '#f0d99c',
        2,
      );
    }
    if (type === 'barracks') {
      for (const x of [-39, -28, -17]) {
        line(
          c,
          [
            [x, 7],
            [x, -35],
          ],
          '#805d37',
          3,
        );
        stone(c, x, -36, 5);
      }
    }
  } else if (type === 'research') {
    hide(c, -4, -8, 35);
    stone(c, 13, -2, 22, '#c4bc97');
    // Ochre carvings make the knowledge hut identifiable, even in Stone Age.
    ellipse(c, 13, -19, 4, 4, '#a75f3f');
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      line(
        c,
        [
          [13 + Math.cos(a) * 7, -19 + Math.sin(a) * 7],
          [13 + Math.cos(a) * 10, -19 + Math.sin(a) * 10],
        ],
        '#a75f3f',
        1.7,
      );
    }
    line(
      c,
      [
        [1, -4],
        [6, -9],
        [12, -5],
      ],
      '#a75f3f',
      2,
    );
    basket(c, -29, 5);
    stone(c, 34, 8, 6);
  } else if (type === 'tower') {
    for (const x of [-24, 24])
      line(
        c,
        [
          [x, 5],
          [x, -80],
        ],
        '#8b6b3e',
        7,
      );
    line(
      c,
      [
        [-24, -4],
        [24, -68],
      ],
      '#b18b50',
      4,
    );
    line(
      c,
      [
        [24, -4],
        [-24, -68],
      ],
      '#b18b50',
      4,
    );
    box(c, 0, -65, 30, 15, 6, '#ad8c56');
    c.save();
    c.translate(0, -72);
    hide(c, 0, 0, 24);
    c.restore();
  } else if (['woodstore', 'stonestore', 'granary'].includes(type)) {
    if (type === 'woodstore') {
      logs(c, -25, -8, 9);
      logs(c, -15, 9, 8);
    } else if (type === 'stonestore') {
      for (let i = 0; i < 9; i++) stone(c, -26 + (i % 3) * 21, 8 - Math.floor(i / 3) * 10, 13);
    } else {
      hut(c, 25, 31, level, phase);
      basket(c, 33, 8);
      basket(c, 21, 14);
    }
  } else if (type === 'farm') {
    polygon(
      c,
      [
        [-60, -9],
        [0, -39],
        [62, -8],
        [1, 23],
      ],
      '#997446',
    );
    for (let row = 0; row < 5; row++)
      for (let j = 0; j < 7; j++) {
        const x = (j - 3) * 12 + row * 3,
          y = (j - 3) * -5 + row * 6 - 8;
        line(
          c,
          [
            [x, y],
            [x, y - 12],
          ],
          '#cfb966',
          2,
        );
        line(
          c,
          [
            [x - 3, y - 8],
            [x, y - 12],
            [x + 3, y - 9],
          ],
          '#e5cc75',
          2,
        );
      }
    c.save();
    c.translate(17, -37);
    hut(c, 22, 18, 1, phase);
    c.restore();
    basket(c, -40, 14);
  } else if (type === 'mine' || type === 'quarry') {
    for (let i = 0; i < 7; i++)
      stone(c, -37 + i * 12, -16 - Math.sin(i * 0.52) * 20, 18 + (i % 3) * 3);
    if (type === 'mine') {
      ellipse(c, 0, -14, 14, 18, '#494e3b');
      line(
        c,
        [
          [-15, -2],
          [-15, -35],
          [14, -35],
          [14, -2],
        ],
        '#9d7c49',
        5,
      );
    }
    stone(c, 29, 7, 14);
    stone(c, -22, 9, 9);
    logs(c, -36, 16, 2);
  } else if (type === 'smelter') {
    ellipse(c, 0, 0, 27, 13, '#89816a');
    hut(c, 24, 35, 1, phase, false);
    polygon(
      c,
      [
        [8, 1],
        [11, -22],
        [20, -4],
        [24, -16],
        [27, 0],
      ],
      '#e69d44',
    );
    ellipse(c, 17, 0, 8, 3, '#f7cd64');
    logs(c, -34, 10, 4);
  } else {
    // Open shelters with trade-specific tools instead of later workshops and windmills.
    if (['gatherer', 'hunter', 'healer'].includes(type)) {
      c.save();
      c.translate(7, -4);
      hut(c, 29, 22, level, phase, type !== 'hunter');
      c.restore();
    } else hide(c, 0, -10, 34);
    if (type === 'lumber') {
      logs(c, -29, 11, 7);
      line(
        c,
        [
          [23, 5],
          [24, -22],
        ],
        '#85653b',
        4,
      );
      stone(c, 25, -24, 7);
    } else if (type === 'mill') quern(c, 9, 5);
    else if (type === 'workshop') {
      box(c, 0, 0, 25, 12, 13, '#9b7947');
      for (let i = 0; i < 4; i++) stone(c, -13 + i * 9, -18 + (i % 2) * 3, 5);
      logs(c, -33, 12, 3);
    } else if (type === 'fishery') {
      line(
        c,
        [
          [-30, -26],
          [36, -8],
        ],
        '#967640',
        3,
      );
      for (let i = 0; i < 6; i++)
        line(
          c,
          [
            [-26 + i * 9, -24 + i * 2],
            [-20 + i * 8, -5 + i * 2],
          ],
          '#dfcf97',
          1,
        );
      basket(c, 25, 9);
    } else if (type === 'hunter') {
      line(
        c,
        [
          [-36, 8],
          [-36, -28],
          [-16, -25],
          [-16, 9],
        ],
        '#896137',
        3,
      );
      polygon(
        c,
        [
          [-33, -24],
          [-20, -21],
          [-22, -3],
          [-30, -5],
        ],
        '#b79566',
      );
    } else if (type === 'healer' || type === 'gatherer') {
      for (let i = 0; i < 4; i++) {
        basket(c, -35 + i * 9, 6 + (i % 2) * 5);
        ellipse(c, -35 + i * 9, -7 + (i % 2) * 5, 5, 3, type === 'healer' ? '#83a15b' : '#b46f4f');
      }
    } else {
      basket(c, -24, 10);
      basket(c, -7, 15);
      basket(c, 24, 6);
    }
  }
  // Additional baskets and raw stone markers show upgrades without medieval ornaments.
  if (level > 1 && !['wall', 'gate', 'road', 'trap'].includes(type))
    for (let i = 1; i < level; i++) stone(c, w - 7 + i * 7, 16, 4);
  return canvas;
}
