<script setup lang="ts">
import { ref, nextTick, watch } from 'vue';
import { useMessageBoard } from '../composables/useMessageBoard';

const props = defineProps<{
  currentPlayerName: string;
}>();

const { sortedMessages, addMessage, clearMessages } = useMessageBoard();

const newMessage = ref('');
const newRating = ref(0);
const listRef = ref<HTMLElement | null>(null);

const scrollToBottom = () => {
  if (listRef.value) {
    listRef.value.scrollTop = listRef.value.scrollHeight;
  }
};

// 監聽訊息變化，自動滾動到最底
watch(sortedMessages, () => {
  nextTick(() => {
    scrollToBottom();
  });
}, { deep: true });

const submitMessage = () => {
  if (!newMessage.value.trim()) return;
  addMessage(props.currentPlayerName, newMessage.value, newRating.value);
  newMessage.value = '';
  newRating.value = 0;
};

const formatTime = (ts: number) => {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${min}`;
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') submitMessage();
};
</script>

<template>
  <div class="message-board-panel">
    <div class="mb-header">
      <h2 class="mb-title">
        <span class="mb-icon">💌</span>
        留言板
      </h2>
      <button
        v-if="sortedMessages.length > 0"
        class="mb-clear-btn"
        title="清空留言"
        @click="clearMessages"
      >🗑️</button>
    </div>

    <div class="mb-list-wrapper">
      <div v-if="sortedMessages.length === 0" class="mb-empty">
        <span class="mb-empty-icon">💭</span>
        <p>還沒有人留言<br/>來搶頭香吧！</p>
      </div>

      <TransitionGroup name="mb-item" tag="ul" class="mb-list" ref="listRef">
        <li
          v-for="msg in sortedMessages"
          :key="msg.id"
          class="mb-item"
          :class="{ 'is-me': msg.name === currentPlayerName }"
        >
          <div class="mb-item-header">
            <span class="mb-name">{{ msg.name }}</span>
            <div class="mb-meta">
              <span v-if="msg.rating" class="mb-rating">
                <span v-for="s in msg.rating" :key="s">⭐</span>
              </span>
              <span class="mb-time">{{ formatTime(msg.timestamp) }}</span>
            </div>
          </div>
          <p class="mb-content">{{ msg.content }}</p>
        </li>
      </TransitionGroup>
    </div>

    <div class="mb-input-container">
      <div class="mb-rating-selector">
        <span class="rating-label">評分：</span>
        <span
          v-for="star in 5"
          :key="star"
          class="rating-star"
          :class="{ active: star <= newRating }"
          @click="newRating = star"
        >⭐</span>
      </div>
      <div class="mb-input-area">
        <input
          v-model="newMessage"
          type="text"
          class="mb-input"
          placeholder="說點什麼..."
          maxlength="30"
          @keydown="handleKeydown"
        />
        <button class="mb-send-btn" @click="submitMessage" :disabled="!newMessage.trim()">
          送出
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ====== 面板容器 ====== */
.message-board-panel {
  width: 220px;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.88);
  border: 2px solid rgba(255, 182, 193, 0.45);
  border-radius: 22px;
  padding: 16px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow:
    0 6px 28px rgba(255, 105, 180, 0.13),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  font-family: 'Nunito', 'PingFang TC', 'Microsoft JhengHei', sans-serif;
  height: calc(100vh - 120px);
  max-height: 850px;
  animation: slideInRight 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes slideInRight {
  from { transform: translateX(30px); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}

/* ====== 標題 ====== */
.mb-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
  flex-shrink: 0;
}

.mb-title {
  font-size: 1.05rem;
  font-weight: 900;
  margin: 0;
  color: #d6336c;
  display: flex;
  align-items: center;
  gap: 5px;
}

.mb-icon {
  display: inline-block;
  animation: bounceSlow 2s ease-in-out infinite alternate;
}

@keyframes bounceSlow {
  from { transform: translateY(0); }
  to   { transform: translateY(-3px); }
}

.mb-clear-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  opacity: 0.45;
  transition: all 0.2s ease;
  padding: 2px;
  border-radius: 6px;
}

.mb-clear-btn:hover {
  opacity: 0.9;
  transform: scale(1.1);
}

/* ====== 留言列表 ====== */
.mb-list-wrapper {
  flex: 1;
  min-height: 0;
  position: relative;
  border-radius: 12px;
  background: rgba(255, 240, 248, 0.4);
  border: 1px solid rgba(255, 182, 193, 0.2);
  display: flex;
  flex-direction: column;
}

.mb-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 8px;
  color: #e0a0c0;
  font-size: 0.82rem;
  font-weight: 600;
  text-align: center;
}

.mb-empty-icon {
  font-size: 1.8rem;
  opacity: 0.7;
}

.mb-list {
  list-style: none;
  margin: 0;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 182, 193, 0.6) transparent;
}

.mb-list::-webkit-scrollbar {
  width: 4px;
}
.mb-list::-webkit-scrollbar-thumb {
  background-color: rgba(255, 182, 193, 0.6);
  border-radius: 4px;
}

/* ====== 每一則留言 ====== */
.mb-item {
  display: flex;
  flex-direction: column;
  background: white;
  border: 1.5px solid rgba(255, 182, 193, 0.3);
  border-radius: 12px;
  padding: 8px 10px;
  font-size: 0.85rem;
  box-shadow: 0 2px 6px rgba(255, 182, 193, 0.1);
  word-break: break-word;
}

.mb-item.is-me {
  background: rgba(255, 240, 248, 0.9);
  border-color: rgba(255, 105, 180, 0.4);
}

.mb-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  gap: 8px;
}

.mb-name {
  font-weight: 800;
  color: #d6336c;
  font-size: 0.78rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.mb-time {
  font-size: 0.65rem;
  color: #d4a0b8;
  font-weight: 600;
}

.mb-meta {
  display: flex;
  align-items: center;
  gap: 4px;
}

.mb-rating {
  font-size: 0.65rem;
  letter-spacing: -1px;
}

.mb-content {
  margin: 0;
  color: #555;
  font-weight: 600;
  line-height: 1.35;
}

/* ====== 輸入區 ====== */
.mb-input-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
  flex-shrink: 0;
}

.mb-rating-selector {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 4px;
}

.rating-label {
  font-size: 0.75rem;
  color: #d6336c;
  font-weight: 700;
}

.rating-star {
  cursor: pointer;
  font-size: 0.85rem;
  opacity: 0.3;
  transition: all 0.2s ease;
  filter: grayscale(100%);
}

.rating-star:hover {
  transform: scale(1.15);
}

.rating-star.active {
  opacity: 1;
  filter: grayscale(0%);
  transform: scale(1.1);
}

.mb-input-area {
  display: flex;
  gap: 6px;
}

.mb-input {
  flex: 1;
  min-width: 0;
  background: rgba(255, 240, 248, 0.8);
  border: 1.5px solid rgba(255, 182, 193, 0.5);
  border-radius: 14px;
  padding: 6px 10px;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  color: #d6336c;
  outline: none;
  transition: all 0.2s ease;
}

.mb-input:focus {
  border-color: #ff69b4;
  background: white;
}

.mb-send-btn {
  background: linear-gradient(135deg, #ff69b4, #ff1493);
  color: white;
  border: none;
  border-radius: 14px;
  padding: 0 12px;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
  transition: transform 0.2s, opacity 0.2s;
  white-space: nowrap;
}

.mb-send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.mb-send-btn:not(:disabled):hover {
  transform: scale(1.05);
}

/* ====== 動畫 ====== */
.mb-item-enter-active {
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.mb-item-enter-from {
  opacity: 0;
  transform: translateY(15px) scale(0.95);
}
</style>
