<script setup>
import { computed } from "vue";

const props = defineProps({
  status: {
    type: String,
    default: "idle",
    validator: (value) => ["idle", "success", "error", "speaking"].includes(value)
  }
});

const statusLabelMap = {
  idle: "等待中的猫头鹰",
  success: "答对时庆祝的猫头鹰",
  error: "答错时摇头的猫头鹰",
  speaking: "正在讲解的猫头鹰"
};

const mascotClass = computed(() => `owl-mascot owl-mascot--${props.status}`);
const statusLabel = computed(() => statusLabelMap[props.status] ?? statusLabelMap.idle);
</script>

<template>
  <div :class="mascotClass" :aria-label="statusLabel" role="img">
    <div class="owl-mascot__stage">
      <div class="owl-mascot__backdrop"></div>
      <div class="owl-mascot__mist owl-mascot__mist--left" aria-hidden="true"></div>
      <div class="owl-mascot__mist owl-mascot__mist--right" aria-hidden="true"></div>
      <div class="owl-mascot__halo"></div>
      <div class="owl-mascot__cloud owl-mascot__cloud--left" aria-hidden="true"></div>
      <div class="owl-mascot__cloud owl-mascot__cloud--right" aria-hidden="true"></div>

      <div v-if="status === 'success'" class="owl-mascot__celebration" aria-hidden="true">
        <span class="owl-mascot__spark owl-mascot__spark--1">✨</span>
        <span class="owl-mascot__spark owl-mascot__spark--2">⭐</span>
        <span class="owl-mascot__spark owl-mascot__spark--3">✨</span>
        <span class="owl-mascot__spark owl-mascot__spark--4">⭐</span>
      </div>

      <div v-if="status === 'speaking'" class="owl-mascot__voice" aria-hidden="true">
        <span class="owl-mascot__voice-wave owl-mascot__voice-wave--1"></span>
        <span class="owl-mascot__voice-wave owl-mascot__voice-wave--2"></span>
        <span class="owl-mascot__voice-wave owl-mascot__voice-wave--3"></span>
      </div>

      <div class="owl-mascot__figure">
        <div class="owl-mascot__shadow" aria-hidden="true"></div>
        <div class="owl-mascot__asset" aria-hidden="true">🦉</div>
      </div>

      <div class="owl-mascot__perch" aria-hidden="true">
        <span class="owl-mascot__leaf owl-mascot__leaf--1"></span>
        <span class="owl-mascot__leaf owl-mascot__leaf--2"></span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.owl-mascot {
  position: relative;
  width: min(100%, 260px);
}

.owl-mascot__stage {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 248px;
  padding: 12px 0 22px;
}

.owl-mascot__backdrop,
.owl-mascot__mist,
.owl-mascot__halo,
.owl-mascot__cloud {
  position: absolute;
}

.owl-mascot__backdrop {
  inset: 24px 18px 42px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  border-radius: 34px;
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0) 48%),
    linear-gradient(180deg, rgba(248, 252, 255, 0.94) 0%, rgba(242, 248, 252, 0.76) 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.58);
}

.owl-mascot__mist {
  bottom: 62px;
  width: 98px;
  height: 44px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(173, 235, 255, 0.2) 0%, rgba(173, 235, 255, 0) 72%);
  opacity: 0.72;
}

.owl-mascot__mist--left {
  left: 8px;
}

.owl-mascot__mist--right {
  right: 4px;
  bottom: 74px;
  width: 82px;
  height: 38px;
}

.owl-mascot__halo {
  width: 212px;
  height: 176px;
  border-radius: 50% 50% 46% 54%;
  background:
    radial-gradient(circle, rgba(255, 255, 255, 0.96) 0%, rgba(255, 255, 255, 0) 62%),
    linear-gradient(180deg, rgba(184, 242, 223, 0.95) 0%, rgba(255, 241, 184, 0.92) 52%, rgba(255, 195, 218, 0.88) 100%);
  opacity: 0.84;
}

.owl-mascot__cloud {
  bottom: 48px;
  width: 68px;
  height: 28px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  filter: blur(0.4px);
}

.owl-mascot__cloud::before,
.owl-mascot__cloud::after {
  content: "";
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.72);
}

.owl-mascot__cloud::before {
  left: 8px;
  bottom: 8px;
  width: 26px;
  height: 26px;
}

.owl-mascot__cloud::after {
  right: 10px;
  bottom: 10px;
  width: 22px;
  height: 22px;
}

.owl-mascot__cloud--left {
  left: 24px;
}

.owl-mascot__cloud--right {
  right: 22px;
  bottom: 58px;
  transform: scale(0.86);
}

.owl-mascot__figure {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 146px;
  min-height: 134px;
  transform: translateY(-18px);
}

.owl-mascot__figure::before {
  content: "";
  position: absolute;
  inset: 10px 18px 12px;
  border-radius: 48% 52% 46% 54%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.74) 0%, rgba(255, 255, 255, 0.18) 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.owl-mascot__shadow {
  position: absolute;
  bottom: 6px;
  width: 84px;
  height: 18px;
  border-radius: 999px;
  background: rgba(36, 50, 74, 0.12);
  filter: blur(4px);
}

.owl-mascot__asset {
  position: relative;
  display: grid;
  place-items: center;
  font-size: 4.8rem;
  line-height: 1;
  text-shadow:
    0 10px 18px rgba(36, 50, 74, 0.18),
    0 0 0 rgba(255, 255, 255, 0.95);
}

.owl-mascot__perch {
  position: absolute;
  bottom: 42px;
  width: 138px;
  height: 16px;
  border-radius: 999px;
  background: linear-gradient(90deg, #a46a34 0%, #c98c4f 42%, #8d5a2d 100%);
  box-shadow: 0 8px 16px -14px rgba(36, 50, 74, 0.5);
}

.owl-mascot__perch::before,
.owl-mascot__perch::after {
  content: "";
  position: absolute;
  top: 4px;
  width: 28px;
  height: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
}

.owl-mascot__perch::before {
  left: 22px;
}

.owl-mascot__perch::after {
  right: 16px;
}

.owl-mascot__leaf {
  position: absolute;
  width: 22px;
  height: 12px;
  border-radius: 88% 12% 82% 18%;
  background: linear-gradient(135deg, #7cd8b8 0%, #b8f2df 100%);
}

.owl-mascot__leaf--1 {
  top: -12px;
  left: 18px;
  transform: rotate(-34deg);
}

.owl-mascot__leaf--2 {
  top: -9px;
  right: 26px;
  transform: rotate(22deg);
}

.owl-mascot__celebration {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}

.owl-mascot__voice {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}

.owl-mascot__voice-wave {
  position: absolute;
  top: 92px;
  left: calc(50% + 28px);
  width: 18px;
  height: 18px;
  border: 2px solid rgba(141, 189, 255, 0.62);
  border-left-color: transparent;
  border-bottom-color: transparent;
  border-radius: 50%;
  transform: rotate(40deg);
  opacity: 0;
  animation: voice-wave 1.2s ease-out infinite;
}

.owl-mascot__voice-wave--2 {
  width: 28px;
  height: 28px;
  top: 87px;
  left: calc(50% + 24px);
  animation-delay: 180ms;
}

.owl-mascot__voice-wave--3 {
  width: 38px;
  height: 38px;
  top: 82px;
  left: calc(50% + 20px);
  animation-delay: 360ms;
}

.owl-mascot__spark {
  position: absolute;
  font-size: 1.45rem;
  line-height: 1;
  animation: sparkle 900ms ease-in-out infinite alternate;
}

.owl-mascot__spark--1 {
  top: 18px;
  left: 28px;
}

.owl-mascot__spark--2 {
  top: 34px;
  right: 22px;
  animation-delay: 180ms;
}

.owl-mascot__spark--3 {
  bottom: 42px;
  left: 18px;
  animation-delay: 120ms;
}

.owl-mascot__spark--4 {
  right: 30px;
  bottom: 28px;
  animation-delay: 260ms;
}

.owl-mascot--idle .owl-mascot__figure {
  animation: owl-float 2.6s ease-in-out infinite;
}

.owl-mascot--idle .owl-mascot__backdrop {
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0) 48%),
    linear-gradient(180deg, rgba(248, 252, 255, 0.94) 0%, rgba(248, 244, 225, 0.72) 100%);
}

.owl-mascot--success .owl-mascot__figure {
  animation: owl-cheer 900ms ease-in-out infinite alternate;
}

.owl-mascot--success .owl-mascot__halo {
  animation: halo-pulse 900ms ease-in-out infinite alternate;
}

.owl-mascot--success .owl-mascot__backdrop {
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.96) 0%, rgba(255, 255, 255, 0) 46%),
    linear-gradient(180deg, rgba(243, 253, 248, 0.96) 0%, rgba(255, 248, 225, 0.78) 100%);
}

.owl-mascot--success .owl-mascot__perch {
  box-shadow: 0 10px 18px -14px rgba(36, 50, 74, 0.42);
}

.owl-mascot--speaking .owl-mascot__figure {
  animation: owl-talk 1.15s ease-in-out infinite;
}

.owl-mascot--speaking .owl-mascot__halo {
  animation: halo-pulse 720ms ease-in-out infinite alternate;
}

.owl-mascot--speaking .owl-mascot__backdrop {
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.96) 0%, rgba(255, 255, 255, 0) 48%),
    linear-gradient(180deg, rgba(244, 249, 255, 0.96) 0%, rgba(234, 243, 255, 0.82) 100%);
}

.owl-mascot--error .owl-mascot__figure {
  animation: owl-shake 520ms ease-in-out infinite;
}

.owl-mascot--error .owl-mascot__backdrop {
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.94) 0%, rgba(255, 255, 255, 0) 48%),
    linear-gradient(180deg, rgba(252, 246, 249, 0.96) 0%, rgba(248, 241, 245, 0.8) 100%);
}

.owl-mascot--error .owl-mascot__halo {
  background:
    radial-gradient(circle, rgba(255, 255, 255, 0.96) 0%, rgba(255, 255, 255, 0) 62%),
    linear-gradient(180deg, rgba(255, 224, 236, 0.88) 0%, rgba(255, 244, 208, 0.86) 58%, rgba(248, 226, 236, 0.82) 100%);
}

@keyframes owl-float {
  0%,
  100% {
    transform: translateY(-18px);
  }

  50% {
    transform: translateY(-28px);
  }
}

@keyframes owl-shake {
  0%,
  100% {
    transform: translateY(-18px) translateX(0) rotate(0deg);
  }

  20% {
    transform: translateY(-18px) translateX(-6px) rotate(-4deg);
  }

  40% {
    transform: translateY(-18px) translateX(5px) rotate(4deg);
  }

  60% {
    transform: translateY(-18px) translateX(-4px) rotate(-3deg);
  }

  80% {
    transform: translateY(-18px) translateX(3px) rotate(3deg);
  }
}

@keyframes owl-cheer {
  from {
    transform: translateY(-18px) rotate(-3deg) scale(1);
  }

  to {
    transform: translateY(-26px) rotate(4deg) scale(1.08);
  }
}

@keyframes sparkle {
  from {
    opacity: 0.45;
    transform: scale(0.85) rotate(-8deg);
  }

  to {
    opacity: 1;
    transform: scale(1.18) rotate(8deg);
  }
}

@keyframes halo-pulse {
  from {
    transform: scale(0.96);
    opacity: 0.78;
  }

  to {
    transform: scale(1.06);
    opacity: 1;
  }
}

@keyframes owl-talk {
  0%,
  100% {
    transform: translateY(-18px) rotate(-1deg) scale(1);
  }

  35% {
    transform: translateY(-24px) rotate(2deg) scale(1.03);
  }

  70% {
    transform: translateY(-20px) rotate(-2deg) scale(0.99);
  }
}

@keyframes voice-wave {
  0% {
    opacity: 0;
    transform: rotate(40deg) scale(0.72);
  }

  25% {
    opacity: 0.82;
  }

  100% {
    opacity: 0;
    transform: rotate(40deg) scale(1.08);
  }
}

@media (prefers-reduced-motion: reduce) {
  .owl-mascot__figure,
  .owl-mascot__halo,
  .owl-mascot__spark,
  .owl-mascot__voice-wave {
    animation: none !important;
  }
}
</style>
