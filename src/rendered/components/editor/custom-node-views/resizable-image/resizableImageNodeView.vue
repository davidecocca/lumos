<template>
    <node-view-wrapper
    ref="wrapperRef"
    class="position-relative d-block overflow-hidden rounded-lg my-4 note-image-node"
    :style="wrapperStyle"
    @click.stop="selectNode"
    >
    <CommonOverlayControls
    :selected="selected"
    :alignment="alignment"
    :show-resize-handle="showResizeHandle"
    delete-label="Remove image"
    resize-label="Resize image"
    @delete="handleDelete"
    @update:alignment="updateAlignment"
    @resize-start="startResize"
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
import CommonOverlayControls from '../../overlay-controls/CommonOverlayControls.vue'

import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'

const IMAGE_MUTATION_EVENT = 'lumos-note-image-mutation'

const props = defineProps(nodeViewProps)

// State
const wrapperRef = ref(null)    // DOM wrapper around the image
const isResizing = ref(false)   // true while dragging resize handle
const liveWidth = ref(null)     // temporary width during drag
const resizeState = ref(null)   // drag metadata: start pointer position, start width, aspect ratio, wrapper element.

const getWrapperElement = () => {
    const candidate = wrapperRef.value
    return candidate?.$el || candidate || null
}

// Derived values
const resizeOptions = computed(() => ({
    enabled: props.extension.options.resize?.enabled !== false,
    minWidth: props.extension.options.resize?.minWidth || 240,
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
const showResizeHandle = computed(() => (props.selected && resizeOptions.value.enabled))

const emitMutation = () => {
    window.dispatchEvent(new CustomEvent(IMAGE_MUTATION_EVENT))
}

// Node actions
const selectNode = () => {
    const position = props.getPos?.()
    
    if (typeof position !== 'number') {
        return
    }
    
    props.editor.chain().focus().setNodeSelection(position).run()
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

// Enforces resize boundaries.
// This prevents the image from being resized wider than its parent.
const getMaxWidth = (wrapperElement) => {
    const parentWidth = wrapperElement?.parentElement?.clientWidth || 0
    const configuredMaxWidth = resizeOptions.value.maxWidth || Infinity
    const domMaxWidth = parentWidth || Infinity
    
    return Math.max(resizeOptions.value.minWidth, Math.min(configuredMaxWidth, domMaxWidth))
}

// Forces any proposed width into the valid range:
const clampWidth = (width, wrapperElement) => {
    const minWidth = resizeOptions.value.minWidth
    const maxWidth = getMaxWidth(wrapperElement)
    
    return Math.min(Math.max(width, minWidth), maxWidth)
}

// Resize flow
// Captures initial size/position, selects node, starts global pointer listeners.
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

// Computes drag delta, preserves aspect ratio, updates liveWidth.
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
// Commits final width into node.attrs.width, then emits mutation.
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

// Removes global listeners and clears temporary state.
const cleanupResize = () => {
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', stopResize)
    window.removeEventListener('pointercancel', stopResize)
    resizeState.value = null
    isResizing.value = false
    liveWidth.value = null
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

</style>
