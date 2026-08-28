<template>
    <node-view-wrapper
        ref="wrapperRef"
        class="position-relative d-block overflow-hidden rounded-lg my-4"
        :style="wrapperStyle"
        @click.stop="selectNode"
    >
        <CommonOverlayControls
            :selected="selected"
            :alignment="alignment"
            :show-resize-handle="showResizeHandle"
            delete-label="Remove video"
            resize-label="Resize video"
            @delete="handleDelete"
            @update:alignment="updateAlignment"
            @resize-start="startResize"
        />

        <div
            v-if="embedUrl"
            class="position-relative bg-black rounded-lg overflow-hidden youtube-embed-frame-wrapper"
            contenteditable="false"
            :style="frameWrapperStyle"
        >
            <iframe
                class="youtube-embed-frame position-absolute top-0 left-0 d-block w-100 h-100"
                :src="embedUrl"
                :title="node.attrs.title || 'YouTube video'"
                :style="frameStyle"
                allow="
                    accelerometer;
                    autoplay;
                    clipboard-write;
                    encrypted-media;
                    gyroscope;
                    picture-in-picture;
                    web-share;
                "
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

        <!-- Fallback UI for invalid URLs -->
        <div
            v-else
            class="youtube-embed-frame-wrapper youtube-embed-invalid-frame d-flex align-center justify-center"
            contenteditable="false"
            :style="frameWrapperStyle"
        >
            <v-card
                class="youtube-embed-invalid-alert d-flex align-center justify-center text-center"
                color="error"
                variant="tonal"
                rounded="lg"
                height="100%"
            >
                <v-card-text class="d-flex flex-column align-center ga-2 pa-4">
                    <v-icon icon="ph-warning" size="32" />
                    <div class="text-title-large">Invalid YouTube URL</div>
                    <div class="text-body-medium">
                        Please check the URL and try again.
                    </div>
                </v-card-text>
            </v-card>
        </div>
    </node-view-wrapper>
</template>

<script setup>
import CommonOverlayControls from '../../overlay-controls/CommonOverlayControls.vue';

import {
    computed,
    nextTick,
    onBeforeUnmount,
    onMounted,
    ref,
    watch,
} from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { getEmbedUrlFromYoutubeUrl } from '@tiptap/extension-youtube';

const VIDEO_MUTATION_EVENT = 'lumos-note-video-mutation';
const VIDEO_ASPECT_RATIO = 16 / 9;

const props = defineProps(nodeViewProps);

// State
const wrapperRef = ref(null); // DOM wrapper around the embed
const isResizing = ref(false); // true while dragging resize handle
const isCommittingResize = ref(false); // true while persisted resize attrs settle
const liveWidth = ref(null); // temporary width during drag
const fallbackWidthPercent = ref(null); // responsive width derived from saved pixel width
const parentWidth = ref(null); // current parent content width
const resizeState = ref(null); // drag metadata: start pointer position, start width, aspect ratio, wrapper element.
let resizeObserver = null;

const getWrapperElement = () =>
    wrapperRef.value?.$el || wrapperRef.value || null;

const getContentBoxWidth = (element) => {
    if (!element) {
        return 0;
    }

    const style = window.getComputedStyle(element);
    const horizontalPadding =
        (Number.parseFloat(style.paddingLeft) || 0) +
        (Number.parseFloat(style.paddingRight) || 0);

    return Math.max(0, element.clientWidth - horizontalPadding);
};

// Derived values
const resizeOptions = computed(() => ({
    enabled: props.extension.options.resize?.enabled !== false,
    minWidth: props.extension.options.resize?.minWidth || 240,
    maxWidth: props.extension.options.resize?.maxWidth || null,
}));
const alignment = computed(() => props.node.attrs.align || 'center');
const currentWidth = computed(
    () => liveWidth.value ?? props.node.attrs.width ?? 640,
);
const configuredWidth = computed(() => props.extension.options.width || 640);
const configuredHeight = computed(() => props.extension.options.height || 360);
const toWidthNumber = (width) => {
    const value = Number.parseFloat(width);

    return Number.isFinite(value) ? value : null;
};
const configuredAspectRatio = computed(() => {
    const width = toWidthNumber(configuredWidth.value);
    const height = toWidthNumber(configuredHeight.value);

    if (!width || !height) {
        return VIDEO_ASPECT_RATIO;
    }

    return width / height;
});
const aspectRatio = computed(() => {
    const width =
        toWidthNumber(props.node.attrs.width) ||
        toWidthNumber(configuredWidth.value);
    const height =
        toWidthNumber(props.node.attrs.height) ||
        toWidthNumber(configuredHeight.value);

    if (!width || !height) {
        return configuredAspectRatio.value;
    }

    return width / height;
});
const usesDefaultWidth = computed(
    () =>
        !liveWidth.value &&
        (!props.node.attrs.width ||
            toWidthNumber(props.node.attrs.width) ===
                toWidthNumber(configuredWidth.value)),
);
const showResizeHandle = computed(
    () => props.selected && resizeOptions.value.enabled,
);
const widthPercent = computed(() => {
    const savedPercent = toWidthNumber(props.node.attrs.widthPercent);

    if (savedPercent) {
        return savedPercent;
    }

    return fallbackWidthPercent.value;
});
const wrapperStyle = computed(() => {
    const margin = {
        left: { marginLeft: 0, marginRight: 'auto' },
        right: { marginLeft: 'auto', marginRight: 0 },
        center: { marginLeft: 'auto', marginRight: 'auto' },
    }[alignment.value] || { marginLeft: 'auto', marginRight: 'auto' };

    return {
        width: getWrapperWidth(),
        maxWidth: '100%',
        lineHeight: 0,
        boxShadow:
            props.selected || isResizing.value
                ? `0 0 0 2px rgba(var(--v-theme-primary), ${isResizing.value ? 0.9 : 0.72})`
                : undefined,
        ...margin,
    };
});
const frameStyle = computed(() => ({
    border: 0,
    pointerEvents: props.selected ? 'auto' : 'none',
    userSelect: 'none',
}));
const frameWrapperStyle = computed(() => ({
    aspectRatio: `${aspectRatio.value}`,
}));
const getWrapperWidth = () => {
    if (liveWidth.value) {
        return `${liveWidth.value}px`;
    }

    if (usesDefaultWidth.value) {
        return '100%';
    }

    if (widthPercent.value) {
        return `${Math.min(Math.max(widthPercent.value, 1), 100)}%`;
    }

    return `${currentWidth.value}px`;
};
const embedUrl = computed(() => getEmbedUrl(props.node.attrs.src));

const emitMutation = () => {
    window.dispatchEvent(new CustomEvent(VIDEO_MUTATION_EVENT));
};

// Embed helpers
const getStartAt = (source) => {
    try {
        const url = new URL(source);
        const start =
            url.searchParams.get('t')?.replace(/s$/u, '') ||
            url.searchParams.get('start');
        const startAt = Number.parseInt(start, 10);

        return Number.isFinite(startAt) ? startAt : undefined;
    } catch {
        return undefined;
    }
};

const getEmbedUrl = (source) => {
    if (!source) {
        return null;
    }

    return getEmbedUrlFromYoutubeUrl({
        url: source,
        controls: props.extension.options.controls !== false,
        modestBranding: props.extension.options.modestBranding !== false,
        nocookie: props.extension.options.nocookie !== false,
        startAt: getStartAt(source),
    });
};

// Responsive width helpers
const getParentWidth = (wrapperElement = getWrapperElement()) =>
    getContentBoxWidth(wrapperElement?.parentElement);

const getFallbackWidthPercent = () => {
    const savedWidth = toWidthNumber(props.node.attrs.width);

    if (!savedWidth || usesDefaultWidth.value || !parentWidth.value) {
        return null;
    }

    return Math.min(100, (savedWidth / parentWidth.value) * 100);
};

const captureFallbackWidthPercent = () => {
    if (fallbackWidthPercent.value) {
        return;
    }

    fallbackWidthPercent.value = getFallbackWidthPercent();
};

const persistFallbackWidthPercent = () => {
    if (props.node.attrs.widthPercent) {
        return;
    }

    const nextWidthPercent = getFallbackWidthPercent();

    if (!nextWidthPercent) {
        return;
    }

    props.updateAttributes({ widthPercent: nextWidthPercent.toFixed(4) });
};

// Node actions
const selectNode = () => {
    const position = props.getPos?.();

    if (typeof position === 'number') {
        props.editor.chain().focus().setNodeSelection(position).run();
    }
};

const handleDelete = () => {
    props.deleteNode();
    emitMutation();
};

const updateAlignment = (align) => {
    if (!align || align === alignment.value) {
        return;
    }

    props.updateAttributes({ align });
    emitMutation();
};

// Enforces resize boundaries.
// This prevents the embed from being resized wider than its parent.
const getMaxWidth = (wrapperElement) => {
    const configuredMaxWidth = resizeOptions.value.maxWidth || Infinity;
    const domMaxWidth = getParentWidth(wrapperElement) || Infinity;

    return Math.max(
        resizeOptions.value.minWidth,
        Math.min(configuredMaxWidth, domMaxWidth),
    );
};

// Forces any proposed width into the valid range.
const clampWidth = (width, wrapperElement) => {
    const minWidth = resizeOptions.value.minWidth;
    const maxWidth = getMaxWidth(wrapperElement);

    return Math.min(Math.max(width, minWidth), maxWidth);
};

// Resize flow
// Captures initial size/position, selects node, starts global pointer listeners.
const startResize = (event) => {
    const wrapperElement = getWrapperElement();

    if (!wrapperElement) {
        return;
    }

    const widthFromDom = Math.round(
        wrapperElement.getBoundingClientRect().width,
    );

    selectNode();
    isResizing.value = true;
    liveWidth.value = clampWidth(
        widthFromDom || props.node.attrs.width || resizeOptions.value.minWidth,
        wrapperElement,
    );
    resizeState.value = {
        parentWidth: getParentWidth(wrapperElement),
        aspectRatio: aspectRatio.value,
        startX: event.clientX,
        startY: event.clientY,
        startWidth: liveWidth.value,
        wrapperElement,
    };

    event.currentTarget?.setPointerCapture?.(event.pointerId);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopResize);
    window.addEventListener('pointercancel', stopResize);
};

// Computes drag delta, preserves aspect ratio, updates liveWidth.
const handlePointerMove = (event) => {
    if (!resizeState.value) {
        return;
    }

    const deltaX = event.clientX - resizeState.value.startX;
    const deltaY = event.clientY - resizeState.value.startY;
    const aspectRatio = resizeState.value.aspectRatio || VIDEO_ASPECT_RATIO;
    const projectedDelta =
        (deltaX + deltaY / aspectRatio) / (1 + 1 / aspectRatio ** 2);

    liveWidth.value = clampWidth(
        resizeState.value.startWidth + projectedDelta,
        resizeState.value.wrapperElement,
    );
};

// Commits final width/height into node attrs, then emits mutation.
const stopResize = async () => {
    if (!resizeState.value) {
        return;
    }

    const nextWidth = Math.round(
        liveWidth.value || resizeState.value.startWidth,
    );
    const nextHeight = Math.round(nextWidth / resizeState.value.aspectRatio);
    const previousWidth = toWidthNumber(props.node.attrs.width);
    const previousHeight = toWidthNumber(props.node.attrs.height);
    const nextWidthPercent = resizeState.value.parentWidth
        ? Math.min(100, (nextWidth / resizeState.value.parentWidth) * 100)
        : null;

    isCommittingResize.value = true;
    cleanupResize({ clearLiveWidth: false });

    if (
        nextWidth &&
        (nextWidth !== previousWidth || nextHeight !== previousHeight)
    ) {
        props.updateAttributes({
            width: nextWidth,
            height: nextHeight,
            widthPercent: nextWidthPercent ? nextWidthPercent.toFixed(4) : null,
        });
        emitMutation();
    }

    await nextTick();
    isCommittingResize.value = false;
    liveWidth.value = null;
};

// Removes global listeners and clears temporary state.
const cleanupResize = ({ clearLiveWidth = true } = {}) => {
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', stopResize);
    window.removeEventListener('pointercancel', stopResize);
    resizeState.value = null;
    isResizing.value = false;

    if (clearLiveWidth) {
        liveWidth.value = null;
    }
};

watch(
    () => props.node.attrs.width,
    () => {
        if (!isResizing.value && !isCommittingResize.value) {
            liveWidth.value = null;
        }
    },
);

onMounted(async () => {
    await nextTick();

    const parentElement = getWrapperElement()?.parentElement;

    if (!parentElement) {
        return;
    }

    parentWidth.value = getContentBoxWidth(parentElement);
    captureFallbackWidthPercent();
    persistFallbackWidthPercent();
    resizeObserver = new ResizeObserver(([entry]) => {
        parentWidth.value = entry.contentRect.width;
    });
    resizeObserver.observe(parentElement);
});

onBeforeUnmount(() => {
    cleanupResize();
    resizeObserver?.disconnect();
});
</script>

<style scoped>
.youtube-embed-frame-wrapper {
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
