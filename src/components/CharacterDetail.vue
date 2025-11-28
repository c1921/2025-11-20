<script setup lang="ts">
import type { Character } from '../world/systems/CharacterTypes';

interface Props {
  character: Character | null;
}

defineProps<Props>();

const emit = defineEmits<{
  close: [];
}>();
</script>

<template>
  <div v-if="character" class="character-detail">
    <div class="header">
      <h3>{{ character.name }}</h3>
      <button class="close-btn" @click="emit('close')">×</button>
    </div>

    <div class="content">
      <div class="info-section">
        <div class="info-row">
          <span class="label">ID:</span>
          <span class="value">{{ character.id }}</span>
        </div>
        <div class="info-row">
          <span class="label">年龄:</span>
          <span class="value">{{ character.age }}岁</span>
        </div>
        <div class="info-row">
          <span class="label">所在地:</span>
          <span class="value">定居点 #{{ character.locationSettlementIndex }}</span>
        </div>
      </div>

      <div class="attributes-section">
        <h4>属性</h4>
        <div class="attribute-bars">
          <div class="attribute-bar">
            <div class="bar-label">
              <span>武力</span>
              <span class="bar-value">{{ character.attributes.martial }}</span>
            </div>
            <div class="bar-background">
              <div
                class="bar-fill martial"
                :style="{ width: character.attributes.martial + '%' }"
              ></div>
            </div>
          </div>

          <div class="attribute-bar">
            <div class="bar-label">
              <span>谋略</span>
              <span class="bar-value">{{ character.attributes.intelligence }}</span>
            </div>
            <div class="bar-background">
              <div
                class="bar-fill intelligence"
                :style="{ width: character.attributes.intelligence + '%' }"
              ></div>
            </div>
          </div>

          <div class="attribute-bar">
            <div class="bar-label">
              <span>魅力</span>
              <span class="bar-value">{{ character.attributes.charisma }}</span>
            </div>
            <div class="bar-background">
              <div
                class="bar-fill charisma"
                :style="{ width: character.attributes.charisma + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.character-detail {
  background: rgba(10, 10, 15, 0.95);
  border: 1px solid rgba(100, 100, 100, 0.3);
  border-radius: 8px;
  padding: 16px;
  min-width: 320px;
  max-width: 400px;
  color: #e8e8e8;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  border-bottom: 1px solid rgba(100, 100, 100, 0.2);
  padding-bottom: 8px;
}

.header h3 {
  margin: 0;
  font-size: 20px;
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

.content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 14px;
}

.label {
  color: #999;
  font-weight: 500;
}

.value {
  color: #e8e8e8;
  font-weight: 600;
}

.attributes-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #ffd166;
  border-bottom: 1px solid rgba(100, 100, 100, 0.2);
  padding-bottom: 6px;
}

.attribute-bars {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.attribute-bar {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bar-label {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #e8e8e8;
}

.bar-value {
  font-weight: 600;
  color: #ffd166;
}

.bar-background {
  height: 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  transition: width 0.3s ease;
  border-radius: 4px;
}

.bar-fill.martial {
  background: linear-gradient(90deg, #ef4444, #dc2626);
}

.bar-fill.intelligence {
  background: linear-gradient(90deg, #3b82f6, #2563eb);
}

.bar-fill.charisma {
  background: linear-gradient(90deg, #8b5cf6, #7c3aed);
}
</style>
