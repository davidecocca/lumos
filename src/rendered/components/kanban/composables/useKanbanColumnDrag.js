// Handles column reordering in the Edit columns dialog through pointer dragging and keyboard arrows.
import { onBeforeUnmount, ref } from 'vue';

export function useKanbanColumnDrag({ columnsDraft, disabled }) {
    const columnDrag = ref(null);
    let columnDragGeometry;
    let columnDragFrame;

    function reorderColumn(index, direction) {
        const columns = columnsDraft.value;
        if (
            disabled.value ||
            index + direction < 0 ||
            index + direction >= columns.length
        )
            return;
        const [column] = columns.splice(index, 1);
        columns.splice(index + direction, 0, column);
    }

    function startColumnDrag(event, id) {
        if (disabled.value || columnDrag.value || event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.focus();
        const row = event.currentTarget.closest('.kanban-column-row');
        const rows = [
            ...row.parentElement.querySelectorAll('.kanban-column-row'),
        ];
        let scroller = row.parentElement;
        while (
            scroller.parentElement &&
            !/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)
        )
            scroller = scroller.parentElement;
        columnDragGeometry = {
            rows: rows.map((element) => element.getBoundingClientRect()),
            origin: row.getBoundingClientRect().top,
            height: row.getBoundingClientRect().height,
            startY: event.clientY,
            pointerId: event.pointerId,
            scroller,
            scrollTop: scroller.scrollTop,
            original: [...columnsDraft.value],
        };
        columnDrag.value = { id, y: event.clientY, offset: 0 };
        document.addEventListener('pointermove', moveColumnDrag, {
            passive: false,
        });
        document.addEventListener('pointerup', finishColumnDrag);
        document.addEventListener('pointercancel', cancelColumnDrag);
        document.addEventListener('keydown', columnDragKeydown);
        columnDragFrame = requestAnimationFrame(updateColumnDrag);
    }

    function moveColumnDrag(event) {
        if (event.pointerId !== columnDragGeometry?.pointerId) return;
        event.preventDefault();
        columnDrag.value.y = event.clientY;
    }

    function updateColumnDrag() {
        const drag = columnDrag.value;
        if (!drag) return;
        const geometry = columnDragGeometry;
        const { scroller } = geometry;
        const viewport = scroller.getBoundingClientRect();
        const edge = 40;
        if (drag.y < viewport.top + edge)
            scroller.scrollTop -= Math.min(
                12,
                (viewport.top + edge - drag.y) / 3,
            );
        else if (drag.y > viewport.bottom - edge)
            scroller.scrollTop += Math.min(
                12,
                (drag.y - viewport.bottom + edge) / 3,
            );
        const scrollDelta = scroller.scrollTop - geometry.scrollTop;
        const center =
            geometry.origin + (drag.y - geometry.startY) + geometry.height / 2;
        const target = geometry.rows.findIndex((rect, index) => {
            const next = geometry.rows[index + 1];
            return (
                !next ||
                center <
                    (rect.top + rect.height / 2 + next.top + next.height / 2) /
                        2 -
                        scrollDelta
            );
        });
        const columns = columnsDraft.value;
        const from = columns.findIndex((column) => column.id === drag.id);
        if (from !== target) {
            const [column] = columns.splice(from, 1);
            columns.splice(target, 0, column);
        }
        drag.offset =
            geometry.origin +
            (drag.y - geometry.startY) -
            geometry.rows[target].top +
            scrollDelta;
        columnDragFrame = requestAnimationFrame(updateColumnDrag);
    }

    function finishColumnDrag(event) {
        if (event.pointerId !== columnDragGeometry?.pointerId) return;
        columnDrag.value.y = event.clientY;
        cancelAnimationFrame(columnDragFrame);
        updateColumnDrag();
        clearColumnDrag();
    }
    function cancelColumnDrag() {
        if (columnDragGeometry)
            columnsDraft.value = columnDragGeometry.original;
        clearColumnDrag();
    }
    function columnDragKeydown(event) {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        cancelColumnDrag();
    }
    function clearColumnDrag() {
        cancelAnimationFrame(columnDragFrame);
        columnDrag.value = null;
        columnDragGeometry = null;
        document.removeEventListener('pointermove', moveColumnDrag);
        document.removeEventListener('pointerup', finishColumnDrag);
        document.removeEventListener('pointercancel', cancelColumnDrag);
        document.removeEventListener('keydown', columnDragKeydown);
    }

    onBeforeUnmount(clearColumnDrag);
    return {
        columnDrag,
        reorderColumn,
        startColumnDrag,
        moveColumnDrag,
        finishColumnDrag,
        cancelColumnDrag,
        clearColumnDrag,
    };
}
