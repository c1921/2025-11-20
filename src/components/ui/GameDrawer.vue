<script setup lang="ts">

// 抽屉状态可以通过父组件控制
defineProps<{
  world?: any; // 预留给未来扩展
}>();

const emit = defineEmits<{
  close: [];
}>();
</script>

<template>
  <div
    id="game-drawer"
    class="overlay overlay-open:translate-x-0 drawer drawer-start hidden [--body-scroll:true] [--overlay-backdrop:false]"
    role="dialog"
    tabindex="-1"
  >
    <div class="drawer-header">
      <h3 class="drawer-title">游戏设置</h3>
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
      <div class="space-y-4">
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

    <div class="drawer-footer">
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
