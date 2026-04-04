<template>
    <node-view-wrapper
    ref="wrapperRef"
    class="note-youtube-node"
    :class="{
        'note-youtube-node--selected': selected,
        'note-youtube-node--resizing': isResizing,
    }"
    :style="wrapperStyle"
    @click.stop="selectNode"
    >
    <v-sheet
    v-if="selected"
    class="note-youtube-node__toolbar note-youtube-node__toolbar--top-right note-youtube-node__toolbar--single d-flex align-center justify-center pa-1 rounded-xl"
    color="surface"
    border
    elevation="6"
    >
        <v-tooltip text="Remove video" location="top">
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
    class="note-youtube-node__toolbar note-youtube-node__toolbar--bottom-center d-flex align-center ga-1 pa-1 rounded-xl"
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
    class="note-youtube-node__handle note-youtube-node__handle--left note-youtube-node__toolbar--single d-flex align-center justify-center pa-1 rounded-xl"
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
                aria-label="Resize video"
                @pointerdown.stop.prevent="startResize('left', $event)"
                />
            </template>
        </v-tooltip>
    </v-sheet>

    <v-sheet
    v-if="showResizeHandle('right')"
    class="note-youtube-node__handle note-youtube-node__handle--right note-youtube-node__toolbar--single d-flex align-center justify-center pa-1 rounded-xl"
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
                aria-label="Resize video"
                @pointerdown.stop.prevent="startResize('right', $event)"
                />
            </template>
        </v-tooltip>
    </v-sheet>

    <div
    v-if="embedUrl"
    class="note-youtube-node__frame-wrapper"
    contenteditable="false"
    >
        <iframe
        class="note-youtube-node__frame"
        :class="{ 'note-youtube-node__frame--interactive': selected }"
        :src="embedUrl"
        :title="node.attrs.title || 'YouTube video'"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
        />
        <button
        v-if="!selected"
        type="button"
        class="note-youtube-node__selection-scrim"
        aria-label="Select video"
        @click.stop.prevent="selectNode"
        @pointerdown.stop.prevent="selectNode"
        />
    </div>

    <div v-else class="note-youtube-node__invalid text-medium-emphasis">
        Invalid YouTube URL
    </div>
</node-view-wrapper>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'

const VIDEO_MUTATION_EVENT = 'lumos-note-video-mutation'

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
    minWidth: props.extension.options.resize?.minWidth || 240,
    maxWidth: props.extension.options.resize?.maxWidth || null,
}))

const currentWidth = computed(() => liveWidth.value ?? props.node.attrs.width ?? null)

const wrapperStyle = computed(() => {
    const width = currentWidth.value
    const align = props.node.attrs.align || 'center'
    const styles = {
        width: width ? `${width}px` : '640px',
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
    window.dispatchEvent(new CustomEvent(VIDEO_MUTATION_EVENT))
}

const getEmbedUrl = (source) => {
    try {
        if (!source) {
            return null
        }

        if (source.includes('/embed/')) {
            return source
        }

        const url = new URL(source)
        const hostname = url.hostname.replace(/^www\./, '')
        const pathSegments = url.pathname.split('/').filter(Boolean)

        let id = null
        let isPlaylist = false

        if (url.searchParams.has('v')) {
            id = url.searchParams.get('v')
        } else if (hostname === 'youtu.be') {
            id = pathSegments.at(-1) || null
        } else if (url.pathname.includes('/shorts/') || url.pathname.includes('/live/')) {
            id = pathSegments.at(-1) || null
        }

        if (!id && url.searchParams.has('list')) {
            id = url.searchParams.get('list')
            isPlaylist = true
        }

        if (!id) {
            return null
        }

        const embedUrl = new URL(
            isPlaylist
                ? `https://www.youtube-nocookie.com/embed/videoseries?list=${id}`
                : `https://www.youtube-nocookie.com/embed/${id}`
        )

        const start = url.searchParams.get('t')?.replace(/s$/u, '') || url.searchParams.get('start')

        if (start) {
            embedUrl.searchParams.set('start', start)
        }

        embedUrl.searchParams.set('modestbranding', '1')

        return embedUrl.toString()
    } catch {
        return null
    }
}

const embedUrl = computed(() => getEmbedUrl(props.node.attrs.src))

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
.note-youtube-node {
    position: relative;
    display: block;
    margin: 1rem 0;
    max-width: 100%;
    overflow: hidden;
    border-radius: 16px;
    line-height: 0;
}

.note-youtube-node--selected {
    box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.72);
}

.note-youtube-node--resizing {
    box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.9);
}

.note-youtube-node__frame-wrapper {
    position: relative;
    width: 100%;
}

.note-youtube-node__frame {
    display: block;
    width: 100%;
    max-width: 100%;
    aspect-ratio: 16 / 9;
    border: 0;
    border-radius: 16px;
    background: #000;
    user-select: none;
    pointer-events: none;
}

.note-youtube-node__frame--interactive {
    pointer-events: auto;
}

.note-youtube-node__selection-scrim {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: 0;
    border-radius: 16px;
    background: transparent;
    cursor: default;
    z-index: 1;
}

.note-youtube-node__invalid {
    padding: 1rem;
    border: 1px dashed rgba(0, 0, 0, 0.2);
    border-radius: 12px;
    line-height: 1.4;
}

.note-youtube-node__toolbar {
    position: absolute;
    z-index: 2;
    display: flex;
}

.note-youtube-node__toolbar--single {
    min-width: 40px;
    min-height: 40px;
}

.note-youtube-node__toolbar--top-right {
    top: 10px;
    right: 10px;
}

.note-youtube-node__toolbar--bottom-center {
    left: 50%;
    transform: translateX(-50%);
    bottom: 10px;
}

.note-youtube-node__handle {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    cursor: ew-resize;
    touch-action: none;
    z-index: 2;
}

.note-youtube-node__handle :deep(.v-btn),
.note-youtube-node__handle :deep(.v-btn:hover),
.note-youtube-node__handle :deep(.v-btn__content),
.note-youtube-node__handle :deep(.v-icon) {
    cursor: ew-resize;
}

.note-youtube-node__handle--left {
    left: 10px;
}

.note-youtube-node__handle--right {
    right: 10px;
}
</style>
