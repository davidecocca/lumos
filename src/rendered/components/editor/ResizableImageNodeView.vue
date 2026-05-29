<template>
    <node-view-wrapper
    ref="wrapperRef"
    class="position-relative d-block overflow-hidden rounded-lg my-4 note-image-node"
    :style="wrapperStyle"
    @click.stop="selectNode"
    >
    <v-btn
    v-if="selected"
    position="absolute"
    location="top right"
    color="surface-dark"
    icon
    rounded="xl"
    variant="flat"
    size="small"
    class="note-image-node__floating-control ma-2 border"
    aria-label="Remove image"
    @click.stop="handleDelete"
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
    class="note-image-node__floating-control d-flex align-center border ma-2"
    >
    <v-btn
    v-for="control in alignmentControls"
    :key="control.value"
    :color="alignment === control.value ? 'primary' : undefined"
    :icon="control.icon"
    :aria-label="control.label"
    size="small"
    variant="text"
    @click.stop="updateAlignment(control.value)"
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
    class="note-image-node__resize-handle ma-2 border"
    aria-label="Resize image"
    @pointerdown.stop.prevent="startResize($event)"
    />
    
    <img
    class="note-image-node__image"
    :src="node.attrs.src"
    :alt="node.attrs.alt || 'Note image'"
    :title="node.attrs.title || node.attrs.alt || 'Note image'"
    draggable="false"
    >
</node-view-wrapper>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'

const IMAGE_MUTATION_EVENT = 'lumos-note-image-mutation'

const props = defineProps(nodeViewProps)

const wrapperRef = ref(null)
const isResizing = ref(false)
const liveWidth = ref(null)
const resizeState = ref(null)

const alignmentControls = [
    { value: 'left', icon: 'ph-text-align-left', label: 'Align left' },
    { value: 'center', icon: 'ph-text-align-center', label: 'Align center' },
    { value: 'right', icon: 'ph-text-align-right', label: 'Align right' },
]

const getWrapperElement = () => {
    const candidate = wrapperRef.value
    return candidate?.$el || candidate || null
}

const resizeOptions = computed(() => ({
    enabled: props.extension.options.resize?.enabled !== false,
    minWidth: props.extension.options.resize?.minWidth || 120,
    maxWidth: props.extension.options.resize?.maxWidth || null,
}))

const currentWidth = computed(() => liveWidth.value ?? props.node.attrs.width ?? null)
const alignment = computed(() => props.node.attrs.align || 'center')

const wrapperStyle = computed(() => {
    const width = currentWidth.value
    const align = alignment.value
    const styles = {
        width: width ? `${width}px` : 'fit-content',
        maxWidth: '100%',
        lineHeight: 0,
        boxShadow: props.selected || isResizing.value
        ? `0 0 0 2px rgba(var(--v-theme-primary), ${isResizing.value ? 0.9 : 0.72})`
        : undefined,
    }
    
    if (align === 'left') {
        styles.marginLeft = '0'
        styles.marginRight = 'auto'
    } else if (align === 'right') {
        styles.marginLeft = 'auto'
        styles.marginRight = '0'
    } else {
        styles.marginLeft = 'auto'
        styles.marginRight = 'auto'
    }
    
    return styles
})

const emitMutation = () => {
    window.dispatchEvent(new CustomEvent(IMAGE_MUTATION_EVENT))
}

const handleDelete = () => {
    props.deleteNode()
    emitMutation()
}

const updateAlignment = (align) => {
    if (!align || align === alignment.value) {
        return
    }
    
    props.updateAttributes({ align })
    emitMutation()
}

const showResizeHandle = computed(() => (props.selected && resizeOptions.value.enabled))

const getMaxWidth = (wrapperElement) => {
    const parentWidth = wrapperElement?.parentElement?.clientWidth || 0
    const configuredMaxWidth = resizeOptions.value.maxWidth || Infinity
    const domMaxWidth = parentWidth || Infinity
    
    return Math.max(resizeOptions.value.minWidth, Math.min(configuredMaxWidth, domMaxWidth))
}

const clampWidth = (width, wrapperElement) => {
    const minWidth = resizeOptions.value.minWidth
    const maxWidth = getMaxWidth(wrapperElement)
    
    return Math.min(Math.max(width, minWidth), maxWidth)
}

const cleanupResize = () => {
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', stopResize)
    window.removeEventListener('pointercancel', stopResize)
    resizeState.value = null
    isResizing.value = false
    liveWidth.value = null
}

const selectNode = () => {
    const position = props.getPos?.()
    
    if (typeof position !== 'number') {
        return
    }
    
    props.editor.chain().focus().setNodeSelection(position).run()
}

const stopResize = () => {
    if (!resizeState.value) {
        return
    }
    
    const nextWidth = Math.round(liveWidth.value || resizeState.value.startWidth)
    const previousWidth = props.node.attrs.width || null
    
    cleanupResize()
    
    if (!nextWidth || nextWidth === previousWidth) {
        return
    }
    
    props.updateAttributes({ width: nextWidth })
    emitMutation()
}

const handlePointerMove = (event) => {
    if (!resizeState.value) {
        return
    }
    
    const deltaX = event.clientX - resizeState.value.startX
    const deltaY = event.clientY - resizeState.value.startY
    const aspectRatio = resizeState.value.aspectRatio || 1
    const projectedDelta = (
    deltaX + (deltaY / aspectRatio)
    ) / (1 + (1 / aspectRatio ** 2))
    
    liveWidth.value = clampWidth(
    resizeState.value.startWidth + projectedDelta,
    resizeState.value.wrapperElement
    )
}

const startResize = (event) => {
    const wrapperElement = getWrapperElement()
    
    if (!wrapperElement) {
        return
    }
    
    const wrapperRect = wrapperElement.getBoundingClientRect()
    const widthFromDom = Math.round(wrapperRect.width)
    const startWidth = clampWidth(
    widthFromDom || props.node.attrs.width || resizeOptions.value.minWidth,
    wrapperElement
    )
    
    selectNode()
    isResizing.value = true
    liveWidth.value = startWidth
    resizeState.value = {
        aspectRatio: wrapperRect.width && wrapperRect.height ? wrapperRect.width / wrapperRect.height : 1,
        startX: event.clientX,
        startY: event.clientY,
        startWidth,
        wrapperElement,
    }
    
    if (event.pointerId !== undefined) {
        event.currentTarget?.setPointerCapture?.(event.pointerId)
    }
    
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopResize)
    window.addEventListener('pointercancel', stopResize)
}

watch(() => props.node.attrs.width, () => {
    if (!isResizing.value) {
        liveWidth.value = null
    }
})

onBeforeUnmount(() => {
    cleanupResize()
})
</script>

<style scoped>
.note-image-node {
    max-width: 100%;
}

.note-image-node__image {
    display: block;
    width: 100%;
    max-width: 100%;
    height: auto;
    user-select: none;
    pointer-events: none;
}

.note-image-node__floating-control {
    z-index: 2;
}

.note-image-node__resize-handle {
    cursor: nwse-resize;
    touch-action: none;
    z-index: 2;
}

.note-image-node__resize-handle :deep(.v-btn__content),
.note-image-node__resize-handle :deep(.v-icon) {
    cursor: nwse-resize;
}
</style>
