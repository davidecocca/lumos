const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');
const { parse, compileScript, compileTemplate } = require('@vue/compiler-sfc');

test('due-date menu contains a direct calendar and preserves date-only values', async (t) => {
    const vue = await import('vue');
    const kanban =
        await import('../src/rendered/components/kanban/utils/dates.js');
    const constants =
        await import('../src/rendered/components/kanban/utils/constants.js');
    const filename = path.resolve(
        __dirname,
        '../src/rendered/components/kanban/KanbanCardProperties.vue',
    );
    const source = await fs.readFile(filename, 'utf8');
    assert.match(source, /<v-date-picker\b/);
    assert.match(source, /<v-date-picker\b[^>]*height="auto"/);
    assert.doesNotMatch(source, /type="date"/);
    const { descriptor } = parse(source, { filename });
    const compiled = compileScript(descriptor, { id: 'due-date-test' });
    const template = compileTemplate({
        source: descriptor.template.content,
        filename,
        id: 'due-date-test',
        compilerOptions: { bindingMetadata: compiled.bindings },
    });
    assert.deepEqual(template.errors, []);
    const script = compiled.content
        .replace(/import[\s\S]*?from\s+['"][^'"]+['"];?/g, '')
        .replace('export default', 'const component =');
    const component = vm.runInNewContext(script + '\ncomponent;', {
        ...vue,
        ...kanban,
        ...constants,
        // The form changes nested draft fields, so a ref to the supplied model is sufficient here.
        _useModel: vue.toRef,
        _mergeModels: vue.mergeModels,
    });
    const previousTimezone = process.env.TZ;
    process.env.TZ = 'America/Los_Angeles';
    t.after(() => {
        if (previousTimezone === undefined) delete process.env.TZ;
        else process.env.TZ = previousTimezone;
    });
    const props = vue.reactive({
        modelValue: { dueDate: '2026-10-11' },
        columns: [],
        disabled: false,
    });
    const fields = component.setup(props, { expose() {}, emit() {} });
    assert.equal(
        kanban.toLocalDateString(fields.selectedDueDate.value),
        '2026-10-11',
    );
    fields.dueDateMenu.value = true;
    fields.setDueDate(new Date('2026-10-11T23:30:00-07:00'));
    assert.equal(
        props.modelValue.dueDate,
        '2026-10-11',
        'Selecting a date never converts it to a UTC day',
    );
    assert.equal(
        fields.dueDateMenu.value,
        false,
        'Selection closes the calendar',
    );
    fields.setDueDate(null);
    assert.equal(props.modelValue.dueDate, null);
    assert.equal(fields.selectedDueDate.value, null);
    props.disabled = true;
    fields.setDueDate(new Date('2026-10-12T00:00:00'));
    assert.equal(
        props.modelValue.dueDate,
        null,
        'Disabled cards cannot change their due date',
    );
    assert.match(source, /v-model:year="calendarYear"/);
    for (const year of [1, 99, 1500, 2026, 2500, 9999]) {
        fields.calendarYear.value = year;
        const minYear = fields.minDueDate.value.getFullYear();
        const maxYear = fields.maxDueDate.value.getFullYear();
        assert.ok(
            minYear <= year && maxYear >= year,
            `Displayed year ${year} remains selectable`,
        );
        assert.equal(
            maxYear - minYear + 1,
            21,
            'Year selection fills seven complete rows, even at range boundaries',
        );
    }
    assert.equal(fields.maxDueDate.value.getFullYear(), 9999);
    fields.calendarYear.value = 1;
    assert.equal(fields.minDueDate.value.getFullYear(), 1);
});
