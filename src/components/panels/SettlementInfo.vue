<script setup lang="ts">
import { computed } from 'vue';
import type { Settlement } from '../../map/core/types';
import type { Character } from '../../world/systems/CharacterTypes';

interface Props {
  settlement: Settlement | null;
  settlementIndex: number | null;
  characters: Character[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  selectCharacter: [character: Character];
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
</script>

<template>
  <div v-if="settlement" class="settlement-info">
    <div class="header">
      <h3>{{ categoryName }}</h3>
      <button class="close-btn" @click="emit('close')">×</button>
    </div>

    <div class="info-section">
      <div class="info-row">
        <span class="label">坐标:</span>
        <span class="value">{{ settlement.x.toFixed(0) }}, {{ settlement.y.toFixed(0) }}</span>
      </div>
      <div class="info-row">
        <span class="label">海拔:</span>
        <span class="value">{{ (settlement.elevation * 100).toFixed(1) }}%</span>
      </div>
      <div class="info-row">
        <span class="label">适宜度:</span>
        <span class="value">{{ (settlement.suitability * 100).toFixed(1) }}%</span>
      </div>
    </div>

    <div class="characters-section">
      <h4>角色 ({{ localCharacters.length }})</h4>
      <div v-if="localCharacters.length === 0" class="empty-message">
        此地无人
      </div>
      <div v-else class="character-list">
        <div
          v-for="character in localCharacters"
          :key="character.id"
          class="character-item"
          @click="handleSelectCharacter(character)"
        >
          <div class="character-name">{{ character.name }}</div>
          <div class="character-age">{{ character.age }}岁</div>
          <div class="character-attrs">
            <span class="attr">武{{ character.attributes.martial }}</span>
            <span class="attr">谋{{ character.attributes.intelligence }}</span>
            <span class="attr">魅{{ character.attributes.charisma }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settlement-info {
  background: rgba(10, 10, 15, 0.95);
  border: 1px solid rgba(100, 100, 100, 0.3);
  border-radius: 8px;
  padding: 16px;
  min-width: 300px;
  max-width: 400px;
  color: #e8e8e8;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  border-bottom: 1px solid rgba(100, 100, 100, 0.2);
  padding-bottom: 8px;
}

.header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #ffd166;
}

.close-btn {
  background: none;
  border: none;
  color: #999;
  font-size: 28px;
  cursor: pointer;
  padding: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #fff;
}

.info-section {
  margin-bottom: 16px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 13px;
}

.label {
  color: #999;
}

.value {
  color: #e8e8e8;
  font-weight: 500;
}

.characters-section h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: #ffd166;
  border-bottom: 1px solid rgba(100, 100, 100, 0.2);
  padding-bottom: 6px;
}

.empty-message {
  text-align: center;
  padding: 12px;
  color: #666;
  font-size: 13px;
}

.character-list {
  max-height: 300px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.character-item {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(100, 100, 100, 0.2);
  border-radius: 6px;
  padding: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.character-item:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 209, 102, 0.5);
  transform: translateX(2px);
}

.character-name {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 4px;
}

.character-age {
  font-size: 12px;
  color: #999;
  margin-bottom: 6px;
}

.character-attrs {
  display: flex;
  gap: 8px;
  font-size: 12px;
}

.attr {
  background: rgba(255, 209, 102, 0.15);
  color: #ffd166;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 500;
}

.character-list::-webkit-scrollbar {
  width: 6px;
}

.character-list::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.character-list::-webkit-scrollbar-thumb {
  background: rgba(255, 209, 102, 0.3);
  border-radius: 3px;
}

.character-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 209, 102, 0.5);
}
</style>
