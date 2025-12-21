<template>
    <div class="ma-2">
        <v-card
        class="rounded-md border ma-2"
        title="About you"
        subtitle="Tell Lumos more about you."
        rounded="lg"
        elevation="0"
        >
        <v-card-text>
            <div class="d-flex flex-column">
                <div class="d-flex align-top">
                    <v-text-field
                    label="Your name"
                    type="text"
                    class="flex-grow-1 mr-4"
                    v-model="userName"
                    @keydown.enter="saveUserName"
                    variant="outlined"
                    clearable
                    ></v-text-field>
                    <v-btn
                    color="primary"
                    variant="tonal"
                    @click="saveUserName"
                    height="56"
                    >
                    Save
                </v-btn>
            </div>
        </div>
    </v-card-text>
</v-card>
</div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { userInfoStore } from '../../stores/userInfoStore'

const userStore = userInfoStore()
const userName = ref('')

onMounted(() => {
  try {
    const userInfo = userStore.loadUserInfo()
    userName.value = userInfo?.userName ?? userStore.userName ?? ''
  } catch (e) {
    userName.value = userStore.userName ?? ''
    console.error('Failed to load user info:', e)
  }
})

function saveUserName() {
  userStore.userName = userName.value
  userStore.saveUserInfo()
  console.log('User name saved:', userName.value)
}
</script>