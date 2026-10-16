import { REGION_BOUNDS, STRUCTURES, TREES } from './regionPlan';
import { groundHeight } from './regionTerrain';
import type { Point } from './survival';

// Sample the same landscape used by the game. Cache once, outside React's
// render loop, so panning and opening the journal never regenerate the survey.
type Survey = { forest: string; contours: { height: number; path: string }[] };
let survey: Survey | undefined;
const step = 20;
const columns = (REGION_BOUNDS.maxX - REGION_BOUNDS.minX) / step + 1;
const rows = (REGION_BOUNDS.maxZ - REGION_BOUNDS.minZ) / step + 1;
const number = (n: number) => +n.toFixed(2);
export const mapPath = (points: readonly Point[]) => points.map((p, i) => `${i ? 'L' : 'M'}${number(p.x)},${number(p.z)}`).join('');

// Marching triangles has no ambiguous saddle cells. Join shared intersections
// into continuous lines rather than drawing a grid of disconnected shapes.
function isolines(values: Float64Array, level: number) {
  const edges: [Point, Point][] = [];
  for (let row = 0; row < rows - 1; row++) for (let col = 0; col < columns - 1; col++) {
    const x = REGION_BOUNDS.minX + col * step, z = REGION_BOUNDS.minZ + row * step;
    const corners = [{ x, z }, { x: x + step, z }, { x: x + step, z: z + step }, { x, z: z + step }];
    const heights = [values[row * columns + col], values[row * columns + col + 1], values[(row + 1) * columns + col + 1], values[(row + 1) * columns + col]];
    for (const triangle of [[0, 1, 2], [0, 2, 3]]) {
      const crossings: Point[] = [];
      for (let i = 0; i < 3; i++) {
        const a = triangle[i], b = triangle[(i + 1) % 3];
        if ((heights[a] >= level) === (heights[b] >= level)) continue;
        const t = (level - heights[a]) / (heights[b] - heights[a]);
        crossings.push({ x: corners[a].x + (corners[b].x - corners[a].x) * t, z: corners[a].z + (corners[b].z - corners[a].z) * t });
      }
      if (crossings.length === 2) edges.push([crossings[0], crossings[1]]);
    }
  }
  const key = (p: Point) => `${p.x.toFixed(3)},${p.z.toFixed(3)}`;
  const adjacent = new Map<string, number[]>();
  edges.forEach((edge, i) => edge.forEach(p => { const k = key(p); adjacent.set(k, [...adjacent.get(k) ?? [], i]); }));
  const used = new Set<number>(), paths: string[] = [];
  const trace = (start: Point, first: number) => {
    const points = [start]; let current = start, next: number | undefined = first;
    while (next !== undefined) {
      used.add(next);
      const edge = edges[next]; current = key(edge[0]) === key(current) ? edge[1] : edge[0];
      points.push(current); next = adjacent.get(key(current))?.find(i => !used.has(i));
    }
    paths.push(mapPath(points) + (key(points[0]) === key(current) ? 'Z' : ''));
  };
  // Open contours start at the survey boundary; closed contours follow after.
  edges.forEach((edge, i) => { const start = edge.find(p => adjacent.get(key(p))?.length === 1); if (start && !used.has(i)) trace(start, i); });
  edges.forEach((edge, i) => { if (!used.has(i)) trace(edge[0], i); });
  return paths.join('');
}

export function mapSurvey(): Survey {
  if (survey) return survey;
  const heights = new Float64Array(columns * rows), woods = new Float64Array(columns * rows);
  // Survey real tree stands instead of drawing the analytical forest ellipses.
  // A small density kernel joins neighbouring crowns while preserving clearings,
  // working yards and the irregular edges of the planted landscape.
  for (const tree of TREES) {
    const cx = (tree.x - REGION_BOUNDS.minX) / step, cz = (tree.z - REGION_BOUNDS.minZ) / step;
    for (let row = Math.max(1, Math.floor(cz - 3)); row <= Math.min(rows - 2, Math.ceil(cz + 3)); row++) {
      for (let col = Math.max(1, Math.floor(cx - 3)); col <= Math.min(columns - 2, Math.ceil(cx + 3)); col++) {
        const distance = ((col - cx) * step) ** 2 + ((row - cz) * step) ** 2;
        if (distance < 42 ** 2) woods[row * columns + col] += Math.exp(-distance / (2 * 18 ** 2));
      }
    }
  }
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
    const x = REGION_BOUNDS.minX + col * step, z = REGION_BOUNDS.minZ + row * step, index = row * columns + col;
    heights[index] = groundHeight(x, z);
  }
  survey = { forest: isolines(woods, 1.6), contours: Array.from({ length: 11 }, (_, i) => { const height = (i + 1) * 5; return { height, path: isolines(heights, height) }; }) };
  return survey;
}

// Settlement tint follows actual building corners, rather than zone rectangles.
function hull(points: Point[]) {
  const sorted = points.sort((a, b) => a.x - b.x || a.z - b.z);
  const cross = (a: Point, b: Point, c: Point) => (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
  const half = (list: Point[]) => { const out: Point[] = []; for (const p of list) { while (out.length > 1 && cross(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop(); out.push(p); } return out.slice(0, -1); };
  return [...half(sorted), ...half([...sorted].reverse())];
}
export const SETTLEMENT_AREAS = [...new Set(STRUCTURES.map(s => s.zone))].map(zone => {
  const points = STRUCTURES.filter(s => s.zone === zone).flatMap(s => [-1, 1].flatMap(a => [-1, 1].map(b => {
    const x = a * (s.width / 2 + 9), z = b * (s.depth / 2 + 9), c = Math.cos(s.rotation), n = Math.sin(s.rotation);
    return { x: s.x + x * c + z * n, z: s.z - x * n + z * c };
  })));
  return { zone, path: mapPath(hull(points)) + 'Z' };
});
