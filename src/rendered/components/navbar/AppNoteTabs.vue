<template>
    <div
        v-if="tabsStore.tabs.length"
        class="app-note-tabs d-flex align-center"
        @click.capture="suppressDragClick"
    >
        <v-slide-group
            ref="scroller"
            :model-value="tabsStore.activeNoteId"
            show-arrows
            class="app-note-tabs__scroller flex-grow-1"
            role="tablist"
            aria-label="Open notes"
        >
            <template #prev>
                <v-icon icon="ph-caret-left" size="x-small" />
            </template>
            <template #next>
                <v-icon icon="ph-caret-right" size="x-small" />
            </template>
            <v-divider
                vertical
                length="14"
                class="app-note-tabs__leading-divider align-self-center ml-0"
                :opacity="
                    draggedTabId !== null ||
                    tabsStore.tabs[0].id === tabsStore.activeNoteId
                        ? 0
                        : 0.16
                "
            />
            <v-slide-group-item
                v-for="(tab, index) in tabsStore.tabs"
                :key="tab.id"
                :value="tab.id"
            >
                <div
                    class="app-note-tabs__tab no-drag"
                    :class="{
                        'app-note-tabs__tab--active':
                            tab.id === tabsStore.activeNoteId,
                        'app-note-tabs__tab--moving': draggedTabId !== null,
                        'app-note-tabs__tab--dragging cursor-grabbing':
                            draggedTabId === tab.id && !settling,
                        'position-relative bg-surface elevation-2':
                            draggedTabId === tab.id,
                    }"
                    :style="tabStyle(index)"
                    @pointerdown="startDrag($event, index)"
                    @lostpointercapture="cancelDrag"
                    @dragstart.prevent
                    @contextmenu.prevent.stop="openTabMenu($event, tab.id)"
                >
                    <button
                        type="button"
                        role="tab"
                        :aria-selected="tab.id === tabsStore.activeNoteId"
                        :title="tab.title"
                        class="app-note-tabs__label text-truncate"
                        @click="activateTab(tab.id)"
                    >
                        {{ tab.title }}
                    </button>
                    <v-btn
                        icon
                        variant="text"
                        size="24"
                        rounded="lg"
                        class="app-note-tabs__close"
                        :aria-label="`Close ${tab.title}`"
                        @click.stop="closeTab(tab.id)"
                    >
                        <v-icon icon="ph-x" size="14" />
                    </v-btn>
                </div>
                <v-divider
                    vertical
                    length="14"
                    class="align-self-center"
                    :opacity="
                        draggedTabId !== null ||
                        tab.id === tabsStore.activeNoteId ||
                        tabsStore.tabs[index + 1]?.id === tabsStore.activeNoteId
                            ? 0
                            : 0.16
                    "
                />
            </v-slide-group-item>
        </v-slide-group>
        <v-menu
            v-model="tabMenuOpen"
            :target="tabMenuPosition"
            location="bottom start"
            scroll-strategy="close"
        >
            <v-list density="compact" rounded="lg" class="px-1 py-2">
                <v-list-item
                    v-for="action in tabMenuActions"
                    :key="action.value"
                    :title="action.title"
                    rounded="lg"
                    :disabled="action.disabled"
                    @click="closeFromMenu(action.value)"
                >
                    <template #append>
                        <span
                            class="app-note-tabs__shortcut text-medium-emphasis text-caption"
                        >
                            {{
                                action.value === 'current'
                                    ? formatShortcut('cmd+w')
                                    : ''
                            }}
                        </span>
                    </template>
                </v-list-item>
            </v-list>
        </v-menu>
    </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTabsStore } from '../../stores/tabsStore';
import { formatShortcut } from '../../utils/shortcuts';

const router = useRouter();
const route = useRoute();
const tabsStore = useTabsStore();
const scroller = ref(null);
const draggedTabId = ref(null);
const targetIndex = ref(-1);
const dragOffset = ref(0);
const settling = ref(false);
const tabMenuOpen = ref(false);
const tabMenuPosition = ref([0, 0]);
const tabMenuNoteId = ref(null);
const tabMenuIndex = computed(() =>
    tabsStore.tabs.findIndex((tab) => tab.id === tabMenuNoteId.value),
);
const tabMenuActions = computed(() => [
    { title: 'Close', value: 'current', disabled: false },
    {
        title: 'Close others',
        value: 'others',
        disabled: tabsStore.tabs.length < 2,
    },
    {
        title: 'Close to the right',
        value: 'right',
        disabled: tabMenuIndex.value >= tabsStore.tabs.length - 1,
    },
    { title: 'Close all', value: 'all', disabled: false },
]);
let drag = null;
let scrollFrame = null;
let settleTimer = null;
let suppressClick = false;

const resetDrag = () => {
    cancelAnimationFrame(scrollFrame);
    clearTimeout(settleTimer);
    const previous = drag;
    drag = null;
    draggedTabId.value = null;
    targetIndex.value = -1;
    dragOffset.value = 0;
    settling.value = false;
    if (previous?.element.hasPointerCapture(previous.pointerId)) {
        previous.element.releasePointerCapture(previous.pointerId);
    }
    window.removeEventListener('pointermove', moveDrag);
    window.removeEventListener('pointerup', finishDrag);
    window.removeEventListener('pointercancel', cancelDrag);
    window.removeEventListener('keydown', onDragKeydown);
    window.removeEventListener('blur', cancelDrag);
    window.removeEventListener('resize', cancelDrag);
};

const tabStyle = (index) => {
    if (draggedTabId.value === null || !drag) return undefined;
    let offset = 0;
    if (index === drag.index) {
        offset = dragOffset.value;
    } else if (index > drag.index && index <= targetIndex.value) {
        offset = drag.positions[index - 1] - drag.positions[index];
    } else if (index < drag.index && index >= targetIndex.value) {
        offset = drag.positions[index + 1] - drag.positions[index];
    }
    return {
        transform: `translateX(${offset}px)`,
        zIndex: index === drag.index ? 1 : undefined,
    };
};

const updatePreview = () => {
    const { container, positions, index, width } = drag;
    const bounds = container.getBoundingClientRect();
    // Keep the real tab inside the viewport, including while edge-scrolling.
    const left = Math.max(
        bounds.left,
        Math.min(drag.clientX - drag.grabOffset, bounds.right - width),
    );
    const position = Math.max(
        positions[0],
        Math.min(
            left - bounds.left + container.scrollLeft,
            positions[positions.length - 1],
        ),
    );
    dragOffset.value = position - positions[index];
    targetIndex.value = positions.reduce(
        (nearest, slot, candidate) =>
            Math.abs(slot - position) < Math.abs(positions[nearest] - position)
                ? candidate
                : nearest,
        0,
    );
};

const scrollWhileDragging = (time) => {
    if (!drag || settling.value) return;
    const bounds = drag.container.getBoundingClientRect();
    const direction =
        drag.clientX < bounds.left + 36
            ? -1
            : drag.clientX > bounds.right - 36
              ? 1
              : 0;
    const elapsed = Math.min(time - (drag.lastFrame ?? time), 32);
    drag.lastFrame = time;
    drag.container.scrollLeft += direction * elapsed * 0.5;
    updatePreview();
    scrollFrame = requestAnimationFrame(scrollWhileDragging);
};

const startDrag = (event, index) => {
    if (drag || !event.isPrimary || event.button !== 0) return;
    suppressClick = false;
    if (
        event.target.closest('.app-note-tabs__close') ||
        tabsStore.tabs.length < 2
    )
        return;
    const root = scroller.value.$el;
    const container = root.querySelector('.v-slide-group__container');
    if (!container) return;
    const bounds = container.getBoundingClientRect();
    const tabBounds = event.currentTarget.getBoundingClientRect();
    drag = {
        index,
        pointerId: event.pointerId,
        element: event.currentTarget,
        container,
        startX: event.clientX,
        clientX: event.clientX,
        grabOffset: event.clientX - tabBounds.left,
        width: tabBounds.width,
        positions: Array.from(
            root.querySelectorAll('.app-note-tabs__tab'),
            (element) =>
                element.getBoundingClientRect().left -
                bounds.left +
                container.scrollLeft,
        ),
    };
    window.addEventListener('pointermove', moveDrag, { passive: false });
    window.addEventListener('pointerup', finishDrag);
    window.addEventListener('pointercancel', cancelDrag);
    window.addEventListener('keydown', onDragKeydown);
    window.addEventListener('blur', cancelDrag);
    window.addEventListener('resize', cancelDrag);
};

const moveDrag = (event) => {
    if (!drag || settling.value || event.pointerId !== drag.pointerId) return;
    drag.clientX = event.clientX;
    if (draggedTabId.value === null) {
        if (Math.abs(event.clientX - drag.startX) < 5) return;
        draggedTabId.value = tabsStore.tabs[drag.index].id;
        suppressClick = true;
        drag.element.setPointerCapture(drag.pointerId);
        scrollFrame = requestAnimationFrame(scrollWhileDragging);
    }
    event.preventDefault();
    updatePreview();
};

const settleDrag = (commit) => {
    if (!drag || settling.value) return;
    if (draggedTabId.value === null) {
        resetDrag();
        return;
    }
    cancelAnimationFrame(scrollFrame);
    settling.value = true;
    const destination = commit ? targetIndex.value : drag.index;
    targetIndex.value = destination;
    dragOffset.value = drag.positions[destination] - drag.positions[drag.index];
    // Commit after settling so the keyed DOM reorder has no visible jump.
    settleTimer = setTimeout(
        () => {
            const noteId = draggedTabId.value;
            const targetId = tabsStore.tabs[destination]?.id;
            const after = destination > drag.index;
            resetDrag();
            if (commit && targetId !== undefined)
                tabsStore.moveTab(noteId, targetId, after);
        },
        window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 160,
    );
};

const finishDrag = (event) => {
    if (!drag || settling.value || event.pointerId !== drag.pointerId) return;
    if (draggedTabId.value !== null) {
        drag.clientX = event.clientX;
        updatePreview();
    }
    settleDrag(true);
};

const cancelDrag = (event) => {
    if (event?.pointerId !== undefined && event.pointerId !== drag?.pointerId)
        return;
    settleDrag(false);
};

const onDragKeydown = (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    cancelDrag();
};

const suppressDragClick = (event) => {
    if (!suppressClick || event.detail === 0) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClick = false;
};

watch(
    () => tabsStore.tabs.map((tab) => tab.id),
    () => {
        resetDrag();
        if (tabMenuIndex.value === -1) tabMenuOpen.value = false;
    },
);
onBeforeUnmount(resetDrag);

const openTabMenu = (event, noteId) => {
    resetDrag();
    suppressClick = false;
    tabMenuNoteId.value = noteId;
    tabMenuPosition.value = [event.clientX, event.clientY];
    tabMenuOpen.value = true;
};

const closeFromMenu = async (action) => {
    tabMenuOpen.value = false;
    if (tabMenuIndex.value === -1) return;
    const noteIds = tabsStore.tabs
        .filter((tab, index) => {
            if (action === 'current') return tab.id === tabMenuNoteId.value;
            if (action === 'others') return tab.id !== tabMenuNoteId.value;
            if (action === 'right') return index > tabMenuIndex.value;
            return action === 'all';
        })
        .map((tab) => tab.id);
    tabsStore.closeNotes(noteIds);

    if (!tabsStore.tabs.length && route.name === 'notes') {
        await router.push({ name: 'home' });
    }
};

const activateTab = async (noteId) => {
    if (draggedTabId.value !== null) return;
    tabsStore.activateNote(noteId);
    await router.push({ name: 'notes', params: { noteId } });
};

const closeTab = async (noteId) => {
    tabsStore.closeNote(noteId);

    if (!tabsStore.tabs.length && route.name === 'notes') {
        await router.push({ name: 'home' });
    }
};
</script>

<style scoped>
/* Keep horizontal clipping in the slide group, but allow the tab to cover the toolbar border. */
:global(.v-toolbar__content:has(.app-note-tabs)) {
    overflow: visible;
}

.app-note-tabs {
    flex: 1 1 auto;
    min-width: 0;
    /* Extend over the app bar's bottom border so the active tab opens onto the note. */
    height: calc(100% + 2px);
    margin-bottom: -2px;
}

.app-note-tabs__scroller {
    min-width: 0;
    height: 100%;
}

.app-note-tabs__leading-divider {
    /* Keep the separator inside the scroller without shifting the first tab. */
    flex: 0 0 auto;
    margin-right: -1px;
}

.app-note-tabs__scroller :deep(.v-slide-group__prev),
.app-note-tabs__scroller :deep(.v-slide-group__next) {
    -webkit-app-region: no-drag;
}

.app-note-tabs__shortcut {
    width: 56px;
    text-align: end;
}

.app-note-tabs__tab {
    position: relative;
    display: flex;
    align-items: center;
    flex: 0 0 190px;
    min-width: 0;
    height: 100%;
    padding: 0 10px 2px 14px;
    gap: 8px;
    touch-action: pan-y;
    user-select: none;
    color: rgba(var(--v-theme-on-nav-background), 0.65);
}

.app-note-tabs__tab::before {
    content: '';
    position: absolute;
    inset: 3px 0 0;
    border: 1px solid transparent;
    border-bottom: 0;
    border-radius: 3px 3px 0 0;
    pointer-events: none;
}

.app-note-tabs__tab:hover::before {
    background: rgba(var(--v-theme-on-nav-background), 0.04);
}

.app-note-tabs__tab--active {
    color: rgb(var(--v-theme-on-background));
}

.app-note-tabs__tab--active::before {
    background: rgb(var(--v-theme-background));
    border-color: rgba(var(--v-border-color), var(--v-border-opacity));
}

.v-theme--light .app-note-tabs__tab--active::before {
    border-color: rgba(var(--v-border-color), 0.14);
}

.app-note-tabs__tab--active:hover::before {
    background: rgb(var(--v-theme-background));
}

.app-note-tabs__label {
    appearance: none;
    background: transparent;
    border: 0;
    border-radius: 0;
    padding: 0;
    position: relative;
    flex: 1 1 auto;
    min-width: 0;
    height: 100%;
    font: inherit;
    font-size: 14px;
    color: inherit;
    text-align: start;
    cursor: pointer;
}

.app-note-tabs__label:focus-visible {
    outline: 2px solid rgb(var(--v-theme-primary));
    outline-offset: -4px;
    border-radius: 3px;
}

.app-note-tabs__close {
    flex: 0 0 auto;
    opacity: 0;
}

.app-note-tabs__tab--active .app-note-tabs__close {
    opacity: 0.55;
}

.app-note-tabs__tab:hover .app-note-tabs__close,
.app-note-tabs__tab:focus-within .app-note-tabs__close {
    opacity: 1;
}

@media (hover: none) {
    .app-note-tabs__close {
        opacity: 1;
    }
}

.app-note-tabs__tab--moving {
    transition: transform 160ms ease;
}

.app-note-tabs__tab--dragging {
    transition: none;
}

@media (prefers-reduced-motion: reduce) {
    .app-note-tabs__tab--moving {
        transition: none;
    }
}
</style>
