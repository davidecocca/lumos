<template>
    <v-menu
        :model-value="modelValue"
        @update:model-value="emit('update:modelValue', $event)"
    >
        <template v-slot:activator="{ props }">
            <v-tooltip text="More" :location="tooltipLocation">
                <template v-slot:activator="{ props: tooltipProps }">
                    <v-btn
                        v-show="visible"
                        v-bind="{ ...props, ...tooltipProps }"
                        :class="buttonClass"
                        icon="ph-dots-three"
                        :size="buttonSize"
                        variant="text"
                        :density="buttonDensity"
                        rounded="sm"
                    ></v-btn>
                </template>
            </v-tooltip>
        </template>
        <v-list density="compact" rounded="lg" class="pl-1 pr-1 pt-2 pb-2">
            <template v-for="item in menuItems" :key="item.key">
                <v-divider v-if="item.divider" class="my-1"></v-divider>
                <v-menu
                    v-else-if="item.children"
                    location="end"
                    close-on-content-click
                    open-on-hover
                >
                    <template v-slot:activator="{ props: submenuProps }">
                        <v-list-item
                            v-bind="submenuProps"
                            @click.stop
                            rounded="lg"
                        >
                            <template v-slot:append>
                                <v-icon :icon="item.icon"></v-icon>
                            </template>
                            <v-list-item-title>{{
                                item.title
                            }}</v-list-item-title>
                        </v-list-item>
                    </template>
                    <v-list density="compact" rounded="lg" class="pa-1">
                        <v-list-item
                            v-for="child in item.children"
                            :key="child.key"
                            @click="child.action"
                            rounded="lg"
                        >
                            <template v-slot:append>
                                <v-icon :icon="child.icon"></v-icon>
                            </template>
                            <v-list-item-title>{{
                                child.title
                            }}</v-list-item-title>
                        </v-list-item>
                    </v-list>
                </v-menu>
                <v-list-item
                    v-else
                    :class="item.class"
                    :base-color="item.baseColor"
                    @click="item.action"
                    rounded="lg"
                >
                    <template v-slot:append>
                        <v-icon :icon="item.icon"></v-icon>
                    </template>
                    <v-list-item-title>{{ item.title }}</v-list-item-title>
                </v-list-item>
            </template>
        </v-list>
    </v-menu>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    note: {
        type: Object,
        required: true,
    },
    visible: {
        type: Boolean,
        default: false,
    },
    modelValue: {
        type: Boolean,
        default: false,
    },
    editorActions: {
        type: Boolean,
        default: false,
    },
    buttonSize: {
        type: String,
        default: 'small',
    },
    buttonDensity: {
        type: String,
        default: 'compact',
    },
    buttonClass: {
        type: [String, Array, Object],
        default: '',
    },
    tooltipLocation: {
        type: String,
        default: 'top',
    },
});

const emit = defineEmits([
    'update:modelValue',
    'toggle-favorite',
    'rename-note',
    'move-note',
    'delete-note',
    'undo',
    'redo',
    'export-note',
]);

const currentFolderId = computed(
    () => props.note.folder_id ?? props.note.folderId ?? null,
);

const menuItems = computed(() => {
    const isFavorite = props.note.favorite == 1;

    const editorMenuItems = props.editorActions
        ? [
              {
                  key: 'undo',
                  title: 'Undo',
                  icon: 'ph-arrow-counter-clockwise',
                  action: () => emit('undo'),
              },
              {
                  key: 'redo',
                  title: 'Redo',
                  icon: 'ph-arrow-clockwise',
                  action: () => emit('redo'),
              },
              {
                  key: 'export',
                  title: 'Export',
                  icon: 'ph-export',
                  children: [
                      {
                          key: 'export-pdf',
                          title: 'PDF',
                          icon: 'ph-file-pdf',
                          action: () => emit('export-note', 'pdf'),
                      },
                      {
                          key: 'export-markdown',
                          title: 'Markdown',
                          icon: 'ph-file-md',
                          action: () => emit('export-note', 'markdown'),
                      },
                      {
                          key: 'export-html',
                          title: 'HTML',
                          icon: 'ph-file-html',
                          action: () => emit('export-note', 'html'),
                      },
                  ],
              },
              { key: 'editor-divider', divider: true },
          ]
        : [];

    return [
        ...editorMenuItems,
        {
            key: 'favorite',
            title: isFavorite ? 'Unfavorite' : 'Favorite',
            icon: isFavorite ? 'ph-heart-break' : 'ph-heart',
            action: () => emit('toggle-favorite', props.note.id),
        },
        {
            key: 'rename',
            title: 'Rename',
            icon: 'ph-pencil-simple-line',
            action: () => emit('rename-note', props.note.id, props.note.title),
        },
        {
            key: 'move',
            title: 'Move to',
            icon: 'ph-arrow-right',
            action: () =>
                emit('move-note', props.note.id, currentFolderId.value),
        },
        {
            key: 'delete',
            title: 'Delete',
            icon: 'ph-trash',
            class: 'delete-menu-action',
            baseColor: 'error',
            action: () => emit('delete-note', props.note.id),
        },
    ];
});
</script>
