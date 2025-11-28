import type { Settlement, RoadSegment } from '../core/types';
import type { TimeSpeed } from '../../time/types';
import type { SerializedRoadData } from './RoadSerializer';

export interface MapSavePayload {
  /** 数据版本，便于将来迁移 */
  version: 1 | 2;
  /** 地图生成种子与配置 */
  seed: number;
  width: number;
  height: number;
  useShading: boolean;
  enableErosion: boolean;
  createdAt: number;
  /** 已生成的地图数据（去掉 PIXI 纹理） */
  map: {
    heightmap: ArrayBuffer;
    settlements: Settlement[];
    /** 版本1：直接存储道路数组（已弃用，保留用于向后兼容） */
    roads?: RoadSegment[];
    /** 版本2：序列化的道路数据，避免 IndexedDB 克隆错误 */
    roadsData?: SerializedRoadData;
  };
  /** 玩家状态（可选，未来拓展用） */
  player?: {
    x: number;
    y: number;
    currentSettlementIndex: number | null;
  };
  /** 时间系统状态 */
  time?: {
    totalDays: number;
    timeSpeed: TimeSpeed;
  };
}

export interface MapSaveRecord extends MapSavePayload {
  /** 存档主键 */
  id: string;
  /** 便于未来展示的标题 */
  title?: string;
}

const DB_NAME = 'map-saves';
const DB_VERSION = 1;
const STORE_NAME = 'saves';

const ensureDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      let store: IDBObjectStore;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      } else {
        store = request.transaction!.objectStore(STORE_NAME);
      }

      if (!store.indexNames.contains('createdAt')) {
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const runReadwrite = async <T>(
  runner: (store: IDBObjectStore, tx: IDBTransaction) => void | Promise<void>
): Promise<T | void> => {
  const db = await ensureDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    tx.oncomplete = () => resolve(undefined);
    tx.onerror = () => reject(tx.error);

    Promise.resolve(runner(store, tx)).catch((err) => {
      reject(err);
      tx.abort();
    });
  });
};

export const MapPersistence = {
  async save(record: MapSaveRecord): Promise<void> {
    await runReadwrite((store) => {
      store.put(record);
    });
  },

  async get(id: string): Promise<MapSaveRecord | null> {
    const db = await ensureDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve((request.result as MapSaveRecord | undefined) ?? null);
      };
      request.onerror = () => reject(request.error);
    });
  },

  async delete(id: string): Promise<void> {
    await runReadwrite((store) => {
      store.delete(id);
    });
  },

  async listByNewest(): Promise<MapSaveRecord[]> {
    const db = await ensureDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('createdAt');
      const request = index.openCursor(null, 'prev');
      const results: MapSaveRecord[] = [];

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          results.push(cursor.value as MapSaveRecord);
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => reject(request.error);
    });
  },

  async latest(): Promise<MapSaveRecord | null> {
    const list = await MapPersistence.listByNewest();
    return list[0] ?? null;
  },
};
