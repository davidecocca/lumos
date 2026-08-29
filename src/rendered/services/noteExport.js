import {
    defaultMarkdownSerializer,
    MarkdownSerializer,
} from 'prosemirror-markdown';

const tableCellText = (cell) =>
    cell.textContent.replace(/\|/g, '\\|').replace(/\n+/g, '<br>');

const serializer = new MarkdownSerializer(
    {
        ...defaultMarkdownSerializer.nodes,
        bulletList: defaultMarkdownSerializer.nodes.bullet_list,
        codeBlock: defaultMarkdownSerializer.nodes.code_block,
        hardBreak: defaultMarkdownSerializer.nodes.hard_break,
        horizontalRule: defaultMarkdownSerializer.nodes.horizontal_rule,
        listItem: defaultMarkdownSerializer.nodes.list_item,
        orderedList: defaultMarkdownSerializer.nodes.ordered_list,
        noteImage(state, node) {
            const alt = state.esc(node.attrs.alt || '');
            const src = state.esc(node.attrs.src || '');
            state.write(`![${alt}](${src})`);
        },
        taskList(state, node) {
            state.renderList(node, '  ', (item) =>
                item.attrs.checked ? '- [x] ' : '- [ ] ',
            );
        },
        taskItem(state, node) {
            state.renderContent(node);
        },
        details(state, node) {
            state.renderContent(node);
        },
        detailsSummary(state, node) {
            state.write('**');
            state.renderInline(node);
            state.write('**');
            state.closeBlock(node);
        },
        detailsContent(state, node) {
            state.renderContent(node);
        },
        youtube(state, node) {
            const src = state.esc(node.attrs.src || '');
            if (src) state.write(`[YouTube video](${src})`);
        },
        table(state, node) {
            const rows = [];
            let columnCount = 0;

            node.forEach((row) => {
                const cells = [];
                row.forEach((cell) => cells.push(tableCellText(cell)));
                columnCount = Math.max(columnCount, cells.length);
                rows.push(cells);
            });

            if (!rows.length) return;

            const writeRow = (cells) => {
                const paddedCells = [...cells];
                while (paddedCells.length < columnCount) paddedCells.push('');
                state.write(`| ${paddedCells.join(' | ')} |\n`);
            };

            writeRow(rows[0]);
            state.write(`| ${Array(columnCount).fill('---').join(' | ')} |\n`);
            rows.slice(1).forEach(writeRow);
            state.closeBlock(node);
        },
    },
    {
        ...defaultMarkdownSerializer.marks,
        bold: defaultMarkdownSerializer.marks.strong,
        italic: defaultMarkdownSerializer.marks.em,
        strike: {
            open: '~~',
            close: '~~',
            mixable: true,
            expelEnclosingWhitespace: true,
        },
        highlight: { open: '==', close: '==', mixable: true },
        subscript: { open: '<sub>', close: '</sub>' },
        superscript: { open: '<sup>', close: '</sup>' },
        textStyle: { open: '', close: '' },
    },
);

export const serializeMarkdown = (document, title) =>
    `# ${title}\n\n${serializer.serialize(document)}`;
