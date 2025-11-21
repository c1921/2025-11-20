import type { RoadSegment, Settlement } from './types';

export interface RoadGeneratorOptions {
  /** 连接最近多少个邻居（用于生成候选边） */
  kNearest?: number;
  /** 最长连线距离（像素），超过则忽略，默认不限制 */
  maxDistance?: number;
  /** 是否强制生成全局连通的最小生成树 */
  forceMST?: boolean;
  /** 已有路径相对直连的容忍系数，<=该倍数则跳过直连，默认 1.2 */
  pathFactor?: number;
  /** 地图宽度（像素） */
  mapWidth?: number;
  /** 地图高度（像素） */
  mapHeight?: number;
  /** 原始高度图（0-1） */
  heightmap?: Float32Array;
  /** 路径搜索网格步长，越大越粗略，默认 8 */
  gridStep?: number;
  /** 坡度成本系数，越大越偏爱平缓路径 */
  slopeCost?: number;
  /** 海水/不可通行高度阈值 */
  waterThreshold?: number;
  /** 海水/不可通行的额外惩罚 */
  waterPenalty?: number;
}

/**
 * 简易道路生成（基于 k 近邻 + 最小生成树）
 * - 先以每个定居点的 k 近邻生成候选边
 * - 运行 Kruskal 生成连接所有节点的最小生成树，保证连通
 * - 将 MST 边与近邻边合并形成路网
 */
export class RoadGenerator {
  static generate(
    settlements: Settlement[],
    options: RoadGeneratorOptions = {}
  ): RoadSegment[] {
    if (settlements.length < 2) return [];

    const config = {
      kNearest: options.kNearest ?? 3,
      maxDistance: options.maxDistance ?? Infinity,
      forceMST: options.forceMST ?? true,
      pathFactor: Math.max(1, options.pathFactor ?? 1.2),
      pathConfig: this.createPathConfig(options),
    };

    const candidates = this.buildCandidateEdges(settlements, config.kNearest, config.maxDistance);
    if (!candidates.length) return [];

    const mstEdges = config.forceMST
      ? this.buildMST(settlements.length, candidates)
      : [];

    // 合并并去重，同时按方案2过滤“已有路径足够短”的冗余边
    const edgeKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);
    const seen = new Set<string>();
    const roads: RoadSegment[] = [];
    const adjacency = this.createAdjacency(settlements.length);

    const addRoad = (aIdx: number, bIdx: number, preferPath?: boolean) => {
      if (aIdx === bIdx) return;
      const key = edgeKey(aIdx, bIdx);
      if (seen.has(key)) return;
      seen.add(key);

      const a = settlements[aIdx];
      const b = settlements[bIdx];
      if (!a || !b) return;
      // 直线距离仅作参考，不再单独存储
      const pathPoints =
        preferPath !== false && config.pathConfig
          ? this.findPath(a, b, config.pathConfig)
          : null;
      const points =
        pathPoints && pathPoints.length >= 2
          ? pathPoints
          : [
              { x: a.x, y: a.y },
              { x: b.x, y: b.y },
            ];
      const length = this.measurePath(points);

      roads.push({
        x1: a.x,
        y1: a.y,
        x2: b.x,
        y2: b.y,
        length,
        aIndex: aIdx,
        bIndex: bIdx,
        points,
      });

      const listA = adjacency[aIdx] ?? (adjacency[aIdx] = []);
      const listB = adjacency[bIdx] ?? (adjacency[bIdx] = []);
      listA.push({ to: bIdx, w: length });
      listB.push({ to: aIdx, w: length });
    };

    // 先放入 MST，保证连通
    for (const e of mstEdges) {
      addRoad(e.a, e.b);
    }

    // 按长度升序尝试添加候选边
    const sortedCandidates = [...candidates].sort((c1, c2) => c1.length - c2.length);
    for (const e of sortedCandidates) {
      const key = edgeKey(e.a, e.b);
      if (seen.has(key)) continue;

      // 如果已有路径比“直连 * pathFactor”还短，则跳过直连
      const existing = this.shortestPathLength(e.a, e.b, adjacency);
      if (existing <= e.length * config.pathFactor) continue;

      addRoad(e.a, e.b, true);
    }

    return roads;
  }

  private static buildCandidateEdges(
    settlements: Settlement[],
    kNearest: number,
    maxDistance: number
  ): Array<{ a: number; b: number; length: number }> {
    const edges: Array<{ a: number; b: number; length: number }> = [];
    const n = settlements.length;
    const maxDistSq = maxDistance * maxDistance;

    for (let i = 0; i < n; i++) {
      const a = settlements[i];
      if (!a) continue;

      // 找出 k 近邻（简单排序，n 规模不大）
      const neighbors: Array<{ idx: number; distSq: number }> = [];
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const b = settlements[j];
        if (!b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy;
        if (distSq <= 0) continue;
        neighbors.push({ idx: j, distSq });
      }

      neighbors.sort((m, n2) => m.distSq - n2.distSq);
      const limit = Math.max(1, kNearest);
      for (let k = 0; k < Math.min(limit, neighbors.length); k++) {
        const nb = neighbors[k];
        if (!nb) continue;
        if (maxDistance !== Infinity && nb.distSq > maxDistSq) continue;
        edges.push({ a: i, b: nb.idx, length: Math.sqrt(nb.distSq) });
      }
    }

    return edges;
  }

  private static buildMST(
    nodeCount: number,
    edges: Array<{ a: number; b: number; length: number }>
  ): Array<{ a: number; b: number; length: number }> {
    const sorted = [...edges].sort((e1, e2) => e1.length - e2.length);

    // 并查集
    const parent = new Int32Array(nodeCount);
    const rank = new Int8Array(nodeCount);
    for (let i = 0; i < nodeCount; i++) parent[i] = i;

    const find = (x: number): number => {
      const px = parent[x];
      if (px === x) return x;
      if (px === undefined) return x;
      const root = find(px);
      parent[x] = root;
      return root;
    };

    const union = (x: number, y: number): boolean => {
      const rx = find(x);
      const ry = find(y);
      if (rx === ry) return false;
      const rankRx = rank[rx] ?? 0;
      const rankRy = rank[ry] ?? 0;
      if (rankRx < rankRy) {
        parent[rx] = ry;
      } else if (rankRx > rankRy) {
        parent[ry] = rx;
      } else {
        parent[ry] = rx;
        rank[rx] = (rankRx + 1) as number;
      }
      return true;
    };

    const mst: Array<{ a: number; b: number; length: number }> = [];
    for (const e of sorted) {
      if (union(e.a, e.b)) {
        mst.push(e);
        if (mst.length >= nodeCount - 1) break;
      }
    }
    return mst;
  }

  private static createAdjacency(nodeCount: number): Array<Array<{ to: number; w: number }>> {
    return Array.from({ length: nodeCount }, () => []);
  }

  /**
   * 简单 Dijkstra，返回 a->b 的最短距离；无路径则返回 Infinity
   */
  private static shortestPathLength(
    start: number,
    end: number,
    adjacency: Array<Array<{ to: number; w: number }>>
  ): number {
    if (start === end) return 0;
    const n = adjacency.length;
    const dist = new Float64Array(n);
    dist.fill(Number.POSITIVE_INFINITY);
    dist[start] = 0;

    // 简易堆（使用数组，节点数量不大）
    const heap: Array<{ v: number; d: number }> = [{ v: start, d: 0 }];
    const push = (v: number, d: number) => {
      heap.push({ v, d });
      let i = heap.length - 1;
      while (i > 0) {
        const p = ((i - 1) >> 1);
        const parentNode = heap[p];
        if (!parentNode || parentNode.d <= d) break;
        heap[i] = parentNode;
        i = p;
      }
      heap[i] = { v, d };
    };
    const pop = (): { v: number; d: number } | undefined => {
      if (!heap.length) return undefined;
      const root = heap[0];
      const last = heap.pop();
      if (!last) return root;
      if (!heap.length) return root;
      heap[0] = last;
      let i = 0;
      while (true) {
        const l = i * 2 + 1;
        const r = l + 1;
        let smallest = i;
        let smallestVal = heap[smallest];
        if (!smallestVal) break;

        if (l < heap.length) {
          const left = heap[l];
          if (left && left.d < smallestVal.d) {
            smallest = l;
            smallestVal = left;
          }
        }

        if (r < heap.length) {
          const right = heap[r];
          if (right && right.d < smallestVal.d) {
            smallest = r;
            smallestVal = right;
          }
        }

        if (smallest === i) break;
        const tmp = heap[i];
        heap[i] = smallestVal;
        heap[smallest] = tmp!;
        i = smallest;
      }
      return root;
    };

    while (heap.length) {
      const node = pop();
      if (!node) break;
      const { v, d } = node;
      if (v < 0 || v >= dist.length) continue;
      const currentDist = dist[v];
      if (currentDist === undefined) continue;
      if (d > currentDist) continue;
      if (v === end) return d;

      const edges = adjacency[v];
      if (!edges) continue;
      for (const edge of edges) {
        if (!edge || edge.to < 0 || edge.to >= dist.length) continue;
        const nd = d + edge.w;
        const targetDist = dist[edge.to];
        if (targetDist !== undefined && nd < targetDist) {
          dist[edge.to] = nd;
          push(edge.to, nd);
        }
      }
    }

    return Number.POSITIVE_INFINITY;
  }

  /**
   * 将高度图、网格参数转换为路径搜索上下文
   */
  private static createPathConfig(options: RoadGeneratorOptions): null | {
    heightmap: Float32Array;
    width: number;
    height: number;
    cols: number;
    rows: number;
    step: number;
    slopeCost: number;
    waterThreshold: number;
    waterPenalty: number;
  } {
    const { heightmap, mapWidth, mapHeight } = options;
    if (!heightmap || !mapWidth || !mapHeight) return null;
    const step = Math.max(2, Math.floor(options.gridStep ?? 8));
    const cols = Math.max(1, Math.ceil(mapWidth / step));
    const rows = Math.max(1, Math.ceil(mapHeight / step));
    return {
      heightmap,
      width: mapWidth,
      height: mapHeight,
      cols,
      rows,
      step,
      slopeCost: options.slopeCost ?? 8,
      waterThreshold: options.waterThreshold ?? 0.35,
      waterPenalty: options.waterPenalty ?? 6,
    };
  }

  private static measurePath(points: Array<{ x: number; y: number }>): number {
    if (points.length < 2) return 0;
    let len = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i]!;
      const b = points[i + 1]!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      len += Math.sqrt(dx * dx + dy * dy);
    }
    return len;
  }

  /**
   * 使用 A* 在粗网格上寻路，代价考虑坡度与水体惩罚
   */
  private static findPath(
    a: Settlement,
    b: Settlement,
    ctx: {
      heightmap: Float32Array;
      width: number;
      height: number;
      cols: number;
      rows: number;
      step: number;
      slopeCost: number;
      waterThreshold: number;
      waterPenalty: number;
    }
  ): Array<{ x: number; y: number }> | null {
    const toCell = (x: number, y: number) => {
      const cx = Math.max(0, Math.min(ctx.cols - 1, Math.floor(x / ctx.step)));
      const cy = Math.max(0, Math.min(ctx.rows - 1, Math.floor(y / ctx.step)));
      return { cx, cy };
    };

    const start = toCell(a.x, a.y);
    const goal = toCell(b.x, b.y);

    const idx = (cx: number, cy: number) => cy * ctx.cols + cx;
    const size = ctx.cols * ctx.rows;
    const dist = new Float64Array(size);
    dist.fill(Number.POSITIVE_INFINITY);
    const visited = new Uint8Array(size);
    const prev = new Int32Array(size);
    prev.fill(-1);

    const startIdx = idx(start.cx, start.cy);
    const goalIdx = idx(goal.cx, goal.cy);
    if (startIdx < 0 || startIdx >= size || goalIdx < 0 || goalIdx >= size) {
      return null;
    }
    dist[startIdx] = 0;

    const sampleHeight = (cx: number, cy: number) => {
      const x = Math.min(ctx.width - 1, Math.max(0, Math.floor(cx * ctx.step + ctx.step * 0.5)));
      const y = Math.min(ctx.height - 1, Math.max(0, Math.floor(cy * ctx.step + ctx.step * 0.5)));
      return ctx.heightmap[y * ctx.width + x] ?? 0;
    };

    const heuristic = (cx: number, cy: number) => {
      const wx = cx * ctx.step + ctx.step * 0.5;
      const wy = cy * ctx.step + ctx.step * 0.5;
      const dx = wx - b.x;
      const dy = wy - b.y;
      return Math.sqrt(dx * dx + dy * dy);
    };

    type HeapNode = { v: number; f: number };
    const heap: HeapNode[] = [{ v: startIdx, f: heuristic(start.cx, start.cy) }];
    const push = (node: HeapNode) => {
      heap.push(node);
      let i = heap.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        const parentNode = heap[p];
        if (!parentNode || parentNode.f <= node.f) break;
        heap[i] = parentNode;
        i = p;
      }
      heap[i] = node;
    };
    const pop = (): HeapNode | undefined => {
      if (!heap.length) return undefined;
      const root = heap[0];
      const last = heap.pop();
      if (!last) return root;
      if (!heap.length) return root;
      heap[0] = last;
      let i = 0;
      while (true) {
        const l = i * 2 + 1;
        const r = l + 1;
        let smallest = i;
        let smallestVal = heap[smallest];
        if (!smallestVal) break;

        if (l < heap.length) {
          const left = heap[l];
          if (left && left.f < smallestVal.f) {
            smallest = l;
            smallestVal = left;
          }
        }

        if (r < heap.length) {
          const right = heap[r];
          if (right && right.f < smallestVal.f) {
            smallest = r;
            smallestVal = right;
          }
        }

        if (smallest === i) break;
        const tmp = heap[i];
        heap[i] = smallestVal;
        heap[smallest] = tmp!;
        i = smallest;
      }
      return root;
    };

    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ] as const;

    while (heap.length) {
      const node = pop();
      if (!node) break;
      const v = node.v;
      if (v < 0 || v >= dist.length) continue;
      if (visited[v]) continue;
      visited[v] = 1;
      if (v === goalIdx) break;

      const cy = Math.floor(v / ctx.cols);
      const cx = v - cy * ctx.cols;
      const h = sampleHeight(cx, cy);
      const distV = dist[v];
      if (distV === undefined) continue;

      for (const [dx, dy] of dirs) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= ctx.cols || ny >= ctx.rows) continue;
        const nv = idx(nx, ny);
        if (visited[nv]) continue;
        if (nv < 0 || nv >= dist.length) continue;

        const nh = sampleHeight(nx, ny);
        const base = dx === 0 || dy === 0 ? ctx.step : ctx.step * Math.SQRT2;
        const slope = Math.abs(nh - h);
        const slopePenalty = 1 + slope * ctx.slopeCost;
        const waterPenalty =
          h < ctx.waterThreshold || nh < ctx.waterThreshold ? ctx.waterPenalty : 0;

        const cost = base * (slopePenalty + waterPenalty);
        const nd = distV + cost;
        const distNv = dist[nv];
        if (distNv !== undefined && nd < distNv) {
          dist[nv] = nd;
          prev[nv] = v;
          push({ v: nv, f: nd + heuristic(nx, ny) });
        }
      }
    }

    if (goalIdx < 0 || goalIdx >= dist.length || dist[goalIdx] === Number.POSITIVE_INFINITY) {
      return null;
    }

    // 重建路径
    const path: Array<{ x: number; y: number }> = [];
    let cur = goalIdx;
    while (cur !== -1) {
      const cy = Math.floor(cur / ctx.cols);
      const cx = cur - cy * ctx.cols;
      path.push({
        x: cx * ctx.step + ctx.step * 0.5,
        y: cy * ctx.step + ctx.step * 0.5,
      });
      const next = prev[cur];
      cur = next !== undefined ? next : -1;
    }
    path.reverse();

    // 用真实起终点替换首尾，避免偏移
    if (path.length) {
      path[0] = { x: a.x, y: a.y };
      path[path.length - 1] = { x: b.x, y: b.y };
    }

    return path;
  }
}
