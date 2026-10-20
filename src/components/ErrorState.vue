<template>
  <div class="es" :class="{ compact }">
    <span class="es-ico">⚠️</span>
    <p class="es-msg">{{ message || '该数据源暂时不可用' }}</p>
    <button v-if="retryable" class="es-retry" @click="$emit('retry')">重试</button>
  </div>
</template>

<script setup>
defineProps({
  message: { type: String, default: '' },
  compact: { type: Boolean, default: false },
  retryable: { type: Boolean, default: true }
})

defineEmits(['retry'])
</script>

<style scoped>
.es {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 40px 16px;
  text-align: center;
  width: 100%;
}

.es.compact {
  padding: 18px 8px;
}

.es-ico {
  font-size: 24px;
}

.es.compact .es-ico {
  font-size: 18px;
}

.es-msg {
  font-size: var(--font-md);
  color: var(--color-text-3);
}

.es.compact .es-msg {
  font-size: var(--font-xs);
}

.es-retry {
  margin-top: 4px;
  padding: 5px 18px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--color-btn-primary);
  color: #fff;
  font-size: var(--font-sm);
  cursor: pointer;
  font-family: inherit;
}

.es-retry:hover {
  background: var(--color-btn-primary-hover);
}

.es.compact .es-retry {
  padding: 3px 12px;
  font-size: var(--font-xs);
}
</style>
