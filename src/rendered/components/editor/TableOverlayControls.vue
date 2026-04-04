<template>
    <div v-if="overlayState.visible">
        <v-sheet
        class="table-overlay table-overlay--column d-flex align-center ga-1 pa-1 rounded-xl"
        color="surface"
        border
        elevation="6"
        @mousedown.prevent
        @mouseleave="handleOverlayLeave"
        :style="{
            top: `${overlayState.columnTop}px`,
            left: `${overlayState.columnLeft}px`,
        }"
        >
            <v-tooltip text="Add column before" location="top">
                <template v-slot:activator="{ props }">
                    <v-btn
                    v-bind="props"
                    icon="ph-columns-plus-left"
                    size="x-small"
                    variant="text"
                    :disabled="!tableCapabilities.addColumnBefore"
                    @click="executeCommand((chain) => chain.addColumnBefore().run())"
                    />
                </template>
            </v-tooltip>
            <v-tooltip text="Add column after" location="top">
                <template v-slot:activator="{ props }">
                    <v-btn
                    v-bind="props"
                    icon="ph-columns-plus-right"
                    size="x-small"
                    variant="text"
                    :disabled="!tableCapabilities.addColumnAfter"
                    @click="executeCommand((chain) => chain.addColumnAfter().run())"
                    />
                </template>
            </v-tooltip>
            <v-tooltip text="Delete column" location="top">
                <template v-slot:activator="{ props }">
                    <v-btn
                    v-bind="props"
                    icon="ph-trash"
                    size="x-small"
                    variant="text"
                    :disabled="!tableCapabilities.deleteColumn"
                    @click="executeCommand((chain) => chain.deleteColumn().run())"
                    />
                </template>
            </v-tooltip>
        </v-sheet>

        <v-sheet
        class="table-overlay table-overlay--row d-flex flex-column align-center ga-1 pa-1 rounded-xl"
        color="surface"
        border
        elevation="6"
        @mousedown.prevent
        @mouseleave="handleOverlayLeave"
        :style="{
            top: `${overlayState.rowTop}px`,
            left: `${overlayState.rowLeft}px`,
        }"
        >
            <v-tooltip text="Add row before" location="left">
                <template v-slot:activator="{ props }">
                    <v-btn
                    v-bind="props"
                    icon="ph-rows-plus-top"
                    size="x-small"
                    variant="text"
                    :disabled="!tableCapabilities.addRowBefore"
                    @click="executeCommand((chain) => chain.addRowBefore().run())"
                    />
                </template>
            </v-tooltip>
            <v-tooltip text="Add row after" location="left">
                <template v-slot:activator="{ props }">
                    <v-btn
                    v-bind="props"
                    icon="ph-rows-plus-bottom"
                    size="x-small"
                    variant="text"
                    :disabled="!tableCapabilities.addRowAfter"
                    @click="executeCommand((chain) => chain.addRowAfter().run())"
                    />
                </template>
            </v-tooltip>
            <v-tooltip text="Delete row" location="left">
                <template v-slot:activator="{ props }">
                    <v-btn
                    v-bind="props"
                    icon="ph-trash"
                    size="x-small"
                    variant="text"
                    :disabled="!tableCapabilities.deleteRow"
                    @click="executeCommand((chain) => chain.deleteRow().run())"
                    />
                </template>
            </v-tooltip>
        </v-sheet>

        <v-sheet
        class="table-overlay table-overlay--table d-flex align-center ga-1 pa-1 rounded-xl"
        color="surface"
        border
        elevation="6"
        @mousedown.prevent
        @mouseleave="handleOverlayLeave"
        :style="{
            top: `${overlayState.tableTop}px`,
            left: `${overlayState.tableLeft}px`,
        }"
        >
            <v-tooltip text="Toggle header row" location="top">
                <template v-slot:activator="{ props }">
                    <v-btn
                    v-bind="props"
                    icon="ph-rows"
                    size="x-small"
                    variant="text"
                    :color="isHeaderRowActive ? 'primary' : undefined"
                    :disabled="!tableCapabilities.toggleHeaderRow"
                    @click="executeCommand((chain) => chain.toggleHeaderRow().run())"
                    />
                </template>
            </v-tooltip>
            <v-tooltip text="Toggle header column" location="top">
                <template v-slot:activator="{ props }">
                    <v-btn
                    v-bind="props"
                    icon="ph-columns"
                    size="x-small"
                    variant="text"
                    :color="isHeaderColumnActive ? 'primary' : undefined"
                    :disabled="!tableCapabilities.toggleHeaderColumn"
                    @click="executeCommand((chain) => chain.toggleHeaderColumn().run())"
                    />
                </template>
            </v-tooltip>
            <v-tooltip text="Toggle header cell" location="top">
                <template v-slot:activator="{ props }">
                    <v-btn
                    v-bind="props"
                    icon="ph-table"
                    size="x-small"
                    variant="text"
                    :color="isHeaderCellActive ? 'primary' : undefined"
                    :disabled="!tableCapabilities.toggleHeaderCell"
                    @click="executeCommand((chain) => chain.toggleHeaderCell().run())"
                    />
                </template>
            </v-tooltip>
            <v-tooltip text="Merge or split cells" location="top">
                <template v-slot:activator="{ props }">
                    <v-btn
                    v-bind="props"
                    icon="ph-arrows-left-right"
                    size="x-small"
                    variant="text"
                    :disabled="!tableCapabilities.mergeOrSplit"
                    @click="executeCommand((chain) => chain.mergeOrSplit().run())"
                    />
                </template>
            </v-tooltip>
            <v-tooltip text="Delete table" location="top">
                <template v-slot:activator="{ props }">
                    <v-btn
                    v-bind="props"
                    icon="ph-trash"
                    size="x-small"
                    variant="text"
                    :disabled="!tableCapabilities.deleteTable"
                    @click="executeCommand((chain) => chain.deleteTable().run())"
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

    const editorStateVersion = ref(0)
    const hoveredCellElement = ref(null)
    const hoveredTableElement = ref(null)
    const overlayState = ref({
        visible: false,
        columnTop: 0,
        columnLeft: 0,
        rowTop: 0,
        rowLeft: 0,
        tableTop: 0,
        tableLeft: 0,
    })

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

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

    const setHoveredTableElements = (cellElement) => {
        hoveredCellElement.value = cellElement
        hoveredTableElement.value = cellElement?.closest('.tableWrapper, table') || null
        syncEditorState()
    }

    const handlePointerMove = (event) => {
        const targetElement = event.target instanceof Element ? event.target : null
        const nextCellElement = targetElement?.closest('td, th') || null

        if (nextCellElement === hoveredCellElement.value) {
            return
        }

        setHoveredTableElements(nextCellElement)
    }

    const handlePointerLeave = (event) => {
        const relatedTarget = event.relatedTarget instanceof Element ? event.relatedTarget : null

        if (relatedTarget?.closest('.table-overlay')) {
            return
        }

        if (!hoveredCellElement.value && !hoveredTableElement.value) {
            return
        }

        hoveredCellElement.value = null
        hoveredTableElement.value = null
        syncEditorState()
    }

    const handleOverlayLeave = (event) => {
        const relatedTarget = event.relatedTarget instanceof Element ? event.relatedTarget : null
        const editorDom = getEditorDom()

        if (
            relatedTarget?.closest('.table-overlay')
            || editorDom?.contains(relatedTarget)
        ) {
            return
        }

        hoveredCellElement.value = null
        hoveredTableElement.value = null
        syncEditorState()
    }

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

        const cellElement = getInteractionCellElement()
        const rowElement = cellElement?.closest('tr')

        return Boolean(rowElement?.querySelector('th'))
    })

    const isHeaderColumnActive = computed(() => {
        editorStateVersion.value

        const cellElement = getInteractionCellElement()
        const cellIndex = cellElement?.cellIndex
        const tableElement = getInteractionTableElement()?.querySelector('table') || getInteractionTableElement()

        if (cellIndex === undefined || !tableElement) {
            return false
        }

        const rows = [...tableElement.querySelectorAll('tr')]

        return rows.some((row) => row.children[cellIndex]?.tagName === 'TH')
    })

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
        const rowToolbarBarWidth = 42
        const columnToolbarBarWidth = 132
        const mainTableToolbarBarWidth = 210
        const rowToolbarLeftGap = 14
        const columnToolbarTopGap = 14
        const mainTableToolbarBottomGap = 4
        const topToolbarMinOffset = -64
        const rowToolbarMinLeftOffset = -9
        const columnToolbarBarHeight = 32

        overlayState.value = {
            visible: true,
            columnTop: clamp(
                tableRect.top - containerRect.top - columnToolbarTopGap - columnToolbarBarHeight,
                topToolbarMinOffset,
                Math.max(8, containerRect.height - 44),
            ),
            columnLeft: clamp(
                cellRect.left - containerRect.left + (cellRect.width / 2),
                columnToolbarBarWidth / 2,
                Math.max(columnToolbarBarWidth / 2, containerRect.width - (columnToolbarBarWidth / 2)),
            ),
            rowTop: clamp(
                cellRect.top - containerRect.top + (cellRect.height / 2),
                22,
                Math.max(22, containerRect.height - 22),
            ),
            rowLeft: clamp(
                tableRect.left - containerRect.left - rowToolbarBarWidth - rowToolbarLeftGap,
                rowToolbarMinLeftOffset,
                Math.max(8, containerRect.width - rowToolbarBarWidth),
            ),
            tableTop: clamp(
                tableRect.bottom - containerRect.top + mainTableToolbarBottomGap,
                8,
                Math.max(8, containerRect.height - 44),
            ),
            tableLeft: clamp(
                tableRect.right - containerRect.left,
                mainTableToolbarBarWidth,
                Math.max(mainTableToolbarBarWidth, containerRect.width - 8),
            ),
        }
    }

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
