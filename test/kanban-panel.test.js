const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');
const { parse, compileScript } = require('@vue/compiler-sfc');
const mountComposable = require('./helpers/mountComposable');

test('card title focuses only on opening, never on resizing', async (t) => {
    const vue = await import('vue');
    const filename = path.resolve(
        __dirname,
        '../src/rendered/components/kanban/KanbanCardPanel.vue',
    );
    const source = await fs.readFile(filename, 'utf8');
    assert.doesNotMatch(
        source.match(/<v-text-field[\s\S]*?\/>/)[0],
        /\sautofocus\b/,
    );
    assert.match(source, /@mousedown\.prevent="startResize"/);
    const { descriptor } = parse(source, { filename });
    const script = compileScript(descriptor, { id: 'panel-focus-test' })
        .content.replace(/import[\s\S]*?from\s+['"][^'"]+['"];?/g, '')
        .replace('export default', 'const component =');
    const component = vm.runInNewContext(script + '\ncomponent;', {
        ...vue,
        KanbanCardProperties: {},
        KanbanDescriptionEditor: {},
        KanbanLinkedNotesField: {},
        KanbanTagsField: {},
        KanbanCardActionsMenu: {},
        parseTimestamp: () => null,
        toRelativeTime: () => '',
        localStorage: { getItem: () => null, setItem() {} },
        window: { innerWidth: 1000, setInterval: () => 1, clearInterval() {} },
        document: { addEventListener() {}, removeEventListener() {} },
    });
    const props = vue.reactive({ modelValue: false });
    let focuses = 0;
    const { result: panel, unmount } = await mountComposable(() => {
        const state = component.setup(props, { expose() {}, emit() {} });
        state.titleField.value = {
            focus() {
                focuses++;
            },
        };
        return state;
    });
    t.after(unmount);
    const settleFocus = async () => {
        await vue.nextTick();
        await new Promise(setImmediate);
    };
    props.modelValue = true;
    await settleFocus();
    assert.equal(focuses, 1);
    panel.startResize();
    for (const clientX of [400, 500, 600]) {
        panel.resize({ clientX });
        await vue.nextTick();
    }
    panel.stopResize();
    await vue.nextTick();
    assert.equal(focuses, 1, 'Width changes never steal focus');
    props.modelValue = false;
    await vue.nextTick();
    props.modelValue = true;
    await settleFocus();
    assert.equal(focuses, 2, 'Reopening still focuses the title');
    props.modelValue = false;
    await vue.nextTick();
    props.modelValue = true;
    panel.startResize();
    await settleFocus();
    assert.equal(
        focuses,
        2,
        'A pending opening focus is skipped during resize',
    );
});
