<script setup lang="ts">
import { ref } from 'vue';
import LoginScreen from './components/LoginScreen.vue';
import SnakeGame from './components/SnakeGame.vue';

const playerName = ref<string | null>(null);

// 嘗試從 localStorage 恢復登入狀態（已登入過就跳過登入頁）
const saved = localStorage.getItem('wm_snake_player_name');
if (saved) playerName.value = saved;

const handleLogin = (name: string) => {
  playerName.value = name;
};

const handleLogout = () => {
  playerName.value = null;
  localStorage.removeItem('wm_snake_player_name');
};
</script>

<template>
  <LoginScreen v-if="!playerName" @login="handleLogin" />
  <SnakeGame v-else :player-name="playerName" @logout="handleLogout" />
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');

* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: linear-gradient(135deg, #fff0f5 0%, #ffe4f3 25%, #ffd6e8 50%, #ffe0f0 75%, #fff5fa 100%);
  background-size: 400% 400%;
  animation: gradientShift 12s ease infinite;
}

@keyframes gradientShift {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

#app {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: 'Nunito', 'PingFang TC', 'Microsoft JhengHei', sans-serif;
}
</style>

