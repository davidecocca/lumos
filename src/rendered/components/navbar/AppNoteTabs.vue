<template>
    <div
        v-if="tabsStore.tabs.length"
        class="app-note-tabs no-drag d-flex align-center"
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
            <v-slide-group-item
                v-for="(tab, index) in tabsStore.tabs"
                :key="tab.id"
                :value="tab.id"
            >
                <v-chip
                    closable
                    close-icon="ph-x"
                    :close-label="`Close ${tab.title}`"
                    :variant="
                        tab.id === tabsStore.activeNoteId ? 'tonal' : 'text'
                    "
                    density="comfortable"
                    rounded="lg"
                    class="app-note-tabs__chip text-none flex-shrink-0 mr-1"
                    :class="{
                        'app-note-tabs__chip--moving': draggedTabId !== null,
                        'app-note-tabs__chip--dragging cursor-grabbing':
                            draggedTabId === tab.id && !settling,
                        'position-relative bg-surface elevation-2':
                            draggedTabId === tab.id,
                    }"
                    :style="tabStyle(index)"
                    @pointerdown="startDrag($event, index)"
                    @lostpointercapture="cancelDrag"
                    @dragstart.prevent
                    @click="activateTab(tab.id)"
                    @click:close.stop="closeTab(tab.id)"
                    @contextmenu.prevent.stop="openTabMenu($event, tab.id)"
                >
                    <span class="text-truncate">{{ tab.title }}</span>
                    <template #close>
                        <v-icon icon="ph-x" size="14" />
                    </template>
                </v-chip>
                <v-divider
                    v-if="index < tabsStore.tabs.length - 1"
                    vertical
                    length="14"
                    class="align-self-center mr-1"
                    :opacity="
                        draggedTabId !== null ||
                        tab.id === tabsStore.activeNoteId ||
                        tabsStore.tabs[index + 1].id === tabsStore.activeNoteId
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
            min-width="200"
        >
            <v-list density="compact" rounded="lg" class="px-1 py-2">
                <v-list-item
                    v-for="action in tabMenuActions"
                    :key="action.value"
                    :title="action.title"
                    rounded="lg"
                    :disabled="action.disabled"
                    @click="closeFromMenu(action.value)"
                />
            </v-list>
        </v-menu>
    </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTabsStore } from '../../stores/tabsStore';

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
    if (event.target.closest('.v-chip__close') || tabsStore.tabs.length < 2)
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
            root.querySelectorAll('.app-note-tabs__chip'),
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
.app-note-tabs {
    flex: 1 1 auto;
    min-width: 0;
    height: 100%;
    margin-left: 12px;
}

.app-note-tabs__scroller {
    min-width: 0;
}

.app-note-tabs__chip {
    width: 180px;
    min-width: 180px;
    max-width: 180px;
    justify-content: space-between;
    touch-action: pan-y;
}

.app-note-tabs__chip :deep(.v-chip__content) {
    min-width: 0;
    overflow: hidden;
}

.app-note-tabs__chip--moving {
    transition: transform 160ms ease;
}

.app-note-tabs__chip--dragging {
    transition: none;
}

@media (prefers-reduced-motion: reduce) {
    .app-note-tabs__chip--moving {
        transition: none;
    }
}
</style>
