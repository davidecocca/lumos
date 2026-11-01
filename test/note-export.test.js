const test = require('node:test');
const assert = require('node:assert/strict');

const setup = async () => {
    const { getSchema } = await import('@tiptap/core');
    const { default: StarterKit } = await import('@tiptap/starter-kit');
    const { TaskList, TaskItem } = await import('@tiptap/extension-list');
    const { serializeMarkdown } =
        await import('../src/rendered/services/noteExport.js');

    const schema = getSchema([StarterKit, TaskList, TaskItem]);
    const serialize = (content) =>
        serializeMarkdown(
            schema.nodeFromJSON({ type: 'doc', content }),
            'Test note',
        );

    return { serialize };
};

test('Markdown export preserves underlined text alongside other formatting', async () => {
    const { serialize } = await setup();

    assert.equal(
        serialize([
            {
                type: 'paragraph',
                content: [
                    {
                        type: 'text',
                        text: 'Underlined',
                        marks: [{ type: 'underline' }],
                    },
                    { type: 'text', text: ' and ' },
                    {
                        type: 'text',
                        text: 'bold',
                        marks: [{ type: 'bold' }],
                    },
                ],
            },
        ]),
        '# Test note\n\n<u>Underlined</u> and **bold**',
    );
});

test('Markdown export preserves checked, unchecked, and nested task items', async () => {
    const { serialize } = await setup();
    const paragraph = (text) => ({
        type: 'paragraph',
        content: [{ type: 'text', text }],
    });

    assert.equal(
        serialize([
            {
                type: 'taskList',
                content: [
                    {
                        type: 'taskItem',
                        attrs: { checked: true },
                        content: [paragraph('Done')],
                    },
                    {
                        type: 'taskItem',
                        attrs: { checked: false },
                        content: [
                            paragraph('Pending'),
                            {
                                type: 'taskList',
                                content: [
                                    {
                                        type: 'taskItem',
                                        attrs: { checked: true },
                                        content: [paragraph('Nested')],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ]),
        '# Test note\n\n- [x] Done\n\n- [ ] Pending\n\n  - [x] Nested',
    );
});
