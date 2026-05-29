<template>
    <node-view-wrapper
    ref="wrapperRef"
    class="position-relative d-block overflow-hidden rounded-lg my-4"
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
    class="youtube-embed-floating-control ma-2 border"
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
class="youtube-embed-floating-control d-flex align-center border ma-2"
>
<v-btn
v-for="control in alignmentControls"
:key="control.value"
:color="alignment === control.value ? 'primary' : undefined"
:icon="control.icon"
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
class="youtube-embed-resize-handle ma-2 border"
@pointerdown.stop.prevent="startResize($event)"
/>

<div
v-if="embedUrl"
class="position-relative bg-black rounded-lg overflow-hidden youtube-embed-frame-wrapper"
contenteditable="false"
>
<iframe
class="youtube-embed-frame position-absolute top-0 left-0 d-block w-100 h-100"
:src="embedUrl"
:title="node.attrs.title || 'YouTube video'"
:style="frameStyle"
allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
allowfullscreen
/>
<button
v-if="!selected"
type="button"
class="position-absolute top-0 left-0 w-100 h-100 pa-0 ma-0 border-0 bg-transparent youtube-embed-selection-scrim"
@click.stop.prevent="selectNode"
@pointerdown.stop.prevent="selectNode"
/>
</div>

<div
v-else
class="youtube-embed-frame-wrapper youtube-embed-invalid-frame d-flex align-center justify-center"
contenteditable="false"
>
<v-card
class="youtube-embed-invalid-alert d-flex align-center justify-center text-center"
color="error"
variant="tonal"
rounded="lg"
height="100%"
>
<v-card-text class="d-flex flex-column align-center ga-2 pa-4">
    <v-icon
    icon="ph-warning"
    size="32"
    />
    <div class="text-title-large">Invalid YouTube URL</div>
    <div class="text-body-medium">Please check the URL and try again.</div>
</v-card-text>
</v-card>
</div>
</node-view-wrapper>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { getEmbedUrlFromYoutubeUrl } from '@tiptap/extension-youtube'

const VIDEO_MUTATION_EVENT = 'lumos-note-video-mutation'
const VIDEO_ASPECT_RATIO = 16 / 9

const props = defineProps(nodeViewProps)

const wrapperRef = ref(null)
const isResizing = ref(false)
const isCommittingResize = ref(false)
const liveWidth = ref(null)
const fallbackWidthPercent = ref(null)
const parentWidth = ref(null)
const resizeState = ref(null)
let resizeObserver = null

const alignmentControls = [
{ value: 'left', icon: 'ph-text-align-left' },
{ value: 'center', icon: 'ph-text-align-center' },
{ value: 'right', icon: 'ph-text-align-right' },
]

const resizeOptions = computed(() => ({
    enabled: props.extension.options.resize?.enabled !== false,
    minWidth: props.extension.options.resize?.minWidth || 240,
    maxWidth: props.extension.options.resize?.maxWidth || null,
}))

const alignment = computed(() => props.node.attrs.align || 'center')
const currentWidth = computed(() => liveWidth.value ?? props.node.attrs.width ?? 640)
const configuredWidth = computed(() => props.extension.options.width || 640)
const toWidthNumber = (width) => {
    const value = Number.parseFloat(width)
    
    return Number.isFinite(value) ? value : null
}
const usesDefaultWidth = computed(
() => (!liveWidth.value && (!props.node.attrs.width || toWidthNumber(props.node.attrs.width) === toWidthNumber(configuredWidth.value))
))
const widthPercent = computed(() => {
    const savedPercent = toWidthNumber(props.node.attrs.widthPercent)
    
    if (savedPercent) {
        return savedPercent
    }
    
    return fallbackWidthPercent.value
})

// Wrapper style dynamically adjusts based on alignment, width, and selection state.
// Add a box shadow when selected or resizing for better visibility.
const wrapperStyle = computed(() => {
    const margin = {
        left: { marginLeft: 0, marginRight: 'auto' },
        right: { marginLeft: 'auto', marginRight: 0 },
        center: { marginLeft: 'auto', marginRight: 'auto' },
    }[alignment.value] || { marginLeft: 'auto', marginRight: 'auto' }
    
    return {
        width: getWrapperWidth(),
        maxWidth: '100%',
        lineHeight: 0,
        boxShadow: props.selected || isResizing.value
        ? `0 0 0 2px rgba(var(--v-theme-primary), ${isResizing.value ? 0.9 : 0.72})`
        : undefined,
        ...margin,
    }
})

const frameStyle = computed(() => ({
    border: 0,
    pointerEvents: props.selected ? 'auto' : 'none',
    userSelect: 'none',
}))

const getWrapperElement = () => wrapperRef.value?.$el || wrapperRef.value || null
const emitMutation = () => window.dispatchEvent(new CustomEvent(VIDEO_MUTATION_EVENT))
const getContentBoxWidth = (element) => {
    if (!element) {
        return 0
    }
    
    const style = window.getComputedStyle(element)
    const horizontalPadding = (Number.parseFloat(style.paddingLeft) || 0) + (Number.parseFloat(style.paddingRight) || 0)
    
    return Math.max(0, element.clientWidth - horizontalPadding)
}
const getParentWidth = (wrapperElement = getWrapperElement()) => getContentBoxWidth(wrapperElement?.parentElement)
const getFallbackWidthPercent = () => {
    const savedWidth = toWidthNumber(props.node.attrs.width)
    
    if (!savedWidth || usesDefaultWidth.value || !parentWidth.value) {
        return null
    }
    
    return Math.min(100, (savedWidth / parentWidth.value) * 100)
}
const captureFallbackWidthPercent = () => {
    if (fallbackWidthPercent.value) {
        return
    }
    
    fallbackWidthPercent.value = getFallbackWidthPercent()
}
const persistFallbackWidthPercent = () => {
    if (props.node.attrs.widthPercent) {
        return
    }
    
    const nextWidthPercent = getFallbackWidthPercent()
    
    if (!nextWidthPercent) {
        return
    }
    
    props.updateAttributes({ widthPercent: nextWidthPercent.toFixed(4) })
}
const getWrapperWidth = () => {
    if (liveWidth.value) {
        return `${liveWidth.value}px`
    }
    
    if (usesDefaultWidth.value) {
        return '100%'
    }
    
    if (widthPercent.value) {
        return `${Math.min(Math.max(widthPercent.value, 1), 100)}%`
    }
    
    return `${currentWidth.value}px`
}

const getStartAt = (source) => {
    try {
        const url = new URL(source)
        const start = url.searchParams.get('t')?.replace(/s$/u, '') || url.searchParams.get('start')
        const startAt = Number.parseInt(start, 10)
        
        return Number.isFinite(startAt) ? startAt : undefined
    } catch {
        return undefined
    }
}

const getEmbedUrl = (source) => {
    if (!source) {
        return null
    }
    
    return getEmbedUrlFromYoutubeUrl({
        url: source,
        controls: props.extension.options.controls !== false,
        modestBranding: props.extension.options.modestBranding !== false,
        nocookie: props.extension.options.nocookie !== false,
        startAt: getStartAt(source),
    })
}

const embedUrl = computed(() => getEmbedUrl(props.node.attrs.src))

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

const getMaxWidth = (wrapperElement) => Math.max(
resizeOptions.value.minWidth,
Math.min(
resizeOptions.value.maxWidth || Infinity,
getParentWidth(wrapperElement) || Infinity
)
)

const clampWidth = (width, wrapperElement) => Math.min(
Math.max(width, resizeOptions.value.minWidth),
getMaxWidth(wrapperElement)
)

const selectNode = () => {
    const position = props.getPos?.()
    
    if (typeof position === 'number') {
        props.editor.chain().focus().setNodeSelection(position).run()
    }
}

const cleanupResize = ({ clearLiveWidth = true } = {}) => {
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', stopResize)
    window.removeEventListener('pointercancel', stopResize)
    resizeState.value = null
    isResizing.value = false
    
    if (clearLiveWidth) {
        liveWidth.value = null
    }
}

const stopResize = async () => {
    if (!resizeState.value) {
        return
    }
    
    const nextWidth = Math.round(liveWidth.value || resizeState.value.startWidth)
    const previousWidth = props.node.attrs.width || null
    const nextWidthPercent = resizeState.value.parentWidth
    ? Math.min(100, (nextWidth / resizeState.value.parentWidth) * 100)
    : null
    
    isCommittingResize.value = true
    cleanupResize({ clearLiveWidth: false })
    
    if (nextWidth && nextWidth !== previousWidth) {
        props.updateAttributes({
            width: nextWidth,
            widthPercent: nextWidthPercent ? nextWidthPercent.toFixed(4) : null,
        })
        emitMutation()
    }
    
    await nextTick()
    isCommittingResize.value = false
    liveWidth.value = null
}

const handlePointerMove = (event) => {
    if (!resizeState.value) {
        return
    }
    
    const deltaX = event.clientX - resizeState.value.startX
    const deltaY = event.clientY - resizeState.value.startY
    const projectedDelta = (
    deltaX + (deltaY / VIDEO_ASPECT_RATIO)
    ) / (1 + (1 / VIDEO_ASPECT_RATIO ** 2))
    
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
    
    const widthFromDom = Math.round(wrapperElement.getBoundingClientRect().width)
    
    selectNode()
    isResizing.value = true
    liveWidth.value = clampWidth(
    widthFromDom || props.node.attrs.width || resizeOptions.value.minWidth,
    wrapperElement
    )
    resizeState.value = {
        parentWidth: getParentWidth(wrapperElement),
        startX: event.clientX,
        startY: event.clientY,
        startWidth: liveWidth.value,
        wrapperElement,
    }
    
    event.currentTarget?.setPointerCapture?.(event.pointerId)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopResize)
    window.addEventListener('pointercancel', stopResize)
}

watch(() => props.node.attrs.width, () => {
    if (!isResizing.value && !isCommittingResize.value) {
        liveWidth.value = null
    }
})

onMounted(async () => {
    await nextTick()
    
    const parentElement = getWrapperElement()?.parentElement
    
    if (!parentElement) {
        return
    }
    
    parentWidth.value = getContentBoxWidth(parentElement)
    captureFallbackWidthPercent()
    persistFallbackWidthPercent()
    resizeObserver = new ResizeObserver(([entry]) => {
        parentWidth.value = entry.contentRect.width
    })
    resizeObserver.observe(parentElement)
})

onBeforeUnmount(() => {
    cleanupResize()
    resizeObserver?.disconnect()
})
</script>

<style scoped>
.youtube-embed-floating-control {
    z-index: 2;
}

.youtube-embed-resize-handle {
    z-index: 2;
    cursor: nwse-resize;
    touch-action: none;
}

.youtube-embed-frame-wrapper {
    aspect-ratio: 16 / 9;
    width: 100%;
}

.youtube-embed-invalid-frame {
    line-height: normal;
}

.youtube-embed-invalid-alert {
    width: 100%;
}

.youtube-embed-selection-scrim {
    inset: 0;
    cursor: default;
    z-index: 1;
}
</style>
