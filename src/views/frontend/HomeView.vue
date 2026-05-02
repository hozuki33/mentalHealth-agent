<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goChat = () => {
  router.push('/chat')
}

const goDiary = () => {
  router.push('/diary')
}
</script>

<template>
  <div class="home">
    <section class="hero">
      <div class="hero__inner">
        <div class="hero__text">
          <h1 class="hero__line hero__line--white">一次温暖的对话</h1>
          <h2 class="hero__line hero__line--yellow">化孤独为慰藉</h2>
          <p class="hero__desc">
            每个深夜，每个焦虑的时刻，我们都在这里。不必独自承受，让心与心的连接温暖您的每一天
          </p>
          <div class="hero__actions">
            <button type="button" class="btn btn--solid" @click="goChat">开始倾诉，获得陪伴</button>
            <button type="button" class="btn btn--ghost" @click="goDiary">记录心情，释放情感</button>
          </div>
        </div>

        <div class="hero__visual" aria-hidden="true">
          <div class="hero__circle">
            <svg class="hero__robot" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
              <rect x="14" y="18" width="36" height="32" rx="6" fill="none" stroke="currentColor" stroke-width="2.5" />
              <circle cx="26" cy="32" r="3.5" fill="currentColor" />
              <circle cx="38" cy="32" r="3.5" fill="currentColor" />
              <path d="M24 42h16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
              <path d="M32 18V10M24 10h16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
              <circle cx="32" cy="6" r="3" fill="currentColor" />
              <rect x="8" y="28" width="6" height="10" rx="2" fill="currentColor" opacity="0.85" />
              <rect x="50" y="28" width="6" height="10" rx="2" fill="currentColor" opacity="0.85" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.hero {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 80px);
  padding: 48px 40px 64px;
  background: var(--home-hero-bg, #609484);
  color: #fff;
}

.hero__inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 40px 56px;
  width: 100%;
  max-width: 1040px;
  margin: 0 auto;
}

.hero__text {
  flex: 0 1 560px;
  max-width: 560px;
  width: 100%;
  text-align: center;
}

.hero__line {
  margin: 0;
  font-size: clamp(32px, 5vw, 48px);
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: 0.02em;
}

.hero__line--white {
  color: #fff;
}

.hero__line--yellow {
  margin-top: 10px;
  color: var(--home-hero-accent, #ffeb7a);
}

.hero__desc {
  margin: 24px auto 0;
  max-width: 480px;
  font-size: 16px;
  line-height: 1.85;
  color: rgba(255, 255, 255, 0.95);
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 36px;
  justify-content: center;
}

.btn {
  padding: 14px 24px;
  font-size: 15px;
  font-weight: 600;
  border-radius: 10px;
  cursor: pointer;
  font-family: inherit;
  border: 2px solid transparent;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
}

.btn:active {
  transform: scale(0.98);
}

.btn--solid {
  background: var(--home-btn-solid-bg, #fff);
  color: var(--home-btn-solid-text, #1a1a1a);
  border-color: var(--home-btn-solid-bg, #fff);
}

.btn--solid:hover {
  background: var(--home-btn-solid-hover, #f5f1eb);
}

.btn--ghost {
  background: transparent;
  color: #fff;
  border-color: rgba(255, 255, 255, 0.85);
}

.btn--ghost:hover {
  background: rgba(255, 255, 255, 0.12);
}

.hero__visual {
  flex: 0 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  text-align: center;
}

.hero__circle {
  width: min(72vw, 340px);
  height: min(72vw, 340px);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.12);
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.15);
}

.hero__robot {
  width: 42%;
  height: 42%;
  color: #fff;
}

@media (max-width: 900px) {
  .hero {
    padding: 40px 24px 48px;
  }

  .hero__inner {
    flex-direction: column;
  }

  .hero__visual {
    order: -1;
  }

  .hero__circle {
    width: min(64vw, 260px);
    height: min(64vw, 260px);
  }
}
</style>
