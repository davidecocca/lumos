<template>
    <div v-if="overlayState.visible">
        <!-- Column controls -->
        <v-sheet
        class="table-overlay table-overlay--column d-flex align-center border"
        color="surface-dark"
        rounded="xl"
        @mousedown.stop.prevent
        @pointerenter="handleOverlayEnter"
        @mouseleave="handleOverlayLeave"
        :style="{
            top: `${overlayState.columnTop}px`,
            left: `${overlayState.columnLeft}px`,
        }"
        >
        <v-tooltip
        v-for="control in columnControls"
        :key="control.value"
        :text="control.label"
        location="top"
        >
        <template v-slot:activator="{ props }">
            <v-btn
            v-bind="props"
            :icon="control.icon"
            :color="getControlColor(control)"
            :aria-label="control.label"
            size="small"
            variant="text"
            :disabled="isControlDisabled(control)"
            @click.stop="runControl(control)"
            />
        </template>
    </v-tooltip>
</v-sheet>

<!-- Row controls -->
<v-sheet
class="table-overlay table-overlay--row d-flex flex-column align-center border"
color="surface-dark"
rounded="xl"
@mousedown.stop.prevent
@pointerenter="handleOverlayEnter"
@mouseleave="handleOverlayLeave"
:style="{
    top: `${overlayState.rowTop}px`,
    left: `${overlayState.rowLeft}px`,
}"
>
<v-tooltip
v-for="control in rowControls"
:key="control.value"
:text="control.label"
location="left"
>
<template v-slot:activator="{ props }">
    <v-btn
    v-bind="props"
    :icon="control.icon"
    :aria-label="control.label"
    :color="getControlColor(control)"
    size="small"
    variant="text"
    :disabled="isControlDisabled(control)"
    @click.stop="runControl(control)"
    />
</template>
</v-tooltip>
</v-sheet>

<!-- Table controls -->
<v-sheet
class="table-overlay table-overlay--table d-flex align-center border"
color="surface-dark"
rounded="xl"
@mousedown.stop.prevent
@pointerenter="handleOverlayEnter"
@mouseleave="handleOverlayLeave"
:style="{
    top: `${overlayState.tableTop}px`,
    left: `${overlayState.tableLeft}px`,
}"
>
<v-tooltip
v-for="control in tableControls"
:key="control.value"
:text="control.label"
location="top"
>
<template v-slot:activator="{ props }">
    <v-btn
    v-bind="props"
    :icon="control.icon"
    :aria-label="control.label"
    :color="getControlColor(control)"
    size="small"
    variant="text"
    :disabled="isControlDisabled(control)"
    @click.stop="runControl(control)"
    />
</template>
</v-tooltip>
</v-sheet>
</div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
    editor: {
        type: Object,
        default: null,
    },
    containerRef: {
        type: Object,
        default: null,
    },
})

// Position constants
const ROW_TOOLBAR_WIDTH = 40
const COLUMN_TOOLBAR_WIDTH = 120
const TABLE_TOOLBAR_WIDTH = 200
const ROW_TOOLBAR_LEFT_GAP = 8
const COLUMN_TOOLBAR_TOP_GAP = 6
const TABLE_TOOLBAR_BOTTOM_GAP = 4
const TOP_TOOLBAR_MIN_OFFSET = -72
const ROW_TOOLBAR_MIN_LEFT_OFFSET = -9
const COLUMN_TOOLBAR_HEIGHT = 40
const HOVER_RESET_DELAY_MS = 300

// Reactive state
const editorStateVersion = ref(0)
const hoveredCellElement = ref(null)
const hoveredTableElement = ref(null)
const hoverClearTimeoutId = ref(null)
const overlayState = ref({
    visible: false,
    columnTop: 0,
    columnLeft: 0,
    rowTop: 0,
    rowLeft: 0,
    tableTop: 0,
    tableLeft: 0,
})

// Control definitions
const columnControls = [
{
    value: 'add-column-before',
    icon: 'ph-columns-plus-left',
    label: 'Add column before',
    capability: 'addColumnBefore',
    command: (chain) => chain.addColumnBefore().run(),
},
{
    value: 'add-column-after',
    icon: 'ph-columns-plus-right',
    label: 'Add column after',
    capability: 'addColumnAfter',
    command: (chain) => chain.addColumnAfter().run(),
},
{
    value: 'delete-column',
    icon: 'ph-trash',
    label: 'Delete column',
    capability: 'deleteColumn',
    command: (chain) => chain.deleteColumn().run(),
},
]

const rowControls = [
{
    value: 'add-row-before',
    icon: 'ph-rows-plus-top',
    label: 'Add row before',
    capability: 'addRowBefore',
    command: (chain) => chain.addRowBefore().run(),
},
{
    value: 'add-row-after',
    icon: 'ph-rows-plus-bottom',
    label: 'Add row after',
    capability: 'addRowAfter',
    command: (chain) => chain.addRowAfter().run(),
},
{
    value: 'delete-row',
    icon: 'ph-trash',
    label: 'Delete row',
    capability: 'deleteRow',
    command: (chain) => chain.deleteRow().run(),
},
]

const tableControls = [
{
    value: 'toggle-header-row',
    icon: 'ph-rows',
    label: 'Toggle header row',
    capability: 'toggleHeaderRow',
    isActive: () => isHeaderRowActive.value,
    command: (chain) => chain.toggleHeaderRow().run(),
},
{
    value: 'toggle-header-column',
    icon: 'ph-columns',
    label: 'Toggle header column',
    capability: 'toggleHeaderColumn',
    isActive: () => isHeaderColumnActive.value,
    command: (chain) => chain.toggleHeaderColumn().run(),
},
{
    value: 'toggle-header-cell',
    icon: 'ph-table',
    label: 'Toggle header cell',
    capability: 'toggleHeaderCell',
    isActive: () => isHeaderCellActive.value,
    command: (chain) => chain.toggleHeaderCell().run(),
},
{
    value: 'merge-or-split',
    icon: 'ph-arrows-left-right',
    label: 'Merge or split cells',
    capability: 'mergeOrSplit',
    command: (chain) => chain.mergeOrSplit().run(),
},
{
    value: 'delete-table',
    icon: 'ph-trash',
    label: 'Delete table',
    capability: 'deleteTable',
    command: (chain) => chain.deleteTable().run(),
},
]

// Prevents overlay coordinates from going too far outside the editor container.
const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

// DOM lookup helpers - convert editor/table state into real DOM elements that the overlay can measure or inspect.
const getContainerElement = () => props.containerRef?.value || props.containerRef || null
const getEditorDom = (editorInstance = props.editor) => {
    if (!editorInstance) {
        return null
    }
    
    try {
        return editorInstance.view?.dom || null
    } catch {
        return null
    }
}
const getSelectionNodeElement = () => {
    const editorInstance = props.editor
    
    if (!editorInstance) {
        return null
    }
    
    const domAtSelection = editorInstance.view.domAtPos(editorInstance.state.selection.from)
    const domNode = domAtSelection.node?.nodeType === Node.TEXT_NODE
    ? domAtSelection.node.parentElement
    : domAtSelection.node
    
    return domNode instanceof Element ? domNode : null
}
const getActiveCellElement = () => (
getSelectionNodeElement()?.closest('td, th')
|| null
)
const getActiveTableElement = () => (
getActiveCellElement()?.closest('.tableWrapper, table')
|| null
)
const getHoveredCellElement = () => (
hoveredCellElement.value?.isConnected ? hoveredCellElement.value : null
)
const getHoveredTableElement = () => (
hoveredTableElement.value?.isConnected ? hoveredTableElement.value : null
)
const getInteractionCellElement = () => (
getHoveredCellElement()
|| getActiveCellElement()
)
const getInteractionTableElement = () => (
getHoveredTableElement()
|| getActiveTableElement()
)
const syncEditorState = () => {
    editorStateVersion.value += 1
    void nextTick(updateOverlayPosition)
}

// Hover state is bridged briefly so controls remain reachable from a hovered cell.
const clearPendingHoverReset = () => {
    if (hoverClearTimeoutId.value === null) {
        return
    }
    
    window.clearTimeout(hoverClearTimeoutId.value)
    hoverClearTimeoutId.value = null
}

const clearHoveredTableElements = () => {
    clearPendingHoverReset()
    
    if (!hoveredCellElement.value && !hoveredTableElement.value) {
        return
    }
    
    hoveredCellElement.value = null
    hoveredTableElement.value = null
    syncEditorState()
}

const scheduleHoverReset = () => {
    if (!hoveredCellElement.value && !hoveredTableElement.value) {
        return
    }
    
    clearPendingHoverReset()
    hoverClearTimeoutId.value = window.setTimeout(() => {
        hoverClearTimeoutId.value = null
        clearHoveredTableElements()
    }, HOVER_RESET_DELAY_MS)
}

const setHoveredTableElements = (cellElement) => {
    clearPendingHoverReset()
    hoveredCellElement.value = cellElement
    hoveredTableElement.value = cellElement?.closest('.tableWrapper, table') || null
    syncEditorState()
}

const handlePointerMove = (event) => {
    const targetElement = event.target instanceof Element ? event.target : null
    
    if (targetElement?.closest('.table-overlay')) {
        clearPendingHoverReset()
        return
    }
    
    const nextCellElement = targetElement?.closest('td, th') || null
    
    if (!nextCellElement) {
        if (targetElement && getHoveredTableElement()?.contains(targetElement)) {
            clearPendingHoverReset()
            return
        }
        
        scheduleHoverReset()
        return
    }
    
    if (nextCellElement === hoveredCellElement.value) {
        clearPendingHoverReset()
        return
    }
    
    setHoveredTableElements(nextCellElement)
}

const handlePointerLeave = (event) => {
    const relatedTarget = event.relatedTarget instanceof Element ? event.relatedTarget : null
    
    if (relatedTarget?.closest('.table-overlay')) {
        clearPendingHoverReset()
        return
    }
    
    clearHoveredTableElements()
}

const handleOverlayEnter = () => {
    clearPendingHoverReset()
}

const handleOverlayLeave = (event) => {
    const relatedTarget = event.relatedTarget instanceof Element ? event.relatedTarget : null
    const editorDom = getEditorDom()
    
    if (
    relatedTarget?.closest('.table-overlay')
    || editorDom?.contains(relatedTarget)
    ) {
        clearPendingHoverReset()
        return
    }
    
    clearHoveredTableElements()
}

// Editor listeners
const detachEditorListeners = (editorInstance) => {
    const editorDom = getEditorDom(editorInstance)
    
    if (!editorInstance) {
        return
    }
    
    editorInstance.off('selectionUpdate', syncEditorState)
    editorInstance.off('transaction', syncEditorState)
    editorInstance.off('focus', syncEditorState)
    editorInstance.off('blur', syncEditorState)
    editorDom?.removeEventListener('scroll', syncEditorState)
    editorDom?.removeEventListener('mousemove', handlePointerMove)
    editorDom?.removeEventListener('mouseleave', handlePointerLeave)
}

const attachEditorListeners = (editorInstance) => {
    const editorDom = getEditorDom(editorInstance)
    
    if (!editorInstance) {
        return
    }
    
    editorInstance.on('selectionUpdate', syncEditorState)
    editorInstance.on('transaction', syncEditorState)
    editorInstance.on('focus', syncEditorState)
    editorInstance.on('blur', syncEditorState)
    editorDom?.addEventListener('scroll', syncEditorState)
    editorDom?.addEventListener('mousemove', handlePointerMove)
    editorDom?.addEventListener('mouseleave', handlePointerLeave)
}

// Derived editor state
const canRun = (buildChain) => {
    editorStateVersion.value
    
    if (!props.editor) {
        return false
    }
    
    try {
        return Boolean(buildChain(props.editor.can().chain().focus()))
    } catch (error) {
        return false
    }
}

const tableCapabilities = computed(() => ({
    addColumnBefore: canRun((chain) => chain.addColumnBefore().run()),
    addColumnAfter: canRun((chain) => chain.addColumnAfter().run()),
    deleteColumn: canRun((chain) => chain.deleteColumn().run()),
    addRowBefore: canRun((chain) => chain.addRowBefore().run()),
    addRowAfter: canRun((chain) => chain.addRowAfter().run()),
    deleteRow: canRun((chain) => chain.deleteRow().run()),
    deleteTable: canRun((chain) => chain.deleteTable().run()),
    toggleHeaderRow: canRun((chain) => chain.toggleHeaderRow().run()),
    toggleHeaderColumn: canRun((chain) => chain.toggleHeaderColumn().run()),
    toggleHeaderCell: canRun((chain) => chain.toggleHeaderCell().run()),
    mergeOrSplit: canRun((chain) => chain.mergeOrSplit().run()),
}))

const isHeaderCellActive = computed(() => {
    editorStateVersion.value
    return Boolean(props.editor?.isActive('tableHeader'))
})

const isHeaderRowActive = computed(() => {
    editorStateVersion.value
    
    const tableElement = getInteractionTableElement()?.querySelector('table') || getInteractionTableElement()
    const firstRowElement = tableElement?.querySelector('tr')
    const rowCells = firstRowElement ? [...firstRowElement.children] : []
    
    return Boolean(rowCells.length && rowCells.every((cell) => cell.tagName === 'TH'))
})

const isHeaderColumnActive = computed(() => {
    editorStateVersion.value
    
    const tableElement = getInteractionTableElement()?.querySelector('table') || getInteractionTableElement()
    
    if (!tableElement) {
        return false
    }
    
    const rows = [...tableElement.querySelectorAll('tr')]
    
    return Boolean(rows.length && rows.every((row) => row.children[0]?.tagName === 'TH'))
})

const isControlDisabled = (control) => !tableCapabilities.value[control.capability]

const getControlColor = (control) => {
    if (control.value === 'delete-column' || control.value === 'delete-row' || control.value === 'delete-table') {
        return 'error'
    }
    return control.isActive?.() ? 'primary' : undefined
}

// Positioning
const updateOverlayPosition = () => {
    const editorInstance = props.editor
    const containerElement = getContainerElement()
    const cellElement = getInteractionCellElement()
    const tableWrapperElement = getInteractionTableElement()
    const tableElement = tableWrapperElement?.matches('table')
    ? tableWrapperElement
    : tableWrapperElement?.querySelector('table')
    const hasActiveTableSelection = Boolean(
    editorInstance
    && (
    editorInstance.isActive('table')
    || editorInstance.isActive('tableCell')
    || editorInstance.isActive('tableHeader')
    )
    )
    const shouldShowOverlay = Boolean(
    cellElement
    && tableWrapperElement
    && tableElement
    && (getHoveredCellElement() || hasActiveTableSelection)
    )
    
    if (
    !editorInstance
    || !containerElement
    || !shouldShowOverlay
    ) {
        overlayState.value = {
            visible: false,
            columnTop: 0,
            columnLeft: 0,
            rowTop: 0,
            rowLeft: 0,
            tableTop: 0,
            tableLeft: 0,
        }
        return
    }
    
    const containerRect = containerElement.getBoundingClientRect()
    const cellRect = cellElement.getBoundingClientRect()
    const tableRect = tableWrapperElement.getBoundingClientRect()
    
    overlayState.value = {
        visible: true,
        columnTop: clamp(
        tableRect.top - containerRect.top - COLUMN_TOOLBAR_TOP_GAP - COLUMN_TOOLBAR_HEIGHT,
        TOP_TOOLBAR_MIN_OFFSET,
        Math.max(8, containerRect.height - 48),
        ),
        columnLeft: clamp(
        cellRect.left - containerRect.left + (cellRect.width / 2),
        COLUMN_TOOLBAR_WIDTH / 2,
        Math.max(COLUMN_TOOLBAR_WIDTH / 2, containerRect.width - (COLUMN_TOOLBAR_WIDTH / 2)),
        ),
        rowTop: clamp(
        cellRect.top - containerRect.top + (cellRect.height / 2),
        22,
        Math.max(22, containerRect.height - 22),
        ),
        rowLeft: clamp(
        tableRect.left - containerRect.left - ROW_TOOLBAR_WIDTH - ROW_TOOLBAR_LEFT_GAP,
        ROW_TOOLBAR_MIN_LEFT_OFFSET,
        Math.max(8, containerRect.width - ROW_TOOLBAR_WIDTH),
        ),
        tableTop: clamp(
        tableRect.bottom - containerRect.top + TABLE_TOOLBAR_BOTTOM_GAP,
        8,
        Math.max(8, containerRect.height - 48),
        ),
        tableLeft: clamp(
        tableRect.right - containerRect.left,
        TABLE_TOOLBAR_WIDTH,
        Math.max(TABLE_TOOLBAR_WIDTH, containerRect.width - 8),
        ),
    }
}

// Commands
const executeCommand = (buildChain) => {
    if (!props.editor) {
        return false
    }
    
    const didRun = buildChain(props.editor.chain().focus())
    
    if (didRun) {
        syncEditorState()
    }
    
    return didRun
}

const runControl = (control) => {
    if (isControlDisabled(control)) {
        return false
    }
    
    return executeCommand(control.command)
}

// Lifecycle
watch(() => props.editor, (nextEditor, previousEditor) => {
    detachEditorListeners(previousEditor)
    attachEditorListeners(nextEditor)
    syncEditorState()
}, { immediate: true })

watch(() => props.containerRef, () => {
    syncEditorState()
})

onMounted(() => {
    window.addEventListener('resize', syncEditorState)
})

onBeforeUnmount(() => {
    clearPendingHoverReset()
    detachEditorListeners(props.editor)
    window.removeEventListener('resize', syncEditorState)
})
</script>

<style scoped>
.table-overlay {
    position: absolute;
    z-index: 24;
}

.table-overlay--column {
    transform: translateX(-50%);
}

.table-overlay--row {
    transform: translateY(-50%);
}

.table-overlay--table {
    transform: translate(-100%, 0);
}
</style>
