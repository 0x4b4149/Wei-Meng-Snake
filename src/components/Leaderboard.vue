<script setup lang="ts">
import { computed } from 'vue';
import { useLeaderboard } from '../composables/useLeaderboard';

const props = defineProps<{
  currentPlayerName: string;
  latestEntryId?: string; // 剛剛新增的那筆（高亮用）
}>();

const { sortedEntries, clearLeaderboard } = useLeaderboard();

const CHAR_EMOJI: Record<string, string> = {
  wei: '🧑',
  meng: '👩',
};

const formatTime = (ts: number) => {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${mm}/${dd} ${hh}:${min}`;
};

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

const getRankLabel = (rank: number) => MEDAL[rank] ?? `#${rank}`;

const isEmpty = computed(() => sortedEntries.value.length === 0);
</script>

<template>
  <div class="leaderboard-panel">
    <div class="lb-header">
      <h2 class="lb-title">
        <span class="lb-crown">👑</span>
        排行榜
      </h2>
      <button
        v-if="!isEmpty"
        class="lb-clear-btn"
        title="清除排行榜"
        @click="clearLeaderboard"
      >🗑️</button>
    </div>

    <div v-if="isEmpty" class="lb-empty">
      <span class="lb-empty-icon">🐍</span>
      <p>快去玩遊戲<br/>創造紀錄！</p>
    </div>

    <TransitionGroup v-else name="lb-item" tag="ol" class="lb-list">
      <li
        v-for="(entry, idx) in sortedEntries"
        :key="entry.id"
        class="lb-item"
        :class="{
          'is-gold':   idx === 0,
          'is-silver': idx === 1,
          'is-bronze': idx === 2,
          'is-me':     entry.name === currentPlayerName,
          'is-new':    entry.id === latestEntryId,
        }"
      >
        <span class="lb-rank">{{ getRankLabel(idx + 1) }}</span>
        <span class="lb-char">{{ CHAR_EMOJI[entry.character] }}</span>
        <div class="lb-info">
          <span class="lb-name">{{ entry.name }}</span>
          <span class="lb-time">{{ formatTime(entry.timestamp) }}</span>
        </div>
        <span class="lb-score">{{ entry.score }}</span>
      </li>
    </TransitionGroup>

    <p class="lb-footer">💕 崴孟最強</p>
  </div>
</template>

<style scoped>
/* ====== 面板容器 ====== */
.leaderboard-panel {
  width: 200px;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.88);
  border: 2px solid rgba(255, 182, 193, 0.45);
  border-radius: 22px;
  padding: 16px 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow:
    0 6px 28px rgba(255, 105, 180, 0.13),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  font-family: 'Nunito', 'PingFang TC', 'Microsoft JhengHei', sans-serif;
  /* 高度跟隨遊戲容器對齊，但有最大最小限制 */
  max-height: 90vh;
  overflow: hidden;
  animation: slideInLeft 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes slideInLeft {
  from { transform: translateX(-30px); opacity: 0; }
  to   { transform: translateX(0);     opacity: 1; }
}

/* ====== 標題 ====== */
.lb-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.lb-title {
  font-size: 1.05rem;
  font-weight: 900;
  margin: 0;
  color: #d6336c;
  display: flex;
  align-items: center;
  gap: 5px;
}

.lb-crown {
  display: inline-block;
  animation: crownBounce 2s ease-in-out infinite alternate;
}

@keyframes crownBounce {
  from { transform: translateY(0) rotate(-5deg); }
  to   { transform: translateY(-4px) rotate(5deg); }
}

.lb-clear-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  opacity: 0.45;
  transition: opacity 0.2s ease, transform 0.2s ease;
  padding: 2px 4px;
  border-radius: 6px;
  line-height: 1;
}

.lb-clear-btn:hover {
  opacity: 0.9;
  transform: scale(1.1);
}

/* ====== 空狀態 ====== */
.lb-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 0;
  color: #e0a0c0;
  font-size: 0.82rem;
  font-weight: 600;
  text-align: center;
  line-height: 1.5;
}

.lb-empty-icon {
  font-size: 2rem;
  animation: emptySnake 2s ease-in-out infinite alternate;
}

@keyframes emptySnake {
  from { transform: rotate(-8deg); }
  to   { transform: rotate(8deg); }
}

/* ====== 排行列表 ====== */
.lb-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
  overflow-y: auto;
  /* 隱藏 scrollbar 但保留捲動 */
  scrollbar-width: none;
}
.lb-list::-webkit-scrollbar { display: none; }

/* ====== 每一筆 ====== */
.lb-item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 7px 8px;
  border-radius: 12px;
  background: rgba(255, 240, 248, 0.6);
  border: 1.5px solid rgba(255, 182, 193, 0.25);
  transition: all 0.25s ease;
  min-width: 0;
}

.lb-item.is-gold   { background: rgba(255, 215, 0, 0.12); border-color: rgba(255, 215, 0, 0.4); }
.lb-item.is-silver { background: rgba(192, 192, 192, 0.12); border-color: rgba(192, 192, 192, 0.4); }
.lb-item.is-bronze { background: rgba(205, 127, 50, 0.1); border-color: rgba(205, 127, 50, 0.3); }

/* 當前玩家的記錄加框線 */
.lb-item.is-me {
  border-color: rgba(255, 105, 180, 0.55);
  box-shadow: 0 0 8px rgba(255, 105, 180, 0.15);
}

/* 剛新增的記錄閃爍提示 */
.lb-item.is-new {
  animation: newEntryFlash 1.5s ease-out;
}

@keyframes newEntryFlash {
  0%  { background: rgba(255, 105, 180, 0.3); box-shadow: 0 0 16px rgba(255, 105, 180, 0.4); }
  100% { background: rgba(255, 240, 248, 0.6); box-shadow: none; }
}

.lb-rank {
  font-size: 0.9rem;
  font-weight: 900;
  min-width: 22px;
  text-align: center;
}

.lb-char {
  font-size: 1rem;
  flex-shrink: 0;
}

.lb-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.lb-name {
  font-size: 0.82rem;
  font-weight: 800;
  color: #d6336c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lb-time {
  font-size: 0.65rem;
  color: #d4a0b8;
  font-weight: 600;
}

.lb-score {
  font-size: 0.9rem;
  font-weight: 900;
  color: #e91e8c;
  flex-shrink: 0;
}

/* ====== 底部小字 ====== */
.lb-footer {
  text-align: center;
  font-size: 0.72rem;
  color: #d4a0b8;
  font-weight: 700;
  margin: 0;
}

/* ====== TransitionGroup 動畫 ====== */
.lb-item-enter-active {
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.lb-item-leave-active {
  transition: all 0.25s ease;
}
.lb-item-enter-from {
  opacity: 0;
  transform: translateX(-20px) scale(0.9);
}
.lb-item-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
.lb-item-move {
  transition: transform 0.3s ease;
}
</style>
