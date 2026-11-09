<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useToast } from '../composables/useToast'
import { useProfileAvatar } from '../composables/useProfileAvatar'
import {
  deleteProfileImage,
  uploadProfileImage,
  validateProfileImage,
} from '../services/profileService'
import { profileSchema } from '../validation/profileSchema'
import { getDisplayName, getInitials } from '../utils/profile'
import { LockKeyhole, User } from '@lucide/vue'
import BaseButton from '../components/base/BaseButton.vue'
import BaseFormSection from '../components/base/BaseFormSection.vue'
import BaseTextInput from '../components/base/BaseTextInput.vue'
import Alert from '../components/Alert.vue'

const router = useRouter()
const { user, profile, isDemo, updateProfile, reloadProfile } = useAuth()
const { success, warning, error: showError } = useToast()
const values = reactive({ displayName: '', phoneNumber: '' })
const errors = reactive({ displayName: '', phoneNumber: '', image: '' })
const saving = ref(false)
const reloading = ref(false)
const selectedFile = ref(null)
const previewUrl = ref(null)
const removeImage = ref(false)
const baseline = ref(null)
const fileInput = ref(null)
const avatarPath = computed(() => profile.value?.avatar_path)
const { url: avatarUrl } = useProfileAvatar(avatarPath)
const initials = computed(() =>
  getInitials(values.displayName || getDisplayName(profile.value, user.value)),
)
const displayedAvatar = computed(() => previewUrl.value || (!removeImage.value && avatarUrl.value))

function clearSelection() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = null
  selectedFile.value = null
  if (fileInput.value) fileInput.value.value = ''
}

function resetForm() {
  clearSelection()
  removeImage.value = false
  errors.displayName = ''
  errors.phoneNumber = ''
  errors.image = ''
  values.displayName = profile.value?.display_name || ''
  values.phoneNumber = profile.value?.phone_number || ''
  baseline.value = profile.value
    ? {
        id: profile.value.id,
        updatedAt: profile.value.updated_at ?? null,
        avatarPath: profile.value.avatar_path,
      }
    : null
}

watch(() => [user.value?.id, profile.value?.id], resetForm, { immediate: true })
onBeforeUnmount(clearSelection)

function selectImage(event) {
  const file = event.target.files?.[0]
  if (!file) return
  try {
    validateProfileImage(file)
    clearSelection()
    selectedFile.value = file
    previewUrl.value = URL.createObjectURL(file)
    removeImage.value = false
    errors.image = ''
  } catch (error) {
    clearSelection()
    errors.image = error.message
  }
}

function removeAvatar() {
  clearSelection()
  removeImage.value = true
  errors.image = ''
}

async function reload() {
  reloading.value = true
  try {
    await reloadProfile()
    resetForm()
  } catch (error) {
    showError(error.message || 'Unable to reload your profile.')
  } finally {
    reloading.value = false
  }
}

async function save() {
  if (saving.value || !baseline.value || !user.value?.id) return
  if (errors.image) {
    showError('Choose a valid profile picture before saving.')
    return
  }
  if (baseline.value.id !== user.value.id) {
    showError('Your account changed. Reload your profile before saving.')
    return
  }
  errors.displayName = ''
  errors.phoneNumber = ''
  const parsed = profileSchema.safeParse(values)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      if (issue.path[0] in errors && !errors[issue.path[0]]) errors[issue.path[0]] = issue.message
    }
    return
  }

  saving.value = true
  const snapshot = { ...baseline.value }
  const userId = user.value.id
  let uploadedPath = null
  try {
    if (selectedFile.value) uploadedPath = await uploadProfileImage(userId, selectedFile.value)
    if (user.value?.id !== userId) throw new Error('Your account changed while saving.')
    const nextPath = uploadedPath || (removeImage.value ? null : snapshot.avatarPath)
    await updateProfile({ ...parsed.data, avatarPath: nextPath }, snapshot.updatedAt)
    resetForm()
    success('Profile updated successfully.')
    if (snapshot.avatarPath && snapshot.avatarPath !== nextPath) {
      try {
        await deleteProfileImage(snapshot.avatarPath)
      } catch (error) {
        console.error('Unable to remove previous profile picture:', error)
        warning('Profile saved, but the previous picture could not be removed from storage.')
      }
    }
  } catch (error) {
    console.error('Unable to update profile:', error)
    showError(error.message || 'Unable to save your profile.')
    if (uploadedPath || selectedFile.value) {
      warning('The uploaded image may remain in storage. Reload your profile before retrying.')
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="profile-page">
    <Alert v-if="!profile" type="danger" message="Your profile is unavailable. Try reloading it." />
    <form v-else @submit.prevent="save">
      <BaseFormSection title="Personal Information">
        <template #icon><User aria-hidden="true" /></template>
        <template #content>
          <div class="form-group">
            <label for="profile-image">Profile picture</label>
            <div class="image-upload-content profile-picture">
              <div class="profile-picture__preview" aria-hidden="true">
                <img v-if="displayedAvatar" :src="displayedAvatar" alt="" />
                <span v-else>{{ initials }}</span>
              </div>
              <div class="profile-picture__controls">
                <input
                  id="profile-image"
                  ref="fileInput"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  :disabled="saving || isDemo"
                  :aria-describedby="errors.image ? 'profile-image-error' : 'profile-image-hint'"
                  @change="selectImage"
                />
                <p id="profile-image-hint" class="image-upload-hint">
                  JPEG, PNG or WebP, up to 2 MB.
                  <template v-if="isDemo">
                    Picture uploads are unavailable in demo accounts.
                  </template>
                </p>
                <p v-if="errors.image" id="profile-image-error" class="invalid" role="alert">
                  {{ errors.image }}
                </p>
                <BaseButton
                  v-if="selectedFile || (avatarPath && !removeImage)"
                  label="Remove picture"
                  variant="secondary"
                  :disabled="saving"
                  @click="removeAvatar"
                />
              </div>
            </div>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <BaseTextInput
                id="profile-name"
                v-model="values.displayName"
                label="Display name"
                name="displayName"
                autocomplete="name"
                placeholder="Enter your display name"
                :class="{ 'is-invalid': errors.displayName }"
                :disabled="saving"
                :aria-invalid="!!errors.displayName"
                :aria-describedby="errors.displayName ? 'profile-name-error' : undefined"
              />
              <p v-if="errors.displayName" id="profile-name-error" class="invalid" role="alert">
                {{ errors.displayName }}
              </p>
            </div>
            <div class="form-group">
              <BaseTextInput
                id="profile-phone"
                v-model="values.phoneNumber"
                label="Phone number"
                name="phoneNumber"
                type="tel"
                autocomplete="tel"
                placeholder="Enter your phone number"
                :class="{ 'is-invalid': errors.phoneNumber }"
                :required="false"
                :disabled="saving"
                :aria-invalid="!!errors.phoneNumber"
                :aria-describedby="errors.phoneNumber ? 'profile-phone-error' : undefined"
              />
              <p v-if="errors.phoneNumber" id="profile-phone-error" class="invalid" role="alert">
                {{ errors.phoneNumber }}
              </p>
            </div>
          </div>
        </template>
      </BaseFormSection>

      <BaseFormSection title="Account Information">
        <template #icon><LockKeyhole aria-hidden="true" /></template>
        <template #content>
          <dl class="form-grid profile-account">
            <div>
              <dt>Email</dt>
              <dd>{{ user?.email || 'Not available' }}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{{ profile.role }}</dd>
            </div>
          </dl>
        </template>
      </BaseFormSection>

      <div class="form-actions">
        <BaseButton
          label="Cancel"
          variant="secondary"
          :disabled="saving"
          @click="router.push({ name: 'dashboard' })"
        />
        <BaseButton
          label="Reload profile"
          variant="secondary"
          :disabled="saving || reloading"
          @click="reload"
        />
        <BaseButton
          :label="saving ? 'Saving...' : 'Save changes'"
          type="submit"
          :disabled="saving || reloading"
        />
      </div>
    </form>
    <BaseButton v-if="!profile" label="Reload profile" :disabled="reloading" @click="reload" />
  </div>
</template>

<style scoped>
.profile-picture {
  flex-wrap: wrap;
}

.profile-picture__preview {
  display: grid;
  place-items: center;
  width: 96px;
  height: 96px;
  flex: none;
  border-radius: 50%;
  overflow: hidden;
  background: var(--color-interactive-default);
  color: var(--color-text-on-interactive);
  font-size: 28px;
  font-weight: 600;
}

.profile-picture__preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-picture__controls {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
}

.profile-picture__controls input {
  max-width: 100%;
}

.profile-picture__controls .image-upload-hint,
.profile-picture__controls .invalid {
  margin: 0;
}

.profile-account {
  margin: 0;
}

.profile-account dt {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
}

.profile-account dd {
  margin: 0;
  overflow-wrap: anywhere;
}
</style>
