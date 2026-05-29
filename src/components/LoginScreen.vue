<script setup lang="ts">
import { ref, onMounted } from 'vue';

const emit = defineEmits<{ login: [name: string] }>();

const playerName = ref('');
const inputRef = ref<HTMLInputElement | null>(null);
const isShaking = ref(false);
const STORAGE_KEY = 'wm_snake_player_name';

onMounted(() => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) playerName.value = saved;
  // 自動 focus 輸入框
  setTimeout(() => inputRef.value?.focus(), 300);
});

const handleLogin = () => {
  const name = playerName.value.trim();
  if (!name) {
    // 輸入框抖動提示
    isShaking.value = true;
    setTimeout(() => { isShaking.value = false; }, 600);
    inputRef.value?.focus();
    return;
  }
  localStorage.setItem(STORAGE_KEY, name);
  emit('login', name);
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') handleLogin();
};

// 預先產生浮動愛心資料（和遊戲主畫面一致）
const HEART_CHARS = ['💕', '💗', '💖', '🩷', '♥', '💘'];
const hearts = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  char: HEART_CHARS[i % HEART_CHARS.length],
  left: (i * 7.2 + Math.random() * 3) + '%',
  animationDelay: (i * 0.65 + Math.random() * 0.4) + 's',
  animationDuration: (7 + Math.random() * 6) + 's',
  fontSize: (10 + Math.random() * 16) + 'px',
  opacity: 0.1 + Math.random() * 0.2,
}));
</script>

<template>
  <div class="login-wrapper">
    <!-- 浮動愛心背景 -->
    <div class="floating-hearts" aria-hidden="true">
      <span
        v-for="h in hearts"
        :key="h.id"
        class="heart-particle"
        :style="{
          left: h.left,
          animationDelay: h.animationDelay,
          animationDuration: h.animationDuration,
          fontSize: h.fontSize,
          opacity: h.opacity,
        }"
      >{{ h.char }}</span>
    </div>

    <!-- 登入卡片 -->
    <div class="login-card">
      <!-- 上方裝飾圖示 -->
      <div class="login-icons" aria-hidden="true">
        <span class="icon-bounce" style="animation-delay: 0s">🐍</span>
        <span class="icon-pulse" style="animation-delay: 0.3s">💕</span>
        <span class="icon-bounce" style="animation-delay: 0.6s">🎂</span>
      </div>

      <h1 class="login-title">崴孟純愛貪食蛇</h1>
      <p class="login-subtitle">你是誰？讓我們認識你 ✨</p>

      <div class="input-group">
        <label for="player-name" class="input-label">你的名字</label>
        <div class="input-wrapper" :class="{ shake: isShaking }">
          <span class="input-icon">🌸</span>
          <input
            id="player-name"
            ref="inputRef"
            v-model="playerName"
            type="text"
            class="name-input"
            placeholder="輸入你的名字..."
            maxlength="10"
            autocomplete="off"
            @keydown="handleKeydown"
          />
        </div>
        <p class="input-hint">最多 10 個字，按 Enter 也可以開始 💌</p>
      </div>

      <button class="login-btn" @click="handleLogin">
        <span>進入遊戲</span>
        <span class="btn-icon">💖</span>
      </button>

      <p class="login-footer">崴崴孟孟的甜蜜世界，歡迎你 🐍</p>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');

/* ====== 全頁背景 ====== */
.login-wrapper {
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: hidden;
  font-family: 'Nunito', 'PingFang TC', 'Microsoft JhengHei', sans-serif;
}

/* ====== 浮動愛心 ====== */
.floating-hearts {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.heart-particle {
  position: absolute;
  bottom: -30px;
  will-change: transform;
  animation: floatUp linear infinite;
}

@keyframes floatUp {
  from { transform: translateY(0) scale(1);   opacity: 0; }
  10%  { opacity: 0.25; }
  90%  { opacity: 0.1; }
  to   { transform: translateY(-105vh) scale(0.6); opacity: 0; }
}

/* ====== 登入卡片 ====== */
.login-card {
  position: relative;
  z-index: 1;
  background: rgba(255, 255, 255, 0.92);
  border: 2px solid rgba(255, 182, 193, 0.5);
  border-radius: 28px;
  padding: 40px 44px 36px;
  width: min(420px, 90vw);
  box-shadow:
    0 10px 40px rgba(255, 105, 180, 0.16),
    0 2px 10px rgba(255, 182, 193, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  text-align: center;
  animation: cardIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes cardIn {
  from { transform: translateY(30px) scale(0.95); opacity: 0; }
  to   { transform: translateY(0) scale(1); opacity: 1; }
}

/* ====== 上方裝飾 ====== */
.login-icons {
  display: flex;
  justify-content: center;
  gap: 12px;
  font-size: 2rem;
  margin-bottom: 14px;
}

.icon-bounce {
  display: inline-block;
  will-change: transform;
  animation: iconBounce 1.6s ease-in-out infinite alternate;
}

.icon-pulse {
  display: inline-block;
  will-change: transform;
  animation: iconPulse 1.2s ease-in-out infinite;
}

@keyframes iconBounce {
  from { transform: translateY(0); }
  to   { transform: translateY(-8px); }
}

@keyframes iconPulse {
  0%, 100% { transform: scale(1); }
  50%       { transform: scale(1.3); }
}

/* ====== 標題 ====== */
.login-title {
  font-size: 1.9rem;
  font-weight: 900;
  margin: 0 0 6px;
  background: linear-gradient(135deg, #ff6b9d, #e91e8c, #ff6bb5);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: shimmer 3s ease infinite;
  letter-spacing: 0.5px;
  line-height: 1.2;
}

@keyframes shimmer {
  0%   { background-position: 0% center; }
  50%  { background-position: 100% center; }
  100% { background-position: 0% center; }
}

.login-subtitle {
  font-size: 1rem;
  color: #e07aab;
  font-weight: 600;
  margin: 0 0 28px;
}

/* ====== 輸入區塊 ====== */
.input-group {
  text-align: left;
  margin-bottom: 24px;
}

.input-label {
  display: block;
  font-size: 0.9rem;
  font-weight: 700;
  color: #d6336c;
  margin-bottom: 8px;
  letter-spacing: 0.5px;
}

.input-wrapper {
  display: flex;
  align-items: center;
  background: rgba(255, 240, 248, 0.8);
  border: 2px solid rgba(255, 182, 193, 0.5);
  border-radius: 14px;
  padding: 2px 14px;
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
  gap: 8px;
}

.input-wrapper:focus-within {
  border-color: #ff69b4;
  box-shadow: 0 0 0 3px rgba(255, 105, 180, 0.15);
  background: rgba(255, 245, 252, 0.95);
}

/* 抖動動畫（輸入為空時的提示） */
.input-wrapper.shake {
  animation: shake 0.55s cubic-bezier(0.36, 0.07, 0.19, 0.97);
  border-color: #ff4d7d;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  15%       { transform: translateX(-7px); }
  30%       { transform: translateX(6px); }
  45%       { transform: translateX(-5px); }
  60%       { transform: translateX(4px); }
  75%       { transform: translateX(-3px); }
}

.input-icon {
  font-size: 1.1rem;
  flex-shrink: 0;
}

.name-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-family: inherit;
  font-size: 1.1rem;
  font-weight: 700;
  color: #d6336c;
  padding: 12px 0;
  min-width: 0;
}

.name-input::placeholder {
  color: #f0a0c0;
  font-weight: 600;
}

.input-hint {
  font-size: 0.78rem;
  color: #d4a0b8;
  font-weight: 600;
  margin: 7px 0 0 2px;
}

/* ====== 按鈕 ====== */
.login-btn {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #ff69b4, #ff1493, #e91e8c);
  background-size: 200% auto;
  font-size: 1.15rem;
  font-weight: 800;
  padding: 14px 24px;
  color: white;
  border: none;
  border-radius: 50px;
  cursor: pointer;
  font-family: inherit;
  letter-spacing: 1px;
  transition: transform 0.25s ease, box-shadow 0.25s ease, background-position 0.4s ease;
  box-shadow: 0 4px 20px rgba(255, 20, 147, 0.32);
  margin-bottom: 16px;
}

.login-btn:hover {
  background-position: right center;
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 6px 28px rgba(255, 20, 147, 0.42);
}

.login-btn:active {
  transform: translateY(0) scale(0.98);
}

.btn-icon {
  display: inline-block;
  will-change: transform;
  animation: iconPulse 1.4s ease-in-out infinite;
}

/* ====== 底部文字 ====== */
.login-footer {
  font-size: 0.88rem;
  color: #d4a0b8;
  font-weight: 600;
  margin: 0;
}
</style>
