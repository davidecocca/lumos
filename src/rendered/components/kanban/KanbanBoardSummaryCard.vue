<template>
    <v-card
        elevation="0"
        rounded="lg"
        height="108"
        class="border pa-4 d-flex flex-column"
        @click="
            router.push({ name: 'kanban-board', params: { boardId: board.id } })
        "
    >
        <div class="d-flex align-center ga-2">
            <v-card-title
                class="pa-0 text-title-large font-weight-medium text-truncate flex-grow-1 flex-shrink-1"
                style="min-width: 0"
                :title="board.name"
                >{{ board.name }}</v-card-title
            >
            <div class="flex-shrink-0" @click.stop @keydown.stop>
                <v-menu location="bottom end" offset="6">
                    <template #activator="{ props }">
                        <v-btn
                            v-bind="props"
                            icon="ph-dots-three"
                            size="x-small"
                            variant="text"
                            density="comfortable"
                            rounded
                            :disabled="disabled"
                            :aria-label="`Actions for ${board.name}`"
                        />
                    </template>
                    <v-list density="compact" rounded="lg" class="px-1 py-2">
                        <v-list-item
                            v-for="item in menuItems"
                            :key="item.key"
                            :title="item.title"
                            :append-icon="item.icon"
                            :base-color="item.baseColor"
                            rounded="lg"
                            @click="item.action"
                        />
                    </v-list>
                </v-menu>
            </div>
        </div>
        <div
            class="d-flex align-center ga-2 mt-auto text-body-small text-medium-emphasis"
        >
            <v-icon icon="ph-cards" size="18" />
            <span
                >{{ board.card_count }}
                {{ board.card_count === 1 ? 'card' : 'cards' }}</span
            >
            <v-spacer />
            <span v-if="updatedAt" class="text-no-wrap"
                >Updated {{ updatedAt }}</span
            >
        </div>
    </v-card>
</template>

<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

defineProps({
    board: { type: Object, required: true },
    disabled: Boolean,
    updatedAt: { type: String, default: '' },
});
const emit = defineEmits(['rename', 'duplicate', 'delete']);
const menuItems = [
    {
        key: 'rename',
        title: 'Rename',
        icon: 'ph-pencil-simple',
        action: () => emit('rename'),
    },
    {
        key: 'duplicate',
        title: 'Duplicate',
        icon: 'ph-copy',
        action: () => emit('duplicate'),
    },
    {
        key: 'delete',
        title: 'Delete',
        icon: 'ph-trash',
        baseColor: 'error',
        action: () => emit('delete'),
    },
];
</script>
