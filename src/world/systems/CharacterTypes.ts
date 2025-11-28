/**
 * 角色类型定义
 */

/** 角色唯一标识符 */
export type CharacterId = string;

/**
 * 角色基础信息
 */
export interface Character {
  /** 唯一标识符 */
  id: CharacterId;

  /** 角色名字 */
  name: string;

  /** 年龄 */
  age: number;

  /** 所在地点（定居点索引） */
  locationSettlementIndex: number;

  /** 属性值 */
  attributes: CharacterAttributes;
}

/**
 * 角色属性
 */
export interface CharacterAttributes {
  /** 武力 (0-100) */
  martial: number;

  /** 谋略 (0-100) */
  intelligence: number;

  /** 魅力 (0-100) */
  charisma: number;
}

/**
 * 角色管理器的状态（用于存档）
 */
export interface CharacterManagerState {
  characters: Character[];
  nextId: number;
}
