import type { RoadSegment, Settlement } from './types';

export interface SettlementClassificationOptions {
  /** 城市之间的最小跳数（经过的定居点数量，按道路相连） */
  minCityHops?: number;

  /** 预期的城市占比（相对定居点数量） */
  cityShare?: number;

  /** 城市最小数量（全图） */
  minCities?: number;

  /** 城市最大数量（全图） */
  maxCities?: number;
}

/**
 * 根据定居点属性与路网连通度对定居点进行分类
 * 结合适宜度、直连邻居、二跳覆盖度等因素生成城市分数，并在局部范围内限制城市数量
 */
export class SettlementClassifier {
  private static readonly DEFAULTS = {
    minCityHops: 3,
    cityShare: 0.015, // 默认约 1.5% 的定居点晋升为城市
    minCities: 4,
    maxCities: 60,
    suitabilityWeight: 0.55,
    directNeighborWeight: 0.2,
    neighborSuitabilityWeight: 0.15,
    secondHopWeight: 0.25,
    minScoreForCity: 0.35,
  };

  static classify(
    settlements: Settlement[],
    roads: RoadSegment[],
    options: SettlementClassificationOptions = {}
  ): { cityIndices: number[] } {
    if (!settlements.length) return { cityIndices: [] };

    const config = { ...this.DEFAULTS, ...options };
    const adjacency = this.buildAdjacency(settlements.length, roads);

    const degrees = adjacency.map((neighbors) => neighbors.size);
    const maxDegree = Math.max(1, ...degrees);
    const secondHopReach = adjacency.map((_, idx) => this.countSecondHop(idx, adjacency));
    const maxSecondHop = Math.max(1, ...secondHopReach);
    const maxSuitability = Math.max(0.0001, ...settlements.map((s) => s.suitability));

    // 计算分数
    const scores: Array<{ idx: number; score: number }> = [];
    for (let i = 0; i < settlements.length; i++) {
      const settlement = settlements[i];
      if (!settlement) continue;

      const baseSuitability = settlement.suitability / maxSuitability;
      const degree = degrees[i] ?? 0;
      const directScore = degree / maxDegree;
      const neighborSuitability = this.averageNeighborSuitability(i, adjacency, settlements);
      const secondHop = secondHopReach[i] ?? 0;
      const secondHopScore = secondHop / maxSecondHop;

      const networkScore =
        directScore * config.directNeighborWeight +
        neighborSuitability * config.neighborSuitabilityWeight +
        secondHopScore * config.secondHopWeight;

      // 轻微奖励高连通度的节点
      const connectivityBonus =
        degree >= 4 ? 0.05 : degree >= 2 ? 0.02 : 0;

      const rawScore =
        baseSuitability * config.suitabilityWeight + networkScore + connectivityBonus;
      const cityScore = this.clamp(rawScore, 0, 1.4); // 允许网络叠加，后续归一化

      settlement.cityScore = this.clamp(cityScore / 1.4, 0, 1);
      settlement.roadDegree = degree;
      settlement.secondHopReach = secondHop;
      settlement.category = 'village';

      scores.push({ idx: i, score: settlement.cityScore });
    }

    // 挑选城市：高分优先，并限制最小跳数距离
    const sorted = scores.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const targetCities = Math.min(
      settlements.length,
      this.clamp(
        Math.round(settlements.length * config.cityShare),
        config.minCities,
        config.maxCities
      )
    );
    const minCityHops = Math.max(1, Math.floor(config.minCityHops ?? this.DEFAULTS.minCityHops));
    const cityIndices: number[] = [];

    for (const candidate of sorted) {
      if (cityIndices.length >= targetCities) break;
      const score = candidate.score ?? 0;
      if (score < config.minScoreForCity) continue;

      const current = settlements[candidate.idx];
      if (!current) continue;

      if (
        !this.hasEnoughHopDistance(
          candidate.idx,
          cityIndices,
          minCityHops,
          adjacency
        )
      ) {
        continue;
      }

      cityIndices.push(candidate.idx);
      current.category = 'city';
    }

    // 次级分类：有一定分数或度数的定居点视为小镇
    const maxScore = sorted.length ? sorted[0]!.score ?? 0 : 0;
    const townThreshold = Math.max(config.minScoreForCity * 0.55, maxScore * 0.4);
    for (const settlement of settlements) {
      if (!settlement) continue;
      if (settlement.category === 'city') continue;
      const degree = settlement.roadDegree ?? 0;
      const score = settlement.cityScore ?? 0;
      if (degree >= 2 || score >= townThreshold) {
        settlement.category = 'town';
      } else {
        settlement.category = 'village';
      }
    }

    return { cityIndices };
  }

  private static buildAdjacency(count: number, roads: RoadSegment[]): Array<Set<number>> {
    const adjacency = Array.from({ length: count }, () => new Set<number>());
    for (const road of roads) {
      if (road.aIndex < 0 || road.bIndex < 0) continue;
      adjacency[road.aIndex]?.add(road.bIndex);
      adjacency[road.bIndex]?.add(road.aIndex);
    }
    return adjacency;
  }

  private static countSecondHop(index: number, adjacency: Array<Set<number>>): number {
    const neighbors = adjacency[index];
    if (!neighbors || !neighbors.size) return 0;

    const reach = new Set<number>();
    for (const n of neighbors) {
      reach.add(n);
      const second = adjacency[n];
      if (!second) continue;
      for (const s of second) {
        if (s === index) continue;
        reach.add(s);
      }
    }
    return reach.size;
  }

  private static averageNeighborSuitability(
    index: number,
    adjacency: Array<Set<number>>,
    settlements: Settlement[]
  ): number {
    const neighbors = adjacency[index];
    if (!neighbors || !neighbors.size) return 0;
    let sum = 0;
    let count = 0;
    for (const n of neighbors) {
      const s = settlements[n];
      if (!s) continue;
      sum += s.suitability;
      count++;
    }
    return count > 0 ? sum / count : 0;
  }

  /**
   * 判断当前候选到已有城市的最短跳数是否达到要求
   */
  private static hasEnoughHopDistance(
    candidateIdx: number,
    cityIndices: number[],
    minHops: number,
    adjacency: Array<Set<number>>
  ): boolean {
    if (!cityIndices.length) return true;
    if (minHops <= 1) return true;

    const maxDepth = minHops - 1;
    for (const cityIdx of cityIndices) {
      if (this.shortestPathWithin(candidateIdx, cityIdx, maxDepth, adjacency)) {
        return false;
      }
    }
    return true;
  }

  /**
   * 使用限制深度的 BFS，判断两点间是否存在不超过 maxDepth 的路径
   */
  private static shortestPathWithin(
    start: number,
    target: number,
    maxDepth: number,
    adjacency: Array<Set<number>>
  ): boolean {
    if (start === target) return true;
    if (maxDepth <= 0) return false;

    const visited = new Uint8Array(adjacency.length);
    const queue: Array<{ v: number; d: number }> = [{ v: start, d: 0 }];
    visited[start] = 1;

    while (queue.length) {
      const { v, d } = queue.shift()!;
      if (d >= maxDepth) continue;
      const neighbors = adjacency[v];
      if (!neighbors) continue;
      const nd = d + 1;
      for (const nb of neighbors) {
        if (nb === target) {
          return true;
        }
        if (!visited[nb]) {
          visited[nb] = 1;
          queue.push({ v: nb, d: nd });
        }
      }
    }
    return false;
  }

  private static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
