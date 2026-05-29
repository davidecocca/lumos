<template>
    <v-btn
    v-if="selected"
    position="absolute"
    location="top right"
    color="surface-dark"
    icon
    rounded="xl"
    variant="flat"
    size="small"
    class="node-view-overlay-control ma-2 border"
    :aria-label="deleteLabel"
    @click.stop="emit('delete')"
    >
    <v-icon
    icon="ph-trash"
    color="error"
    />
</v-btn>

<v-sheet
v-if="selected"
position="absolute"
location="bottom center"
color="surface-dark"
rounded="xl"
class="node-view-overlay-control d-flex align-center border ma-2"
>
<v-btn
v-for="control in alignmentControls"
:key="control.value"
:color="alignment === control.value ? 'primary' : undefined"
:icon="control.icon"
:aria-label="control.label"
size="small"
variant="text"
@click.stop="emit('update:alignment', control.value)"
/>
</v-sheet>

<v-btn
v-show="showResizeHandle"
position="absolute"
location="bottom right"
color="surface-dark"
rounded="xl"
variant="flat"
icon="ph-notches"
size="small"
class="node-view-resize-handle ma-2 border"
:aria-label="resizeLabel"
@pointerdown.stop.prevent="emit('resize-start', $event)"
/>
</template>

<script setup>
defineProps({
    selected: {
        type: Boolean,
        required: true,
    },
    alignment: {
        type: String,
        required: true,
    },
    showResizeHandle: {
        type: Boolean,
        required: true,
    },
    deleteLabel: {
        type: String,
        default: 'Remove node',
    },
    resizeLabel: {
        type: String,
        default: 'Resize node',
    },
})

const emit = defineEmits(['delete', 'update:alignment', 'resize-start'])

const alignmentControls = [
{ value: 'left', icon: 'ph-text-align-left', label: 'Align left' },
{ value: 'center', icon: 'ph-text-align-center', label: 'Align center' },
{ value: 'right', icon: 'ph-text-align-right', label: 'Align right' },
]
</script>

<style scoped>
.node-view-overlay-control {
    z-index: 2;
}

.node-view-resize-handle {
    cursor: nwse-resize;
    touch-action: none;
    z-index: 2;
}

.node-view-resize-handle :deep(.v-btn__content),
.node-view-resize-handle :deep(.v-icon) {
    cursor: nwse-resize;
}
</style>
