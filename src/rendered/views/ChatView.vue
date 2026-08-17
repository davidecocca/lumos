<template>
    <v-layout class="chat-view">
        <v-navigation-drawer
        v-model="isChatSidebarOpen"
        width="320"
        disable-route-watcher
        color="background"
        class="chat-view__sidebar"
        >
        
        <v-list
        nav
        density="compact"
        >
        <v-list-item>
            <v-list-item-title class="text-medium-emphasis text-body-small">
                Recents
            </v-list-item-title>
            <template v-slot:append>
                <v-tooltip text="Hide chats" location="bottom">
                    <template v-slot:activator="{ props }">
                        <v-btn
                        v-bind="props"
                        icon="ph-caret-left"
                        variant="text"
                        density="comfortable"
                        @click="isChatSidebarOpen = false"
                        />
                    </template>
                </v-tooltip>
            </template>
        </v-list-item>
    </v-list>
    
    <div class="chat-view__sidebar-content">
        <v-list nav density="compact" class="chat-view__list px-2">            
            <v-list-item
            v-if="conversations.length === 0"
            prepend-icon="ph-clock-counter-clockwise"
            title="No recent chats"
            rounded="lg"
            />
            <v-list-item
            v-for="conversation in conversations"
            :key="conversation.id"
            :active="conversation.id === selectedConversationId"
            rounded="lg"
            lines="two"
            class="chat-view__conversation pr-1"
            @mouseenter="hoveredConversationId = conversation.id"
            @mouseleave="hoveredConversationId = null"
            @click="selectedConversationId = conversation.id"
            >
            <v-list-item-title class="text-body-2 font-weight-medium">
                {{ conversation.title || 'New chat' }}
            </v-list-item-title>
            <v-list-item-subtitle>{{ formatConversationTime(conversation.updatedAt) }}</v-list-item-subtitle>
            <template v-slot:append>
                <v-menu
                :model-value="activeConversationMenuId === conversation.id"
                @update:model-value="setConversationMenuOpen(conversation.id, $event)"
                >
                <template v-slot:activator="{ props }">
                    <v-tooltip text="More" location="top">
                        <template v-slot:activator="{ props: tooltipProps }">
                            <v-btn
                            v-show="isConversationActionVisible(conversation.id)"
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
                            <v-icon icon="ph-pencil-simple-line"></v-icon>
                        </template>
                        <v-list-item-title>Rename</v-list-item-title>
                    </v-list-item>
                    <v-list-item
                    class="delete-menu-action"
                    base-color="error"
                    @click.stop="openDeleteChatDialog(conversation)"
                    rounded="lg"
                    >
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
</div>
</v-navigation-drawer>

<v-main class="chat-view__main">
    <div
    v-if="!isChatSidebarOpen"
    class="chat-view__floating-actions d-flex align-center ga-1"
    >
    <v-tooltip text="Show chats" location="bottom">
        <template v-slot:activator="{ props }">
            <v-btn
            v-bind="props"
            icon="ph-chats-circle"
            variant="text"
            density="comfortable"
            @click="isChatSidebarOpen = true"
            />
        </template>
    </v-tooltip>
</div>

<LumosChatPanel
class="chat-view__panel"
scope="all"
:conversation-id="selectedConversationId"
:start-empty="!selectedConversationId"
:showHeaderActions="!isChatSidebarOpen"
is-visible
@new-thread="startNewChat"
@select-conversation="selectedConversationId = $event"
@conversation-updated="handleConversationUpdated"
/>
</v-main>

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
</v-layout>
</template>

<script setup>
import LumosChatPanel from '../components/chat/LumosChatPanel.vue';
import RenameChatDialog from '../components/chat/dialogs/RenameChatDialog.vue';
import ConfirmDeleteChatDialog from '../components/chat/dialogs/ConfirmDeleteChatDialog.vue';
import { useChatStore } from '../stores/chatStore';
import { onMounted, ref } from 'vue'

const chatStore = useChatStore()
const conversations = ref([])
const selectedConversationId = ref(null)
const isChatSidebarOpen = ref(true)
const hoveredConversationId = ref(null)
const activeConversationMenuId = ref(null)
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

const setConversationMenuOpen = (conversationId, isOpen) => {
    activeConversationMenuId.value = isOpen ? conversationId : null
}

const isConversationActionVisible = (conversationId) => {
    return hoveredConversationId.value === conversationId || activeConversationMenuId.value === conversationId
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
    height: calc(100vh - 32px);
    min-height: 0;
    overflow: hidden;
    position: relative;
}

.chat-view__sidebar {
    overflow: hidden;
}

.chat-view__sidebar :deep(.v-navigation-drawer__content) {
    display: flex;
    flex-direction: column;
    min-height: 0;
}

.chat-view__sidebar-content {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.chat-view__list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    background: transparent;
}

.chat-view__conversation :deep(.v-list-item-title),
.chat-view__conversation :deep(.v-list-item-subtitle) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.chat-view__conversation :deep(.v-list-item__append) {
    min-width: 32px;
}

.chat-view__main {
    height: 100%;
    min-width: 0;
    position: relative;
}

.chat-view__panel {
    height: 100%;
    min-width: 0;
}

.chat-view__floating-actions {
    position: absolute;
    top: 12px;
    left: 12px;
    z-index: 2;
}

</style>
