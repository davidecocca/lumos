<template>
    <div class="chat-view">
        <aside class="chat-view__sidebar border-e pr-4">
            <v-list nav density="compact" class="chat-view__list">
                <v-list-item
                prepend-icon="ph-plus"
                title="New chat"
                rounded="lg"
                variant="tonal"
                class="mb-4"
                @click="startNewChat"
                >
                <template v-slot:append>
                    <v-hotkey
                    keys="cmd+shift+o"
                    display-mode="icon"
                    variant="text"
                    platform="mac"
                    />
                </template>
            </v-list-item>
            
            <v-list-subheader>Recents</v-list-subheader>
            <v-list-item
            v-if="conversations.length === 0"
            prepend-icon="ph-clock-counter-clockwise"
            title="No recent chats"
            />
            <v-list-item
            v-for="conversation in conversations"
            :key="conversation.id"
            :active="conversation.id === selectedConversationId"
            rounded="lg"
            @click="selectedConversationId = conversation.id"
            >
            <v-list-item-title>{{ conversation.title || 'New chat' }}</v-list-item-title>
            <v-list-item-subtitle>{{ formatConversationTime(conversation.updatedAt) }}</v-list-item-subtitle>
            <template v-slot:append>
                <v-menu>
                    <template v-slot:activator="{ props }">
                        <v-tooltip text="More" location="top">
                            <template v-slot:activator="{ props: tooltipProps }">
                                <v-btn
                                v-bind="{ ...props, ...tooltipProps }"
                                icon="ph-dots-three"
                                size="small"
                                variant="text"
                                density="compact"
                                @click.stop
                                />
                            </template>
                        </v-tooltip>
                    </template>
                    <v-list density="compact" rounded="lg" class="pl-1 pr-1 pt-2 pb-2">
                        <v-list-item @click.stop="openRenameChatDialog(conversation)" rounded="lg">
                            <template v-slot:append>
                                <v-icon icon="ph-pencil-line"></v-icon>
                            </template>
                            <v-list-item-title>Rename</v-list-item-title>
                        </v-list-item>
                        <v-list-item @click.stop="openDeleteChatDialog(conversation)" rounded="lg">
                            <template v-slot:append>
                                <v-icon icon="ph-trash"></v-icon>
                            </template>
                            <v-list-item-title>Delete</v-list-item-title>
                        </v-list-item>
                    </v-list>
                </v-menu>
            </template>
        </v-list-item>
    </v-list>
</aside>

<LumosChatPanel
:key="selectedConversationId || newChatKey"
class="chat-view__panel"
scope="all"
:conversation-id="selectedConversationId"
:start-empty="!selectedConversationId"
is-visible
@new-thread="startNewChat"
@select-conversation="selectedConversationId = $event"
@conversation-updated="handleConversationUpdated"
/>

<RenameChatDialog
v-model="renameChatDialog"
:chat-id="activeChatId"
:current-chat-title="activeChatTitle"
@rename-chat="handleRenameChat"
/>
<ConfirmDeleteChatDialog
v-model="deleteChatDialog"
:chat-id="activeChatId"
@delete-chat="handleDeleteChat"
/>
</div>
</template>

<script setup>
import LumosChatPanel from '../components/chat/LumosChatPanel.vue';
import RenameChatDialog from '../components/chat/RenameChatDialog.vue';
import ConfirmDeleteChatDialog from '../components/chat/ConfirmDeleteChatDialog.vue';
import { useChatStore } from '../stores/chatStore';
import { onMounted, ref } from 'vue'

const chatStore = useChatStore()
const conversations = ref([])
const selectedConversationId = ref(null)
const newChatKey = ref('new')
const renameChatDialog = ref(false)
const deleteChatDialog = ref(false)
const activeChatId = ref(null)
const activeChatTitle = ref('')

const refreshConversations = async () => {
    conversations.value = await chatStore.listChatConversations({
        scope: 'all',
        limit: 30,
    })
}

const startNewChat = () => {
    selectedConversationId.value = null
    newChatKey.value = `new:${Date.now()}`
}

const handleConversationUpdated = async (conversation) => {
    await refreshConversations()
    if (conversation?.id) {
        selectedConversationId.value = conversation.id
    }
}

const openRenameChatDialog = (conversation) => {
    activeChatId.value = conversation.id
    activeChatTitle.value = conversation.title || 'New chat'
    renameChatDialog.value = true
}

const openDeleteChatDialog = (conversation) => {
    activeChatId.value = conversation.id
    activeChatTitle.value = conversation.title || 'New chat'
    deleteChatDialog.value = true
}

const handleRenameChat = async (chatId, title) => {
    await chatStore.renameChatConversation(chatId, title)
    renameChatDialog.value = false
    await refreshConversations()
}

const handleDeleteChat = async (chatId) => {
    await chatStore.deleteChatConversation(chatId)
    deleteChatDialog.value = false
    await refreshConversations()
    
    if (Number(selectedConversationId.value) === Number(chatId)) {
        startNewChat()
    }
}

const formatConversationTime = (value) => {
    if (!value) return ''
    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value))
}

onMounted(async () => {
    await refreshConversations()
    startNewChat()
})
</script>

<style scoped>
.chat-view {
    height: calc(100vh - 80px);
    min-height: 0;
    display: flex;
    overflow: hidden;
}

.chat-view__sidebar {
    width: 300px;
    flex: 0 0 300px;
    min-height: 0;
    display: flex;
    flex-direction: column;
}

.chat-view__list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    background: transparent;
}

.chat-view__panel {
    flex: 1;
    min-width: 0;
}
</style>
