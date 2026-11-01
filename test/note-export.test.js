const test = require('node:test');
const assert = require('node:assert/strict');

const setup = async () => {
    const { getSchema } = await import('@tiptap/core');
    const { default: StarterKit } = await import('@tiptap/starter-kit');
    const { TaskList, TaskItem } = await import('@tiptap/extension-list');
    const { default: Image } = await import('@tiptap/extension-image');
    const { default: Youtube } = await import('@tiptap/extension-youtube');
    const { default: Highlight } = await import('@tiptap/extension-highlight');
    const { TextStyle } = await import('@tiptap/extension-text-style');
    const { Color } = await import('@tiptap/extension-color');
    const { serializeMarkdown } =
        await import('../src/rendered/services/noteExport.js');

    const schema = getSchema([
        StarterKit,
        TaskList,
        TaskItem,
        Image.extend({ name: 'noteImage' }),
        Youtube,
        Highlight.configure({ multicolor: true }),
        TextStyle,
        Color,
    ]);
    const serialize = (content) =>
        serializeMarkdown(
            schema.nodeFromJSON({ type: 'doc', content }),
            'Test note',
        );

    return { serialize };
};

test('Markdown exports highlights and colors as plain text while retaining other marks', async () => {
    const { serialize } = await setup();
    const paragraph = (text, marks) => ({
        type: 'paragraph',
        content: [{ type: 'text', text, marks }],
    });

    assert.equal(
        serialize([
            paragraph('Default highlight', [{ type: 'highlight' }]),
            paragraph('Pink highlight', [
                { type: 'highlight', attrs: { color: '#f48fb1' } },
            ]),
            paragraph('Red text', [
                { type: 'textStyle', attrs: { color: '#d32f2f' } },
            ]),
            paragraph('Highlighted bold color', [
                { type: 'bold' },
                { type: 'highlight', attrs: { color: '#fff59d' } },
                { type: 'textStyle', attrs: { color: '#1976d2' } },
            ]),
        ]),
        '# Test note\n\nDefault highlight\n\nPink highlight\n\nRed text\n\n**Highlighted bold color**',
    );
});

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

test('Markdown separates image and video blocks and encodes image destinations', async () => {
    const { serialize } = await setup();
    const markdown = serialize([
        {
            type: 'noteImage',
            attrs: {
                src: 'note-images/20/my_image (test).svg',
                alt: 'Image [left]',
            },
        },
        {
            type: 'noteImage',
            attrs: { src: 'note-images/20/second.svg', alt: 'Second' },
        },
        {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Video' }],
        },
        {
            type: 'youtube',
            attrs: { src: 'https://www.youtube.com/watch?v=jNQXAC9IVRw' },
        },
        { type: 'paragraph', content: [{ type: 'text', text: 'After video' }] },
    ]);

    assert.equal(
        markdown,
        '# Test note\n\n![Image \\[left\\]](note-images/20/my_image%20%28test%29.svg)\n\n' +
            '![Second](note-images/20/second.svg)\n\n## Video\n\n' +
            '[YouTube video](https://www.youtube.com/watch?v=jNQXAC9IVRw)\n\nAfter video',
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
