import type {
  Character,
  CharacterId,
  CharacterManagerState,
} from './CharacterTypes';

/**
 * 角色管理器
 * 维护所有角色的数据，支持增删查改
 */
export class CharacterManager {
  private characters: Map<CharacterId, Character> = new Map();
  private nextId: number = 1;

  /**
   * 添加一个角色
   */
  add(character: Character): void {
    if (this.characters.has(character.id)) {
      console.warn(`角色 ${character.id} 已存在，将被覆盖`);
    }
    this.characters.set(character.id, character);
  }

  /**
   * 根据 ID 获取角色
   */
  get(id: CharacterId): Character | undefined {
    return this.characters.get(id);
  }

  /**
   * 获取所有角色
   */
  getAll(): Character[] {
    return Array.from(this.characters.values());
  }

  /**
   * 根据定居点索引获取该地点的所有角色
   */
  getBySettlement(settlementIndex: number): Character[] {
    return this.getAll().filter(
      (char) => char.locationSettlementIndex === settlementIndex
    );
  }

  /**
   * 删除角色
   */
  remove(id: CharacterId): boolean {
    return this.characters.delete(id);
  }

  /**
   * 清空所有角色
   */
  clear(): void {
    this.characters.clear();
    this.nextId = 1;
  }

  /**
   * 生成一个新的角色 ID
   */
  generateId(): CharacterId {
    return `char_${this.nextId++}`;
  }

  /**
   * 获取角色总数
   */
  getCount(): number {
    return this.characters.size;
  }

  /**
   * 生成随机角色
   * @param count 生成数量
   * @param settlementCount 定居点数量（用于随机分配位置）
   */
  generateRandomCharacters(count: number, settlementCount: number): void {
    if (settlementCount <= 0) {
      console.warn('定居点数量为 0，无法生成角色');
      return;
    }

    for (let i = 0; i < count; i++) {
      const character: Character = {
        id: this.generateId(),
        name: this.generateRandomName(),
        age: this.randomInt(18, 70),
        locationSettlementIndex: this.randomInt(0, settlementCount - 1),
        attributes: {
          martial: this.randomInt(20, 95),
          intelligence: this.randomInt(20, 95),
          charisma: this.randomInt(20, 95),
        },
      };

      this.add(character);
    }

    console.log(`✅ 已生成 ${count} 个随机角色`);
  }

  /**
   * 生成随机姓名（简单实现，使用中文姓氏+名字）
   */
  private generateRandomName(): string {
    const surnames = [
      '李', '王', '张', '刘', '陈', '杨', '黄', '赵', '周', '吴',
      '徐', '孙', '马', '朱', '胡', '郭', '何', '林', '高', '罗',
      '郑', '梁', '谢', '宋', '唐', '许', '韩', '冯', '邓', '曹',
    ];

    const firstNames = [
      '明', '强', '军', '伟', '勇', '磊', '涛', '超', '刚', '平',
      '杰', '鹏', '华', '浩', '亮', '波', '峰', '辉', '龙', '飞',
      '静', '丽', '芳', '燕', '娟', '敏', '秀', '慧', '婷', '玲',
      '雪', '梅', '霞', '红', '艳', '琳', '洁', '莉', '萍', '云',
      '文', '武', '德', '仁', '义', '礼', '智', '信', '忠', '孝',
    ];

    const secondNames = [
      '明', '强', '军', '伟', '勇', '磊', '涛', '超', '刚', '平',
      '杰', '鹏', '华', '浩', '亮', '波', '峰', '辉', '龙', '飞',
      '静', '丽', '芳', '燕', '娟', '敏', '秀', '慧', '婷', '玲',
      '', '', '', '', '', '', '', '', '', '',  // 30% 概率只有一个名字
    ];

    const surname = surnames[this.randomInt(0, surnames.length - 1)];
    const firstName = firstNames[this.randomInt(0, firstNames.length - 1)];
    const secondName = secondNames[this.randomInt(0, secondNames.length - 1)];

    return `${surname}${firstName}${secondName}`;
  }

  /**
   * 生成随机整数 [min, max]
   */
  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * 获取状态（用于存档）
   */
  getState(): CharacterManagerState {
    return {
      characters: this.getAll(),
      nextId: this.nextId,
    };
  }

  /**
   * 从状态加载（用于读档）
   */
  loadState(state: CharacterManagerState): void {
    this.clear();
    this.nextId = state.nextId;

    for (const character of state.characters) {
      this.add(character);
    }

    console.log(`✅ 从存档加载了 ${state.characters.length} 个角色`);
  }
}
