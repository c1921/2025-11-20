<script setup lang="ts">
import { computed } from 'vue';
import type { Settlement } from '../../map/core/types';
import type { Character } from '../../world/systems/CharacterTypes';

interface Props {
  world?: any;
  settlement: Settlement | null;
  settlementIndex: number | null;
  characters: Character[];
  selectedCharacter: Character | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  selectCharacter: [character: Character];
  closeCharacter: [];
  close: [];
}>();

const categoryName = computed(() => {
  if (!props.settlement) return '';
  const category = props.settlement.category ?? 'village';
  return {
    city: '城市',
    town: '城镇',
    village: '村庄',
  }[category];
});

const localCharacters = computed(() => {
  if (props.settlementIndex === null) return [];
  return props.characters.filter(
    (char) => char.locationSettlementIndex === props.settlementIndex
  );
});

const handleSelectCharacter = (character: Character) => {
  emit('selectCharacter', character);
};

const handleCloseCharacter = () => {
  emit('closeCharacter');
};
</script>

<template>
  <div
    id="game-drawer"
    class="overlay overlay-open:translate-x-0 drawer drawer-start hidden [--body-scroll:true] [--overlay-backdrop:false] z-200!"
    role="dialog"
    tabindex="-1"
  >
    <div class="drawer-header">
      <h3 class="drawer-title">
        {{ selectedCharacter ? selectedCharacter.name : settlement ? categoryName : '游戏信息' }}
      </h3>
      <button
        type="button"
        class="btn btn-text btn-circle btn-sm absolute end-3 top-3"
        aria-label="Close"
        data-overlay="#game-drawer"
      >
        <span class="icon-[tabler--x] size-5"></span>
      </button>
    </div>

    <div class="drawer-body">
      <!-- 角色详情 -->
      <div v-if="selectedCharacter" class="space-y-4">
        <!-- 基本信息 -->
        <div class="bg-base-content/5 rounded-lg p-3">
          <div class="flex justify-between py-1 text-sm">
            <span class="text-base-content/60">ID:</span>
            <span class="text-base-content font-medium">{{ selectedCharacter.id }}</span>
          </div>
          <div class="flex justify-between py-1 text-sm">
            <span class="text-base-content/60">年龄:</span>
            <span class="text-base-content font-medium">{{ selectedCharacter.age }}岁</span>
          </div>
          <div class="flex justify-between py-1 text-sm">
            <span class="text-base-content/60">所在地:</span>
            <span class="text-base-content font-medium">定居点 #{{ selectedCharacter.locationSettlementIndex }}</span>
          </div>
        </div>

        <!-- 属性 -->
        <div>
          <h4 class="text-sm font-semibold text-warning mb-2 pb-1.5 border-b border-base-content/20">属性</h4>
          <div class="space-y-3">
            <!-- 武力 -->
            <div class="space-y-1">
              <div class="flex justify-between text-sm text-base-content">
                <span>武力</span>
                <span class="font-semibold text-warning">{{ selectedCharacter.attributes.martial }}</span>
              </div>
              <div class="h-5 bg-base-content/10 rounded overflow-hidden">
                <div
                  class="h-full bg-linear-to-r from-error to-error/80 rounded transition-all duration-300"
                  :style="{ width: selectedCharacter.attributes.martial + '%' }"
                ></div>
              </div>
            </div>

            <!-- 谋略 -->
            <div class="space-y-1">
              <div class="flex justify-between text-sm text-base-content">
                <span>谋略</span>
                <span class="font-semibold text-warning">{{ selectedCharacter.attributes.intelligence }}</span>
              </div>
              <div class="h-5 bg-base-content/10 rounded overflow-hidden">
                <div
                  class="h-full bg-linear-to-r from-info to-info/80 rounded transition-all duration-300"
                  :style="{ width: selectedCharacter.attributes.intelligence + '%' }"
                ></div>
              </div>
            </div>

            <!-- 魅力 -->
            <div class="space-y-1">
              <div class="flex justify-between text-sm text-base-content">
                <span>魅力</span>
                <span class="font-semibold text-warning">{{ selectedCharacter.attributes.charisma }}</span>
              </div>
              <div class="h-5 bg-base-content/10 rounded overflow-hidden">
                <div
                  class="h-full bg-linear-to-r from-secondary to-secondary/80 rounded transition-all duration-300"
                  :style="{ width: selectedCharacter.attributes.charisma + '%' }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          class="btn btn-soft btn-secondary w-full"
          @click="handleCloseCharacter"
        >
          返回定居点
        </button>
      </div>

      <!-- 定居点信息 -->
      <div v-else-if="settlement" class="space-y-4">
        <!-- 基本信息 -->
        <div class="bg-base-content/5 rounded-lg p-3">
          <div class="flex justify-between py-1 text-sm">
            <span class="text-base-content/60">坐标:</span>
            <span class="text-base-content font-medium">{{ settlement.x.toFixed(0) }}, {{ settlement.y.toFixed(0) }}</span>
          </div>
          <div class="flex justify-between py-1 text-sm">
            <span class="text-base-content/60">海拔:</span>
            <span class="text-base-content font-medium">{{ (settlement.elevation * 100).toFixed(1) }}%</span>
          </div>
          <div class="flex justify-between py-1 text-sm">
            <span class="text-base-content/60">适宜度:</span>
            <span class="text-base-content font-medium">{{ (settlement.suitability * 100).toFixed(1) }}%</span>
          </div>
        </div>

        <!-- 角色列表 -->
        <div>
          <h4 class="text-sm font-semibold text-warning mb-2 pb-1.5 border-b border-base-content/20">
            角色 ({{ localCharacters.length }})
          </h4>
          <div v-if="localCharacters.length === 0" class="text-center py-3 text-sm text-base-content/40">
            此地无人
          </div>
          <div v-else class="max-h-[300px] overflow-y-auto space-y-2">
            <div
              v-for="character in localCharacters"
              :key="character.id"
              class="bg-base-content/5 border border-base-content/20 rounded-lg p-2.5 cursor-pointer transition-all hover:bg-base-content/10 hover:border-warning/50 hover:translate-x-0.5"
              @click="handleSelectCharacter(character)"
            >
              <div class="text-sm font-semibold text-base-content mb-1">{{ character.name }}</div>
              <div class="text-xs text-base-content/60 mb-1.5">{{ character.age }}岁</div>
              <div class="flex gap-2 text-xs">
                <span class="bg-warning/15 text-warning px-1.5 py-0.5 rounded font-medium">武{{ character.attributes.martial }}</span>
                <span class="bg-warning/15 text-warning px-1.5 py-0.5 rounded font-medium">谋{{ character.attributes.intelligence }}</span>
                <span class="bg-warning/15 text-warning px-1.5 py-0.5 rounded font-medium">魅{{ character.attributes.charisma }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 默认内容（无定居点选中时） -->
      <div v-else class="space-y-4">
        <div>
          <h4 class="text-sm font-semibold mb-2">显示设置</h4>
          <p class="text-sm text-base-content/70">
            未来可以在这里添加游戏显示、音效等设置选项。
          </p>
        </div>

        <div>
          <h4 class="text-sm font-semibold mb-2">游戏信息</h4>
          <p class="text-sm text-base-content/70">
            这里可以显示游戏统计、成就等信息。
          </p>
        </div>
      </div>
    </div>

    <div class="drawer-footer" v-if="!settlement">
      <button
        type="button"
        class="btn btn-soft btn-secondary"
        data-overlay="#game-drawer"
      >
        关闭
      </button>
      <button
        type="button"
        class="btn btn-primary"
        data-overlay="#game-drawer"
      >
        保存设置
      </button>
    </div>
  </div>
</template>
