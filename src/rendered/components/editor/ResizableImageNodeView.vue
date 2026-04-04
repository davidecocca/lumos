<template>
    <node-view-wrapper
    ref="wrapperRef"
    class="note-image-node"
    :class="{
        'note-image-node--selected': selected,
        'note-image-node--resizing': isResizing,
    }"
    :style="wrapperStyle"
    >
    <v-sheet
    v-if="selected"
    class="note-image-node__toolbar note-image-node__toolbar--top-right note-image-node__toolbar--single d-flex align-center justify-center pa-1 rounded-xl"
    color="surface"
    border
    elevation="6"
    >
        <v-tooltip text="Remove image" location="top">
            <template v-slot:activator="{ props }">
                <v-btn
                v-bind="props"
                icon="ph-trash"
                size="x-small"
                variant="text"
                @click.stop="handleDelete"
                />
            </template>
        </v-tooltip>
    </v-sheet>
    
    <v-sheet
    v-if="selected"
    class="note-image-node__toolbar note-image-node__toolbar--bottom-center d-flex align-center ga-1 pa-1 rounded-xl"
    color="surface"
    border
    elevation="6"
    >
        <v-tooltip text="Align left" location="top">
            <template v-slot:activator="{ props }">
                <v-btn
                v-bind="props"
                icon="ph-text-align-left"
                size="x-small"
                variant="text"
                :color="node.attrs.align === 'left' ? 'primary' : undefined"
                @click.stop="updateAlignment('left')"
                />
            </template>
        </v-tooltip>
        <v-tooltip text="Align center" location="top">
            <template v-slot:activator="{ props }">
                <v-btn
                v-bind="props"
                icon="ph-text-align-center"
                size="x-small"
                variant="text"
                :color="node.attrs.align === 'center' ? 'primary' : undefined"
                @click.stop="updateAlignment('center')"
                />
            </template>
        </v-tooltip>
        <v-tooltip text="Align right" location="top">
            <template v-slot:activator="{ props }">
                <v-btn
                v-bind="props"
                icon="ph-text-align-right"
                size="x-small"
                variant="text"
                :color="node.attrs.align === 'right' ? 'primary' : undefined"
                @click.stop="updateAlignment('right')"
                />
            </template>
        </v-tooltip>
    </v-sheet>
    
    <v-sheet
    v-if="showResizeHandle('left')"
    class="note-image-node__handle note-image-node__handle--left note-image-node__toolbar--single d-flex align-center justify-center pa-1 rounded-xl"
    color="surface"
    border
    elevation="6"
    >
        <v-tooltip text="Resize" location="top">
            <template v-slot:activator="{ props }">
                <v-btn
                v-bind="props"
                icon="ph-arrows-out-line-horizontal"
                size="x-small"
                variant="text"
                aria-label="Resize image"
                @pointerdown.stop.prevent="startResize('left', $event)"
                />
            </template>
        </v-tooltip>
    </v-sheet>
    
    <v-sheet
    v-if="showResizeHandle('right')"
    class="note-image-node__handle note-image-node__handle--right note-image-node__toolbar--single d-flex align-center justify-center pa-1 rounded-xl"
    color="surface"
    border
    elevation="6"
    >
        <v-tooltip text="Resize" location="top">
            <template v-slot:activator="{ props }">
                <v-btn
                v-bind="props"
                icon="ph-arrows-out-line-horizontal"
                size="x-small"
                variant="text"
                aria-label="Resize image"
                @pointerdown.stop.prevent="startResize('right', $event)"
                />
            </template>
        </v-tooltip>
    </v-sheet>
    
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

const getWrapperElement = () => {
    const candidate = wrapperRef.value
    return candidate?.$el || candidate || null
}

const resizeOptions = computed(() => ({
    enabled: props.extension.options.resize?.enabled !== false,
    directions: props.extension.options.resize?.directions || ['right'],
    minWidth: props.extension.options.resize?.minWidth || 120,
    maxWidth: props.extension.options.resize?.maxWidth || null,
}))

const currentWidth = computed(() => liveWidth.value ?? props.node.attrs.width ?? null)

const wrapperStyle = computed(() => {
    const width = currentWidth.value
    const align = props.node.attrs.align || 'center'
    const styles = {
        width: width ? `${width}px` : 'fit-content',
        maxWidth: '100%',
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
    if (!align || align === props.node.attrs.align) {
        return
    }
    
    props.updateAttributes({ align })
    emitMutation()
}

const showResizeHandle = (direction) => (
props.selected
&& resizeOptions.value.enabled
&& resizeOptions.value.directions.includes(direction)
)

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
    const directionalDelta = resizeState.value.direction === 'left' ? -deltaX : deltaX
    
    liveWidth.value = clampWidth(
    resizeState.value.startWidth + directionalDelta,
    resizeState.value.wrapperElement
    )
}

const startResize = (direction, event) => {
    const wrapperElement = getWrapperElement()
    
    if (!wrapperElement) {
        return
    }
    
    const widthFromDom = Math.round(wrapperElement.getBoundingClientRect().width)
    const startWidth = clampWidth(
    widthFromDom || props.node.attrs.width || resizeOptions.value.minWidth,
    wrapperElement
    )
    
    selectNode()
    isResizing.value = true
    liveWidth.value = startWidth
    resizeState.value = {
        direction,
        startX: event.clientX,
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
    position: relative;
    display: block;
    margin: 1rem 0;
    max-width: 100%;
    overflow: hidden;
    border-radius: 16px;
    line-height: 0;
}

.note-image-node--selected {
    box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.72);
}

.note-image-node--resizing {
    box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.9);
}

.note-image-node__image {
    display: block;
    width: 100%;
    max-width: 100%;
    height: auto;
    border-radius: 16px;
    user-select: none;
    pointer-events: none;
}

.note-image-node__toolbar {
    position: absolute;
    z-index: 2;
    display: flex;
}

.note-image-node__toolbar--single {
    min-width: 40px;
    min-height: 40px;
}

.note-image-node__toolbar--top-right {
    top: 10px;
    right: 10px;
}

.note-image-node__toolbar--bottom-left {
    left: 10px;
    bottom: 10px;
}

.note-image-node__toolbar--bottom-center {
    left: 50%;
    transform: translateX(-50%);
    bottom: 10px;
}

.note-image-node__handle {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    cursor: ew-resize;
    touch-action: none;
    z-index: 2;
}

.note-image-node__handle--left {
    left: 10px;
}

.note-image-node__handle--right {
    right: 10px;
}

</style>
