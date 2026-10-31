<script setup lang="ts">
import { maintenanceCountdown } from '../../utils/maintenanceCountdown'

const props = defineProps<{ message: string; endsAt?: string | Date | null }>()
const { user, isOwner } = useNanoAuth()
const now = ref<number | null>(null)
const countdown = computed(() =>
  props.endsAt && now.value !== null ? maintenanceCountdown(props.endsAt, now.value) : null,
)
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  now.value = Date.now()
  timer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
const pad = (value: number) => String(value).padStart(2, '0')
</script>

<template>
  <div class="maintenance-screen">
    <div class="maintenance-shell">
      <div class="brand">
        <span class="brand-mark">n<span>f</span></span> nanofeed
      </div>
      <main class="maintenance-card">
        <div class="illustration" aria-hidden="true">
          <span class="orbit orbit-one" /><span class="orbit orbit-two" />
          <svg width="68" height="68" viewBox="0 0 64 64" fill="none">
            <path
              d="M20 44 43 21M38 13a10 10 0 0 0 12 13L29 47a7 7 0 1 1-10-10l21-21a10 10 0 0 0-2-3Z"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <circle cx="23" cy="42" r="2" fill="currentColor" />
          </svg>
        </div>
        <div class="eyebrow"><span /> Scheduled maintenance</div>
        <h1>We’ll be back soon.</h1>
        <p class="message">{{ message }}</p>
        <div v-if="countdown && !countdown.expired" class="countdown-area">
          <p class="caption">Estimated time remaining</p>
          <div class="countdown" aria-label="Estimated time remaining">
            <div>
              <strong>{{ pad(countdown.days) }}</strong
              ><span>days</span>
            </div>
            <b>:</b>
            <div>
              <strong>{{ pad(countdown.hours) }}</strong
              ><span>hours</span>
            </div>
            <b>:</b>
            <div>
              <strong>{{ pad(countdown.minutes) }}</strong
              ><span>minutes</span>
            </div>
            <b>:</b>
            <div>
              <strong>{{ pad(countdown.seconds) }}</strong
              ><span>seconds</span>
            </div>
          </div>
        </div>
        <p v-else-if="countdown?.expired" class="estimate">
          The estimated time has passed. We’re still working on it.
        </p>
        <p v-else-if="!endsAt" class="estimate">We’ll share an update as soon as we can.</p>
        <nav class="actions" aria-label="Available pages">
          <NuxtLink
            v-if="user"
            class="primary"
            :to="`/profile/${encodeURIComponent(user.username)}`"
            >View my profile <span aria-hidden="true">→</span></NuxtLink
          >
          <NuxtLink v-else class="primary" to="/auth/login"
            >Sign in <span aria-hidden="true">→</span></NuxtLink
          >
          <NuxtLink v-if="isOwner" class="secondary" to="/dashboard">Owner dashboard</NuxtLink>
        </nav>
        <p class="note">Thanks for your patience while we make things better.</p>
      </main>
      <footer>Made for the developer circle <span>✦</span></footer>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.maintenance-screen {
  min-height: 100dvh;
  width: 100%;
  color: #eef4fb;
  background: radial-gradient(ellipse at 50% 20%, #102a40 0, #09131f 38%, #070b10 76%);
}
.maintenance-shell {
  max-width: 1080px;
  min-height: 100dvh;
  margin: auto;
  padding: 28px clamp(20px, 5vw, 56px);
  display: flex;
  flex-direction: column;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 750;
  letter-spacing: -0.03em;
}
.brand-mark {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  background: #1d9bf0;
  color: white;
  border-radius: 10px;
  font-weight: 800;
}
.brand-mark span {
  display: none;
}
.maintenance-card {
  text-align: center;
  width: 100%;
  max-width: 600px;
  margin: auto;
  padding: 38px 0 48px;
}
.illustration {
  position: relative;
  width: 126px;
  height: 126px;
  display: grid;
  place-items: center;
  margin: 0 auto 27px;
  color: #6dc6ff;
  border: 1px solid #205278;
  border-radius: 36px;
  background: linear-gradient(145deg, #143b58, #0c1e2d);
  box-shadow:
    0 20px 80px #1282cc33,
    inset 0 1px #ffffff18;
  transform: rotate(-5deg);
}
.illustration svg {
  transform: rotate(5deg);
}
.orbit {
  position: absolute;
  border-radius: 50%;
  background: #65c8ff;
  box-shadow: 0 0 18px #65c8ff;
}
.orbit-one {
  width: 7px;
  height: 7px;
  top: -16px;
  right: -18px;
}
.orbit-two {
  width: 5px;
  height: 5px;
  bottom: 2px;
  left: -27px;
}
.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 11px;
  color: #8fd3ff;
  background: #12334c;
  border: 1px solid #1a5275;
  border-radius: 99px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}
.eyebrow span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #56c0ff;
}
h1 {
  margin: 22px 0 14px;
  font-size: clamp(32px, 6vw, 48px);
  letter-spacing: -0.045em;
  line-height: 1.1;
}
.message {
  color: #aebed0;
  font-size: 16px;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.countdown-area {
  margin: 30px auto;
}
.caption {
  color: #8295a9;
  font-size: 12px;
  margin-bottom: 12px;
}
.countdown {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 8px;
}
.countdown div {
  min-width: 66px;
  padding: 12px 10px 10px;
  border: 1px solid #263d51;
  border-radius: 12px;
  background: #111e2b;
  display: grid;
  gap: 5px;
}
.countdown strong {
  font-size: 24px;
  font-variant-numeric: tabular-nums;
}
.countdown span {
  color: #94a8b9;
  font-size: 11px;
}
.countdown b {
  color: #4d708b;
  padding-top: 15px;
}
.estimate {
  margin: 28px auto;
  color: #aebed0;
  font-size: 14px;
}
.actions {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin: 30px 0 22px;
}
.actions a {
  padding: 12px 18px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
}
.primary {
  background: #1d9bf0;
  color: white;
}
.primary span {
  margin-left: 12px;
}
.secondary {
  color: #c7d6e6;
  border: 1px solid #33495d;
}
.actions a:focus-visible {
  outline: 2px solid white;
  outline-offset: 3px;
}
.note,
footer {
  color: #8191a1;
  font-size: 12px;
}
footer {
  text-align: center;
  padding-top: 20px;
}
footer span {
  color: #62bded;
}
@media (max-width: 400px) {
  .countdown {
    gap: 5px;
  }
  .countdown div {
    min-width: 58px;
    padding: 10px 7px;
  }
  .countdown strong {
    font-size: 21px;
  }
}
</style>
