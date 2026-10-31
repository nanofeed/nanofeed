<!--
  app/components/settings/AccountDangerZone.vue
  NanoFeed — Account Danger Zone
  
  Facebook / X (Twitter) style account lifecycle management:
  - Deactivation: hides account, instant sign-out, re-login = reactivate
  - Deletion: 30-day grace period, instant sign-out, re-login = cancel
-->
<script setup lang="ts">
const {
  isDeactivating,
  isRequestingDeletion,
  isCancellingDeletion,
  lifecycleError,
  isDeletionPending,
  daysUntilDeletion,
  deletionScheduledFor,
  deactivate,
  requestDeletion,
  cancelDeletion,
} = useAccountLifecycle()

// ── Deactivation Modal ──────────────────────────────────────────
const showDeactivateModal = ref(false)
const deactivateInput = ref('')
const deactivateConfirmEnabled = computed(
  () => deactivateInput.value.toLowerCase() === 'deactivate',
)

const openDeactivateModal = () => {
  deactivateInput.value = ''
  showDeactivateModal.value = true
}

const confirmDeactivate = async () => {
  if (!deactivateConfirmEnabled.value) return
  await deactivate()
  showDeactivateModal.value = false
}

// ── Deletion Modal ──────────────────────────────────────────────
const showDeleteModal = ref(false)
const deleteInput = ref('')
const deleteTimerSeconds = ref(5)
const deleteTimerDone = ref(false)
let deleteTimerInterval: ReturnType<typeof setInterval> | null = null

const deleteConfirmEnabled = computed(
  () => deleteTimerDone.value && deleteInput.value.toLowerCase() === 'delete my account',
)

const openDeleteModal = () => {
  deleteInput.value = ''
  deleteTimerSeconds.value = 5
  deleteTimerDone.value = false
  showDeleteModal.value = true

  if (deleteTimerInterval) clearInterval(deleteTimerInterval)
  deleteTimerInterval = setInterval(() => {
    deleteTimerSeconds.value--
    if (deleteTimerSeconds.value <= 0) {
      deleteTimerDone.value = true
      if (deleteTimerInterval) clearInterval(deleteTimerInterval)
    }
  }, 1000)
}

const confirmDelete = async () => {
  if (!deleteConfirmEnabled.value) return
  await requestDeletion()
  showDeleteModal.value = false
}

onUnmounted(() => {
  if (deleteTimerInterval) clearInterval(deleteTimerInterval)
})

// ── Formatted deletion date ─────────────────────────────────────
const formattedDeletionDate = computed(() => {
  if (!deletionScheduledFor.value) return ''
  return deletionScheduledFor.value.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
})
</script>

<template>
  <div class="danger-zone">
    <!-- Error Banner -->
    <div v-if="lifecycleError" class="lifecycle-error" role="alert">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {{ lifecycleError }}
    </div>

    <!-- ── Section A: Deactivation ── -->
    <div class="dz-section">
      <div class="dz-header">
        <div class="dz-icon deactivate-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
            <line x1="12" y1="2" x2="12" y2="12" />
          </svg>
        </div>
        <div>
          <h3 class="dz-title">Deactivate Account</h3>
          <p class="dz-desc">
            Hides your profile and all your posts from everyone on the platform. You will be signed
            out immediately.
            <strong>To come back, simply log in again</strong> — your account will be restored
            automatically.
          </p>
        </div>
      </div>
      <button
        id="settings-deactivate-btn"
        class="dz-btn dz-btn--outline"
        :disabled="isDeactivating"
        @click="openDeactivateModal"
      >
        <span v-if="isDeactivating">Deactivating…</span>
        <span v-else>Deactivate Account</span>
      </button>
    </div>

    <div class="dz-divider" />

    <!-- ── Section B: Deletion ── -->
    <div class="dz-section">
      <div class="dz-header">
        <div class="dz-icon delete-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
          </svg>
        </div>
        <div>
          <h3 class="dz-title">Delete Account</h3>
          <p class="dz-desc">
            Permanently deletes your account and all your data after a
            <strong>30-day grace period</strong>. You will be signed out immediately.
            <strong>Changed your mind? Just log in within 30 days</strong> — the deletion will be
            cancelled automatically with no extra steps.
          </p>
        </div>
      </div>

      <!-- Pending deletion warning banner -->
      <div v-if="isDeletionPending" class="deletion-pending-banner" role="alert">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <div class="banner-content">
          <strong>Your account is scheduled for permanent deletion.</strong>
          <span v-if="daysUntilDeletion !== null && daysUntilDeletion > 0">
            It will be deleted in
            <strong>{{ daysUntilDeletion }} day{{ daysUntilDeletion !== 1 ? 's' : '' }}</strong> (on
            {{ formattedDeletionDate }}).
          </span>
          <span v-else>Deletion is imminent.</span>
          <br />
          <span class="banner-hint"
            >Log in again at any time to cancel, or use the button below.</span
          >
        </div>
        <button
          id="settings-cancel-deletion-btn"
          class="cancel-deletion-btn"
          :disabled="isCancellingDeletion"
          @click="cancelDeletion"
        >
          <span v-if="isCancellingDeletion">Cancelling…</span>
          <span v-else>Cancel Deletion</span>
        </button>
      </div>

      <!-- Delete button (only show if no pending deletion) -->
      <button
        v-else
        id="settings-delete-btn"
        class="dz-btn dz-btn--danger"
        :disabled="isRequestingDeletion"
        @click="openDeleteModal"
      >
        <span v-if="isRequestingDeletion">Scheduling deletion…</span>
        <span v-else>Delete My Account</span>
      </button>
    </div>

    <!-- ── Deactivation Confirmation Modal ── -->
    <Teleport to="body">
      <div
        v-if="showDeactivateModal"
        class="modal-overlay"
        @click.self="showDeactivateModal = false"
      >
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="deactivate-modal-title">
          <div class="modal-header">
            <div class="modal-icon deactivate-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                <line x1="12" y1="2" x2="12" y2="12" />
              </svg>
            </div>
            <h2 id="deactivate-modal-title" class="modal-title">Deactivate Account?</h2>
          </div>

          <div class="modal-body">
            <p>
              Your account and all your posts will be hidden from the platform. You will be signed
              out immediately.
            </p>
            <p class="modal-note">
              🔵 <strong>To come back, just log in again.</strong> Your account will be fully
              restored automatically — no forms, no waiting.
            </p>
            <div class="modal-confirm-input">
              <label for="deactivate-confirm-input">
                Type <code>deactivate</code> to confirm:
              </label>
              <input
                id="deactivate-confirm-input"
                v-model="deactivateInput"
                type="text"
                placeholder="deactivate"
                autocomplete="off"
                spellcheck="false"
              />
            </div>
          </div>

          <div class="modal-actions">
            <button class="modal-btn modal-btn--ghost" @click="showDeactivateModal = false">
              Cancel
            </button>
            <button
              id="deactivate-confirm-btn"
              class="modal-btn modal-btn--warning"
              :disabled="!deactivateConfirmEnabled || isDeactivating"
              @click="confirmDeactivate"
            >
              <span v-if="isDeactivating">Deactivating…</span>
              <span v-else>Yes, Deactivate</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Deletion Confirmation Modal ── -->
    <Teleport to="body">
      <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
          <div class="modal-header">
            <div class="modal-icon delete-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
                <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
              </svg>
            </div>
            <h2 id="delete-modal-title" class="modal-title">Delete Account?</h2>
          </div>

          <div class="modal-body">
            <p>
              Your account will be <strong>permanently deleted after 30 days</strong>. You will be
              signed out immediately.
            </p>
            <p class="modal-note">
              🟡 <strong>Changed your mind?</strong> Log in within 30 days and the deletion will be
              automatically cancelled — no extra steps needed.
            </p>

            <!-- 5-second safety timer -->
            <div v-if="!deleteTimerDone" class="delete-timer" role="status">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Please wait <strong>{{ deleteTimerSeconds }}s</strong> before confirming…
            </div>

            <div class="modal-confirm-input">
              <label for="delete-confirm-input">
                Type <code>delete my account</code> to confirm:
              </label>
              <input
                id="delete-confirm-input"
                v-model="deleteInput"
                type="text"
                placeholder="delete my account"
                autocomplete="off"
                spellcheck="false"
                :disabled="!deleteTimerDone"
              />
            </div>
          </div>

          <div class="modal-actions">
            <button class="modal-btn modal-btn--ghost" @click="showDeleteModal = false">
              Keep My Account
            </button>
            <button
              id="delete-confirm-btn"
              class="modal-btn modal-btn--danger"
              :disabled="!deleteConfirmEnabled || isRequestingDeletion"
              @click="confirmDelete"
            >
              <span v-if="isRequestingDeletion">Scheduling deletion…</span>
              <span v-else>Delete My Account</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
.danger-zone {
  display: flex;
  flex-direction: column;
  gap: $space-6;
  padding: $space-4;
}

.lifecycle-error {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding: $space-3 $space-4;
  background: rgba($color-danger, 0.1);
  border: 1px solid rgba($color-danger, 0.25);
  border-radius: $radius-md;
  color: $color-danger;
  font-size: $font-size-sm;
}

// ── Section layout ──────────────────────────────────────────────
.dz-section {
  display: flex;
  flex-direction: column;
  gap: $space-4;
}

.dz-header {
  display: flex;
  align-items: flex-start;
  gap: $space-4;
}

.dz-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: $radius-md;
  @include flex-center;

  &.deactivate-icon {
    background: rgba($color-warning, 0.12);
    color: $color-warning;
  }

  &.delete-icon {
    background: rgba($color-danger, 0.12);
    color: $color-danger;
  }
}

.dz-title {
  margin: 0 0 $space-1;
  font-size: $font-size-lg;
  font-weight: $font-weight-semibold;
  color: $color-text;
}

.dz-desc {
  margin: 0;
  font-size: $font-size-sm;
  color: $color-text-muted;
  line-height: 1.6;
}

.dz-divider {
  height: 1px;
  background: $color-border-soft;
}

// ── Buttons ─────────────────────────────────────────────────────
.dz-btn {
  align-self: flex-start;
  padding: $space-2 $space-5;
  border-radius: $radius-md;
  font-size: $font-size-sm;
  font-weight: $font-weight-semibold;
  cursor: pointer;
  @include hover-transition(all);

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &--outline {
    background: transparent;
    border: 1.5px solid $color-warning;
    color: $color-warning;

    &:hover:not(:disabled) {
      background: rgba($color-warning, 0.08);
    }
  }

  &--danger {
    background: $color-danger;
    border: 1.5px solid $color-danger;
    color: #fff;

    &:hover:not(:disabled) {
      opacity: 0.88;
    }
  }
}

// ── Deletion pending banner ──────────────────────────────────────
.deletion-pending-banner {
  display: flex;
  align-items: flex-start;
  gap: $space-3;
  padding: $space-4;
  background: rgba($color-warning, 0.08);
  border: 1.5px solid rgba($color-warning, 0.35);
  border-radius: $radius-md;
  color: $color-warning;

  svg {
    flex-shrink: 0;
    margin-top: 2px;
  }

  .banner-content {
    flex: 1;
    font-size: $font-size-sm;
    line-height: 1.6;
  }

  .banner-hint {
    opacity: 0.8;
    font-style: italic;
  }
}

.cancel-deletion-btn {
  flex-shrink: 0;
  padding: $space-2 $space-4;
  background: rgba($color-warning, 0.15);
  border: 1.5px solid $color-warning;
  border-radius: $radius-md;
  color: $color-warning;
  font-size: $font-size-sm;
  font-weight: $font-weight-semibold;
  cursor: pointer;
  white-space: nowrap;
  @include hover-transition(background-color);

  &:hover:not(:disabled) {
    background: rgba($color-warning, 0.25);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

// ── Modals ───────────────────────────────────────────────────────
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  z-index: 1000;
  @include flex-center;
  padding: $space-4;
  animation: fadeIn 0.15s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal {
  background: $color-surface;
  border: 1px solid $color-border-soft;
  border-radius: $radius-lg;
  width: 100%;
  max-width: 440px;
  padding: $space-6;
  display: flex;
  flex-direction: column;
  gap: $space-5;
  animation: slideUp 0.2s ease;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
}

@keyframes slideUp {
  from {
    transform: translateY(12px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  display: flex;
  align-items: center;
  gap: $space-4;
}

.modal-icon {
  width: 48px;
  height: 48px;
  border-radius: $radius-md;
  flex-shrink: 0;
  @include flex-center;

  &.deactivate-icon {
    background: rgba($color-warning, 0.12);
    color: $color-warning;
  }

  &.delete-icon {
    background: rgba($color-danger, 0.12);
    color: $color-danger;
  }
}

.modal-title {
  margin: 0;
  font-size: $font-size-xl;
  font-weight: $font-weight-bold;
  color: $color-text;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: $space-3;
  font-size: $font-size-sm;
  color: $color-text-muted;
  line-height: 1.6;

  p {
    margin: 0;
  }
}

.modal-note {
  padding: $space-3;
  background: $color-surface-2;
  border-radius: $radius-md;
  border: 1px solid $color-border-soft;
  color: $color-text;
  font-size: $font-size-xs;
}

.delete-timer {
  display: flex;
  align-items: center;
  gap: $space-2;
  color: $color-warning;
  font-size: $font-size-xs;
  font-weight: $font-weight-medium;
}

.modal-confirm-input {
  display: flex;
  flex-direction: column;
  gap: $space-2;

  label {
    font-size: $font-size-xs;
    color: $color-text-muted;

    code {
      background: $color-surface-2;
      padding: 1px 5px;
      border-radius: 4px;
      font-family: $font-mono;
      color: $color-text;
    }
  }

  input {
    width: 100%;
    padding: $space-2 $space-3;
    background: $color-surface-2;
    border: 1.5px solid $color-border-soft;
    border-radius: $radius-md;
    color: $color-text;
    font-size: $font-size-sm;
    font-family: $font-mono;
    outline: none;
    @include hover-transition(border-color);

    &:focus {
      border-color: $color-accent;
    }

    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
  }
}

.modal-actions {
  display: flex;
  gap: $space-3;
  justify-content: flex-end;
}

.modal-btn {
  padding: $space-2 $space-5;
  border-radius: $radius-md;
  font-size: $font-size-sm;
  font-weight: $font-weight-semibold;
  cursor: pointer;
  @include hover-transition(all);

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  &--ghost {
    background: transparent;
    border: 1.5px solid $color-border-soft;
    color: $color-text-muted;

    &:hover:not(:disabled) {
      background: $color-surface-2;
    }
  }

  &--warning {
    background: $color-warning;
    border: 1.5px solid $color-warning;
    color: #000;

    &:hover:not(:disabled) {
      opacity: 0.88;
    }
  }

  &--danger {
    background: $color-danger;
    border: 1.5px solid $color-danger;
    color: #fff;

    &:hover:not(:disabled) {
      opacity: 0.88;
    }
  }
}
</style>
