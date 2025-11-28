import type { RoadSegment } from '../core/types';

/**
 * Serialized road data optimized for IndexedDB storage
 *
 * This format converts nested point arrays into a flat typed array
 * to avoid IndexedDB's structured clone algorithm limitations
 */
export interface SerializedRoadData {
  /** Metadata for each road segment */
  metadata: Array<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    length: number;
    aIndex: number;
    bIndex: number;
    pointsOffset: number; // Start index in pointsData
    pointsCount: number;  // Number of points for this road
  }>;
  /** Flattened coordinate data as ArrayBuffer (Float32Array) */
  pointsData: ArrayBuffer;
}

/**
 * Utility for serializing/deserializing road data for IndexedDB storage
 *
 * Converts RoadSegment[] with nested point arrays into a flat structure
 * that IndexedDB can clone without errors
 */
export class RoadSerializer {
  /**
   * Serialize RoadSegment[] to IndexedDB-compatible format
   *
   * @param roads Array of road segments to serialize
   * @returns Serialized road data with flat typed array
   */
  static serialize(roads: RoadSegment[]): SerializedRoadData {
    if (!roads.length) {
      return {
        metadata: [],
        pointsData: new Float32Array(0).buffer,
      };
    }

    // Calculate total points needed across all roads
    let totalPoints = 0;
    for (const road of roads) {
      totalPoints += road.points?.length ?? 2; // Default to 2 points if missing
    }

    // Allocate flat array for all coordinates (x,y pairs)
    const flatPoints = new Float32Array(totalPoints * 2);
    const metadata: SerializedRoadData['metadata'] = [];

    let offset = 0;
    for (const road of roads) {
      // Use existing points or create simple path from start to end
      const points = road.points?.length >= 2
        ? road.points
        : [
            { x: road.x1, y: road.y1 },
            { x: road.x2, y: road.y2 },
          ];

      const pointsCount = points.length;

      // Flatten points into typed array
      for (let i = 0; i < pointsCount; i++) {
        const pt = points[i]!;
        flatPoints[offset * 2] = pt.x;
        flatPoints[offset * 2 + 1] = pt.y;
        offset++;
      }

      // Store metadata for reconstruction
      metadata.push({
        x1: road.x1,
        y1: road.y1,
        x2: road.x2,
        y2: road.y2,
        length: road.length,
        aIndex: road.aIndex,
        bIndex: road.bIndex,
        pointsOffset: offset - pointsCount,
        pointsCount,
      });
    }

    return {
      metadata,
      pointsData: flatPoints.buffer,
    };
  }

  /**
   * Deserialize IndexedDB data back to RoadSegment[]
   *
   * @param data Serialized road data
   * @returns Reconstructed array of road segments
   */
  static deserialize(data: SerializedRoadData): RoadSegment[] {
    const { metadata, pointsData } = data;
    const flatPoints = new Float32Array(pointsData);
    const roads: RoadSegment[] = [];

    for (const meta of metadata) {
      const points: Array<{ x: number; y: number }> = [];

      // Reconstruct points from flat array using offset and count
      for (let i = 0; i < meta.pointsCount; i++) {
        const idx = (meta.pointsOffset + i) * 2;
        points.push({
          x: flatPoints[idx]!,
          y: flatPoints[idx + 1]!,
        });
      }

      roads.push({
        x1: meta.x1,
        y1: meta.y1,
        x2: meta.x2,
        y2: meta.y2,
        length: meta.length,
        aIndex: meta.aIndex,
        bIndex: meta.bIndex,
        points,
      });
    }

    return roads;
  }

  /**
   * Calculate storage size in bytes (for debugging/monitoring)
   *
   * @param data Serialized road data
   * @returns Total size in bytes
   */
  static calculateSize(data: SerializedRoadData): number {
    const metadataSize = JSON.stringify(data.metadata).length;
    const pointsSize = data.pointsData.byteLength;
    return metadataSize + pointsSize;
  }
}
