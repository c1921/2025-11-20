import type { RoadSegment } from './types';

export interface RoadGraph {
  adjacency: Array<Array<{ to: number; weight: number; roadIndex: number }>>;
  edgeToRoad: Map<string, number>;
}

type AdjacencyList = RoadGraph['adjacency'][number];

/**
 * 负责基于道路网络进行最短路径搜索的工具类
 */
export class RoadPathfinder {
  /**
  * 将道路列表转换为带权邻接表
  */
  static buildGraph(roads: RoadSegment[], settlementCount: number): RoadGraph {
    const adjacency: RoadGraph['adjacency'] = Array.from(
      { length: Math.max(0, settlementCount) },
      () => [] as AdjacencyList
    );
    const edgeToRoad = new Map<string, number>();

    for (let i = 0; i < roads.length; i++) {
      const road = roads[i];
      if (!road) continue;
      const { aIndex, bIndex, length } = road;
      if (aIndex < 0 || bIndex < 0 || aIndex >= settlementCount || bIndex >= settlementCount) {
        continue;
      }

      const fromList = adjacency[aIndex];
      const toList = adjacency[bIndex];
      if (!fromList || !toList) continue;

      fromList.push({ to: bIndex, weight: length, roadIndex: i });
      toList.push({ to: aIndex, weight: length, roadIndex: i });
      edgeToRoad.set(this.edgeKey(aIndex, bIndex), i);
    }

    return { adjacency, edgeToRoad };
  }

  /**
  * 基于 Dijkstra 的最短路径
  */
  static shortestPath(
    start: number,
    end: number,
    graph: RoadGraph
  ): { nodes: number[]; distance: number } | null {
    const nodeCount = graph.adjacency.length;
    if (
      start < 0 ||
      end < 0 ||
      start >= nodeCount ||
      end >= nodeCount ||
      nodeCount === 0
    ) {
      return null;
    }

    if (start === end) {
      return { nodes: [start], distance: 0 };
    }

    const dist = new Float64Array(nodeCount);
    dist.fill(Number.POSITIVE_INFINITY);
    const prev = new Int32Array(nodeCount);
    prev.fill(-1);
    const visited = new Uint8Array(nodeCount);

    const heap: Array<{ v: number; d: number }> = [{ v: start, d: 0 }];
    dist[start] = 0;

    const push = (v: number, d: number) => {
      heap.push({ v, d });
      let i = heap.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
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
      if (visited[v]) continue;
      visited[v] = 1;

      if (v === end) break;
      const edges = (graph.adjacency[v] ?? []) as AdjacencyList;
      for (const edge of edges) {
        const currentDist = dist[edge.to];
        if (currentDist === undefined) continue;
        const nd = d + edge.weight;
        if (nd < currentDist) {
          dist[edge.to] = nd;
          prev[edge.to] = v;
          push(edge.to, nd);
        }
      }
    }

    const distance = dist[end];
    if (distance === undefined || distance === Number.POSITIVE_INFINITY) {
      return null;
    }

    const nodes: number[] = [];
    let cur: number | undefined = end;
    while (cur !== -1 && cur !== undefined) {
      nodes.push(cur);
      cur = prev[cur];
    }
    nodes.reverse();
    return { nodes, distance };
  }

  /**
  * 将节点路径转换为连续的世界坐标点序列
  */
  static buildPointPath(
    nodePath: number[],
    roads: RoadSegment[],
    graph: RoadGraph,
    settlements?: Array<{ x: number; y: number }>
  ): Array<{ x: number; y: number }> | null {
    if (!nodePath.length) return null;
    if (nodePath.length === 1) {
      const singleNode = nodePath[0];
      if (singleNode === undefined) return null;
      const settlement = settlements?.[singleNode];
      if (settlement) {
        const { x, y } = settlement;
        return [{ x, y }];
      }
      // 单点路径直接返回原地，若无坐标则回退到原点
      return [{ x: 0, y: 0 }];
    }

    const path: Array<{ x: number; y: number }> = [];

    for (let i = 0; i < nodePath.length - 1; i++) {
      const a = nodePath[i]!;
      const b = nodePath[i + 1]!;
      const key = this.edgeKey(a, b);
      const roadIndex = graph.edgeToRoad.get(key);
      if (roadIndex === undefined) return null;
      const road = roads[roadIndex];
      if (!road) return null;

      const basePoints =
        road.points && road.points.length >= 2
          ? road.points
          : [
              { x: road.x1, y: road.y1 },
              { x: road.x2, y: road.y2 },
            ];

      const isForward = road.aIndex === a;
      const ordered = isForward ? basePoints : [...basePoints].reverse();
      const pointsToAdd = path.length ? ordered.slice(1) : ordered;
      path.push(...pointsToAdd);
    }

    return path;
  }

  private static edgeKey(a: number, b: number): string {
    return a < b ? `${a}-${b}` : `${b}-${a}`;
  }
}
