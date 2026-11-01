const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

test('typing does not add tags; committed selections are trimmed and deduplicated', async () => {
    const { addCommittedTags } =
        await import('../src/rendered/components/kanban/utils/cards.js');
    let tags = [];
    for (const text of ['R', 'Re', 'Release'])
        tags = addCommittedTags(tags, text);
    assert.deepEqual(tags, []);
    tags = addCommittedTags(tags, [' Release ']);
    assert.deepEqual(tags, ['Release']);
    tags = addCommittedTags(tags, ['release', 'Bug', '']);
    assert.deepEqual(tags, ['Release', 'Bug']);
    assert.deepEqual(addCommittedTags(tags, []), tags);
});

test('shared tag picker retains committed multi-select combobox behavior', async () => {
    const source = await fs.readFile(
        path.resolve(
            __dirname,
            '../src/rendered/components/kanban/dialogs/AddTagsDialog.vue',
        ),
        'utf8',
    );
    const combobox = source.match(/<v-combobox[\s\S]*?\/>/)[0];
    assert.match(combobox, /\s+multiple\s/);
    assert.match(combobox, /@update:model-value="addTag"/);
});

test('extracted tag dialog commits additions and removals immediately', async () => {
    const vue = await import('vue');
    const { parse, compileScript } = require('@vue/compiler-sfc');
    const vm = require('node:vm');
    const { addCommittedTags } =
        await import('../src/rendered/components/kanban/utils/cards.js');
    const filename = path.resolve(
        __dirname,
        '../src/rendered/components/kanban/dialogs/AddTagsDialog.vue',
    );
    const source = await fs.readFile(filename, 'utf8');
    const { descriptor } = parse(source, { filename });
    const script = compileScript(descriptor, { id: 'add-tags-test' })
        .content.replace(/import[\s\S]*?from\s+['"][^'"]+['"];?/g, '')
        .replace('export default', 'const component =');
    const component = vm.runInNewContext(script + '\ncomponent;', {
        ...vue,
        _useModel: vue.toRef,
        _mergeModels: vue.mergeModels,
        BaseDialog: {},
        addCommittedTags,
    });
    const props = vue.reactive({ modelValue: true, selectedTags: ['Work'] });
    const dialog = component.setup(props, { expose() {}, emit() {} });
    dialog.entry.value = [' Personal '];
    dialog.menuOpen.value = true;
    dialog.addTag(dialog.entry.value);
    assert.deepEqual([...props.selectedTags], ['Work', 'Personal']);
    assert.equal(dialog.entry.value.length, 0);
    assert.equal(dialog.menuOpen.value, false);
    dialog.removeTag('Work');
    assert.deepEqual([...props.selectedTags], ['Personal']);
    assert.equal(props.modelValue, true, 'Updates do not wait for the dialog to close');
});

test('chip fitting reserves overflow room and handles empty/narrow rows', async () => {
    const { fittingChipCount } =
        await import('../src/rendered/utils/chipOverflow.js');
    assert.equal(fittingChipCount(300, [], 32), 0);
    assert.equal(fittingChipCount(300, [60, 60, 60], 32), 3);
    assert.equal(fittingChipCount(160, [60, 60, 60], 32), 1);
    assert.equal(fittingChipCount(59, [60], 32), 0);
    assert.equal(fittingChipCount(60, [60], 32), 1);
});

test('chip fitting leaves the full overflow-control width at resize boundaries', async () => {
    const { fittingChipCount } =
        await import('../src/rendered/utils/chipOverflow.js');
    const widths = [72.25, 133.5, 127.75, 88.5, 66.25, 94.5];
    const overflowWidth = 34.5;
    const gap = 8;
    for (
        let availableWidth = 280;
        availableWidth <= 720;
        availableWidth += 0.25
    ) {
        const count = fittingChipCount(
            availableWidth,
            widths,
            overflowWidth,
            gap,
        );
        const hasOverflow = count < widths.length;
        const usedWidth =
            widths.slice(0, count).reduce((sum, width) => sum + width, 0) +
            (hasOverflow ? overflowWidth : 0) +
            Math.max(0, count - 1 + Number(hasOverflow)) * gap;
        assert.ok(
            usedWidth <= availableWidth,
            `Overflow control fits at ${availableWidth}px`,
        );
    }
});

test('shared chip rows keep both controls outside the clipped chip area', async () => {
    const { baseParse } = require('@vue/compiler-dom');
    const { parse } = require('@vue/compiler-sfc');
    const source = await fs.readFile(
        path.resolve(
            __dirname,
            '../src/rendered/components/commons/BaseOverflowChipRow.vue',
        ),
        'utf8',
    );
    const { descriptor } = parse(source);
    const section = baseParse(descriptor.template.content).children.find(
        (node) => node.type === 1,
    );
    const attribute = (node, name) =>
        node.props?.find((prop) => prop.type === 6 && prop.name === name)?.value
            ?.content;
    const row = section.children.find((node) =>
        attribute(node, 'class')?.includes('overflow-chip-row d-flex'),
    );
    const chipArea = row.children.find((node) =>
        attribute(node, 'class')?.includes('overflow-chip-row__items'),
    );
    const addButton = row.children.find((node) => node.tag === 'v-btn');
    assert.ok(chipArea);
    const chipList = chipArea.children.find((node) =>
        attribute(node, 'class')?.includes('overflow-chip-row__chips'),
    );
    const overflowControl = chipArea.children.find((node) =>
        attribute(node, 'class')?.includes('overflow-chip-row__overflow'),
    );
    assert.match(attribute(chipList, 'class'), /overflow-hidden/);
    assert.doesNotMatch(attribute(chipArea, 'class'), /overflow-hidden/);
    assert.ok(
        overflowControl,
        'Overflow control is a sibling of the clipped chips',
    );
    assert.match(attribute(overflowControl, 'class'), /flex-shrink-0/);
    assert.ok(addButton, 'Add button is a sibling of the clipped chip area');
    assert.match(attribute(addButton, 'class'), /flex-shrink-0/);
    assert.doesNotMatch(attribute(row, 'class'), /overflow-hidden/);
});

test('chip-row mounting and measurement use only native element refs', async (t) => {
    const { parse, compileScript } = require('@vue/compiler-sfc');
    const vm = require('node:vm');
    const mountComposable = require('./helpers/mountComposable');
    const vue = await import('vue');
    const { fittingChipCount } =
        await import('../src/rendered/utils/chipOverflow.js');
    const filename = path.resolve(
        __dirname,
        '../src/rendered/components/commons/BaseOverflowChipRow.vue',
    );
    const { descriptor } = parse(await fs.readFile(filename, 'utf8'), {
        filename,
    });
    // Compile the actual setup/lifecycle code, replacing imports with real Vue APIs.
    const script = compileScript(descriptor, { id: 'chip-row-mount-test' })
        .content.replace(/import[\s\S]*?from\s+['"][^'"]+['"];?/g, '')
        .replace('export default', 'const component =');
    const observed = [];
    let disconnected = false;
    let resizeCallback;
    const component = vm.runInNewContext(script + '\ncomponent;', {
        ...vue,
        fittingChipCount,
        ResizeObserver: class {
            constructor(callback) {
                resizeCallback = callback;
            }
            observe(element) {
                assert.ok(element, 'Only mounted native elements are observed');
                observed.push(element);
            }
            disconnect() {
                disconnected = true;
            }
        },
    });
    let areaWidth = 360;
    const widths = [133, 127, 88];
    const itemsArea = { getBoundingClientRect: () => ({ width: areaWidth }) };
    const measureContainer = {
        querySelectorAll: () =>
            widths.map((width) => ({
                getBoundingClientRect: () => ({ width }),
            })),
    };
    const { result, unmount } = await mountComposable(() => {
        const state = component.setup(
            {
                items: widths.map((width, key) => ({
                    key,
                    label: String(width),
                })),
            },
            { expose() {}, emit() {} },
        );
        state.itemsArea.value = itemsArea;
        state.measureContainer.value = measureContainer;
        state.overflowMeasure.value = {
            getBoundingClientRect: () => ({ width: 34 }),
        };
        return state;
    });
    t.after(unmount);
    await vue.nextTick();
    await resizeCallback();
    assert.equal(observed.length, 2);
    assert.equal(observed[0], result.itemsArea.value);
    assert.equal(observed[1], result.measureContainer.value);
    assert.equal(
        result.visibleCount.value,
        2,
        'Uses native chip-area and overflow widths',
    );
    areaWidth = 300;
    await resizeCallback();
    assert.equal(
        result.visibleCount.value,
        1,
        'Resizing hides a chip instead of clipping the controls',
    );
    areaWidth = 360;
    widths[0] = 200;
    await resizeCallback();
    assert.equal(
        result.visibleCount.value,
        1,
        'Font metric changes recompute the fit',
    );
    unmount();
    assert.equal(disconnected, true);
});
