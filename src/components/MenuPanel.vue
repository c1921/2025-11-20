<script setup lang="ts">
defineProps<{
  isLoadingSave: boolean;
  isSaving: boolean;
  saveMessage: string;
}>();

const emit = defineEmits<{
  'new-game': [];
  load: [];
  settings: [];
}>();
</script>

<template>
  <div class="card bg-base-300 shadow-xl w-96">
    <div class="card-body p-6 items-center text-center">

      <div class="flex flex-col gap-3 w-full">
        <button
          class="btn btn-primary btn-lg"
          @click="emit('new-game')"
        >
          创建新游戏
        </button>

        <button
          class="btn btn-secondary"
          @click="emit('load')"
          :disabled="isLoadingSave || isSaving"
        >
          {{ isLoadingSave ? '读取中...' : '加载存档' }}
        </button>

        <button
          class="btn btn-ghost"
          @click="emit('settings')"
          disabled
        >
          设置
          <span class="badge badge-sm">敬请期待</span>
        </button>

        <p v-if="saveMessage" class="text-xs text-success mt-2">{{ saveMessage }}</p>
      </div>
    </div>
  </div>
</template>
