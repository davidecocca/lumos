<template>
    <div
        class="chat-content"
        :class="{ 'align-center justify-center pb-16': isEmpty }"
    >
        <div
            v-if="isEmpty"
            class="w-100"
        >
            <EmptyChatState />
        </div>

        <div
            v-if="!isEmpty"
            ref="chatContainer"
            class="chat-container"
        >
            <v-list
                lines="one"
                style="background-color: transparent;"
            >
                <v-list-item
                    v-for="(message, index) in messages"
                    :key="index"
                    :data-message-index="index"
                    class="mb-2"
                >
                    <div v-if="message.user === 'bot'" class="d-flex flex-grow-1 justify-start align-items-center" style="max-width: 80%;">
                        <ChatCard
                            class="flex-grow-1"
                            :message="message"
                            :showSources="showSources"
                            @open-source="emit('open-source', $event)"
                        />
                    </div>
                    <div v-if="message.user === 'user'" class="d-flex justify-end flex-grow-1">
                        <ChatCard
                            :message="message"
                            :showSources="showSources"
                            class="ms-auto"
                            style="max-width: 80%"
                            @open-source="emit('open-source', $event)"
                        />
                    </div>
                </v-list-item>
            </v-list>
        </div>

        <slot />
    </div>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import ChatCard from './ChatCard.vue'
import EmptyChatState from './EmptyChatState.vue'

const props = defineProps({
    messages: {
        type: Array,
        default: () => [],
    },
    showSources: {
        type: Boolean,
        default: true,
    },
})

const emit = defineEmits(['open-source'])

const chatContainer = ref(null)
const isEmpty = computed(() => props.messages.length === 0)

const scrollToBottom = async () => {
    await nextTick()

    requestAnimationFrame(() => {
        const el = chatContainer.value
        if (!el) return
        el.scrollTop = el.scrollHeight
    })
}

defineExpose({
    scrollToBottom,
})
</script>

<style scoped>
.chat-content {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.chat-container {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding-bottom: 8px;
}
</style>
