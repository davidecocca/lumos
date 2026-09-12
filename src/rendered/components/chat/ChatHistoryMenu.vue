<template>
    <v-menu v-model="isOpen" location="bottom end">
        <template v-slot:activator="{ props: menuProps }">
            <v-tooltip text="Recents" location="bottom">
                <template v-slot:activator="{ props: tooltipProps }">
                    <v-btn
                        v-bind="mergeProps(menuProps, tooltipProps)"
                        variant="text"
                        density="comfortable"
                        rounded="lg"
                        icon="ph-clock-counter-clockwise"
                        @click="emit('load')"
                    />
                </template>
            </v-tooltip>
        </template>

        <v-list
            min-width="280"
            max-height="360"
            density="compact"
            class="overflow-y-auto pl-1 pr-1 pt-2 pb-2"
        >
            <v-list-subheader>Recents</v-list-subheader>
            <v-list-item
                v-if="conversations.length === 0"
                prepend-icon="ph-clock-counter-clockwise"
                title="No recent chats"
            />
            <v-list-item
                v-for="conversation in conversations"
                :key="conversation.id"
                :active="conversation.id === activeConversationId"
                rounded="lg"
                density="compact"
                @click="selectConversation(conversation.id)"
            >
                <v-list-item-title>{{
                    conversation.title || 'New chat'
                }}</v-list-item-title>
                <v-list-item-subtitle>{{
                    formatConversationTime(conversation.updatedAt)
                }}</v-list-item-subtitle>
                <template v-slot:append>
                    <v-menu>
                        <template v-slot:activator="{ props }">
                            <v-tooltip text="More" location="top">
                                <template
                                    v-slot:activator="{ props: tooltipProps }"
                                >
                                    <v-btn
                                        v-bind="{ ...props, ...tooltipProps }"
                                        icon="ph-dots-three"
                                        size="small"
                                        variant="text"
                                        density="comfortable"
                                        rounded
                                        class="ml-2"
                                        @click.stop
                                    />
                                </template>
                            </v-tooltip>
                        </template>
                        <v-list
                            density="compact"
                            rounded="lg"
                            class="pl-1 pr-1 pt-2 pb-2"
                        >
                            <v-list-item
                                @click.stop="emit('rename', conversation)"
                                rounded="lg"
                            >
                                <template v-slot:append>
                                    <v-icon icon="ph-pencil-line"></v-icon>
                                </template>
                                <v-list-item-title>Rename</v-list-item-title>
                            </v-list-item>
                            <v-list-item
                                class="delete-menu-action"
                                base-color="error"
                                @click.stop="emit('delete', conversation)"
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
    </v-menu>
</template>

<script setup>
import { ref, mergeProps } from 'vue';

defineProps({
    conversations: {
        type: Array,
        default: () => [],
    },
    activeConversationId: {
        type: [Number, String],
        default: null,
    },
});

const emit = defineEmits(['load', 'select', 'rename', 'delete']);

const isOpen = ref(false);

const selectConversation = (conversationId) => {
    isOpen.value = false;
    emit('select', conversationId);
};

const formatConversationTime = (value) => {
    if (!value) return '';
    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
};
</script>
