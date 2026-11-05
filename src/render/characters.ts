import { Rectangle, Texture } from 'pixi.js';
import { ellipse, line, polygon } from './art';
type Ctx = CanvasRenderingContext2D;
export type Activity = 'idle' | 'walk' | 'carry' | 'work';
const WIDTH = 64,
  HEIGHT = 80,
  FOOT = 66,
  FRAMES = 8;
/** Each sheet is uploaded once. Walking advances with distance, not the simulation clock. */
export class CharacterAtlas {
  private sheets = new Map<string, Texture[]>();
  texture(kind: string, activity: Activity, frame: number) {
    const key = kind + ':' + activity;
    if (!this.sheets.has(key)) {
      const canvas = document.createElement('canvas');
      canvas.width = WIDTH * FRAMES;
      canvas.height = HEIGHT;
      const c = canvas.getContext('2d')!;
      for (let i = 0; i < FRAMES; i++) {
        c.save();
        c.translate(i * WIDTH + WIDTH / 2, FOOT);
        draw(c, kind, activity, (i / FRAMES) * Math.PI * 2);
        c.restore();
      }
      const source = Texture.from(canvas).source;
      this.sheets.set(
        key,
        Array.from(
          { length: FRAMES },
          (_, i) => new Texture({ source, frame: new Rectangle(i * WIDTH, 0, WIDTH, HEIGHT) }),
        ),
      );
    }
    return this.sheets.get(key)![frame % FRAMES];
  }
}
function draw(c: Ctx, kind: string, activity: Activity, phase: number) {
  const worker = kind.startsWith('worker'),
    walking = activity === 'walk' || activity === 'carry',
    step = walking ? Math.sin(phase) * 4 : 0;
  const bob = walking ? Math.abs(Math.cos(phase)) * 1.2 : Math.sin(phase) * 0.3;
  ellipse(
    c,
    1,
    2,
    kind === 'knight' ? 17 : kind === 'cannon' || kind === 'catapult' ? 20 : 9,
    3.5,
    '#204d3d45',
  );
  if (kind === 'drone') {
    const hover = Math.sin(phase) * 1.2;
    line(
      c,
      [
        [-16, -31 + hover],
        [16, -18 + hover],
      ],
      '#526f83',
      4,
    );
    line(
      c,
      [
        [-16, -18 + hover],
        [16, -31 + hover],
      ],
      '#526f83',
      4,
    );
    for (const x of [-16, 16])
      for (const y of [-18, -31]) {
        ellipse(c, x, y + hover, 9, 2, '#b8e9e4aa');
        line(
          c,
          [
            [x - 6 * Math.cos(phase), y + hover],
            [x + 6 * Math.cos(phase), y + hover],
          ],
          '#eefafa',
          1,
        );
      }
    ellipse(c, 0, -25 + hover, 10, 6, '#6abac6');
    ellipse(c, -2, -27 + hover, 5, 2, '#c4f3ee');
    ellipse(c, 5, -23 + hover, 3, 2, '#ffd783');
    return;
  }
  if (kind === 'cannon' || kind === 'catapult') {
    polygon(
      c,
      [
        [-19, -9],
        [3, -19],
        [22, -10],
        [0, 1],
      ],
      '#ae814b',
      '#735b3c',
    );
    for (const x of [-13, 13]) {
      ellipse(c, x, -2, 7, 8, '#67583f');
      ellipse(c, x, -2, 4.5, 5.5, '#d2b172');
      line(
        c,
        [
          [x - 4 * Math.cos(phase), -2 - 5 * Math.sin(phase)],
          [x + 4 * Math.cos(phase), -2 + 5 * Math.sin(phase)],
        ],
        '#806440',
        2,
      );
    }
    if (kind === 'cannon') {
      line(
        c,
        [
          [-7, -16],
          [21, -30],
        ],
        '#4c6674',
        12,
      );
      line(
        c,
        [
          [-6, -19],
          [20, -33],
        ],
        '#88a8a8',
        3,
      );
      ellipse(c, 23, -31, 6, 7, '#334d57');
      ellipse(c, 24, -32, 3, 4, '#233c43');
    } else {
      line(
        c,
        [
          [-6, -10],
          [2, -33],
          [12, -14],
        ],
        '#d3a25b',
        4,
      );
      line(
        c,
        [
          [-14, -17],
          [12, -39 + (activity === 'work' ? Math.sin(phase) * 5 : 0)],
        ],
        '#886135',
        4,
      );
      ellipse(c, 14, -40, 8, 4, '#ad8448');
      ellipse(c, 14, -43, 5, 5, '#9ca99d');
    }
    return;
  }
  const mounted = kind === 'knight';
  if (mounted) {
    line(
      c,
      [
        [-12, -7],
        [-14 + step, 1],
      ],
      '#644c38',
      4,
    );
    line(
      c,
      [
        [10, -7],
        [11 - step, 1],
      ],
      '#644c38',
      4,
    );
    ellipse(c, -1, -16, 17, 9, '#ab7850');
    ellipse(c, -5, -19, 11, 5, '#c09560');
    line(
      c,
      [
        [11, -16],
        [17, -31],
      ],
      '#ab7850',
      9,
    );
    ellipse(c, 18, -31, 7, 5, '#b98b58');
    ellipse(c, 20, -33, 1, 1, '#253e3e');
    line(
      c,
      [
        [12, -20],
        [12, -31],
      ],
      '#5d4e3b',
      4,
    );
    line(
      c,
      [
        [-16, -17],
        [-21, -10],
      ],
      '#665039',
      3,
    );
    c.translate(-4, -15);
  }
  c.translate(0, -bob);
  const skin = worker && kind === 'worker2' ? '#c98f64' : '#f0c897';
  const armor = ['sentinel', 'orbitalGuard'].includes(kind);
  const tunic = worker
    ? ['#e0ad55', '#3a9fa6', '#d27d5a'][Number(kind.slice(-1)) % 3]
    : armor
      ? '#90c8d0'
      : kind === 'bronzeGuard'
        ? '#c39658'
        : '#498cac';
  line(
    c,
    [
      [-3, -10],
      [-4 + step, 0],
    ],
    '#5d5a44',
    4,
  );
  line(
    c,
    [
      [4, -10],
      [4 - step, 0],
    ],
    '#5d5a44',
    4,
  );
  line(
    c,
    [
      [-4 + step, -1],
      [-2 + step, 0],
    ],
    '#423e32',
    4,
  );
  line(
    c,
    [
      [4 - step, -1],
      [7 - step, 0],
    ],
    '#423e32',
    4,
  );
  polygon(
    c,
    [
      [-7, -23],
      [5, -24],
      [8, -10],
      [-6, -9],
    ],
    tunic,
    '#46604d55',
  );
  polygon(
    c,
    [
      [-6, -22],
      [-2, -23],
      [-2, -10],
      [-6, -10],
    ],
    '#ffffff33',
  );
  line(
    c,
    [
      [-5, -11],
      [7, -12],
    ],
    '#85663f',
    2,
  );
  ellipse(c, 1, -12, 1.5, 1.5, '#ffe0a0');
  const work = activity === 'work' ? Math.sin(phase) * 6 : 0;
  line(
    c,
    [
      [-6, -21],
      [-9 - step * 0.4, -13],
    ],
    skin,
    3.5,
  );
  line(
    c,
    [
      [6, -21],
      [10 + step * 0.4, -13 - work],
    ],
    skin,
    3.5,
  );
  ellipse(c, 1, -29, 6, 7, skin);
  ellipse(c, 4, -28, 4, 4, skin);
  ellipse(c, 4, -29, 1, 1.2, '#344b43');
  if (worker) {
    ellipse(c, 0, -34, 9, 3, '#b88646');
    ellipse(c, -1, -36, 5.5, 4, '#eed08a');
    line(
      c,
      [
        [-5, -35],
        [4, -35],
      ],
      '#d6a65f',
      1,
    );
    if (activity === 'carry') {
      polygon(
        c,
        [
          [-7, -15],
          [4, -20],
          [12, -15],
          [12, -5],
          [1, 0],
          [-7, -5],
        ],
        '#c48c4c',
        '#f6cf85',
      );
      line(
        c,
        [
          [-5, -14],
          [10, -7],
        ],
        '#e8b66d',
        2,
      );
      line(
        c,
        [
          [-5, -6],
          [9, -14],
        ],
        '#e8b66d',
        2,
      );
    } else if (activity === 'work') {
      line(
        c,
        [
          [10, -13 - work],
          [15, -27 - work],
        ],
        '#8e6037',
        2.5,
      );
      line(
        c,
        [
          [10, -28 - work],
          [19, -25 - work],
        ],
        '#a6b8b1',
        5,
      );
    }
  } else {
    ellipse(
      c,
      0,
      -34,
      6.5,
      4.5,
      armor ? '#d3e7df' : kind === 'bronzeGuard' ? '#e4b777' : '#a3bcb9',
    );
    line(
      c,
      [
        [-6, -32],
        [6, -33],
      ],
      armor ? '#57dcdb' : '#567780',
      2,
    );
    if (['legionary', 'knight', 'orbitalGuard'].includes(kind))
      line(
        c,
        [
          [0, -38],
          [0, -42],
        ],
        kind === 'orbitalGuard' ? '#6ee4df' : '#d39d51',
        4,
      );
    if (kind === 'archer') {
      c.beginPath();
      c.ellipse(14, -19, 6, 13, -0.18, -Math.PI / 2, Math.PI / 2);
      c.strokeStyle = '#c49858';
      c.lineWidth = 2;
      c.stroke();
      line(
        c,
        [
          [12, -32],
          [16, -6],
        ],
        '#efdeab',
        1,
      );
      line(
        c,
        [
          [6, -22],
          [24, -22],
        ],
        '#f0d49b',
        1.5,
      );
    } else if (['marksman', 'ranger', 'sentinel', 'orbitalGuard'].includes(kind)) {
      line(
        c,
        [
          [4, -15],
          [23, -29],
        ],
        armor ? '#668e9e' : '#795b3d',
        4,
      );
      line(
        c,
        [
          [13, -22],
          [25, -31],
        ],
        armor ? '#92f2ec' : '#a0b2ac',
        3,
      );
    } else {
      const spear = ['guard', 'bronzeGuard', 'knight'].includes(kind);
      line(
        c,
        [
          [13, -3],
          [13, spear ? -40 : -28],
        ],
        '#966b3b',
        2.4,
      );
      polygon(
        c,
        [
          [13, spear ? -47 : -35],
          [9, spear ? -37 : -25],
          [17, spear ? -37 : -25],
        ],
        '#dce6d3',
      );
      polygon(
        c,
        [
          [-10, -23],
          [-4, -19],
          [-6, -10],
          [-10, -5],
          [-15, -9],
          [-17, -18],
        ],
        '#407e9b',
        '#e4c17a',
      );
      line(
        c,
        [
          [-11, -19],
          [-10, -9],
        ],
        '#f3d68a',
        2,
      );
    }
  }
}
