const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');

test('external links only open supported web and email protocols', async () => {
    const source = await fs.readFile(
        path.resolve(__dirname, '../src/main/main.js'),
        'utf8',
    );
    const opened = [];
    let handler;
    vm.runInNewContext(
        source.slice(
            source.indexOf("ipcMain.handle('open-external-url'"),
            source.indexOf('// --- Workspace management ---'),
        ),
        {
            URL,
            ipcMain: {
                handle: (_name, callback) => {
                    handler = callback;
                },
            },
            shell: { openExternal: (url) => opened.push(url) },
        },
    );
    for (const url of [
        'https://example.com/',
        'http://example.com/',
        'mailto:hello@example.com',
    ])
        handler(null, url);
    assert.equal(opened.length, 3);
    for (const url of [
        'javascript:alert(1)',
        'data:text/html,test',
        'file:///etc/passwd',
        'invalid',
        null,
    ])
        assert.throws(() => handler(null, url));
    assert.equal(opened.length, 3);
});

test('card editor opens clicked links externally without navigating the app', async () => {
    const source = await fs.readFile(
        path.resolve(
            __dirname,
            '../src/rendered/components/kanban/KanbanDescriptionEditor.vue',
        ),
        'utf8',
    );
    const opened = [];
    const start = source.indexOf('handleClick:');
    const handleClick = vm.runInNewContext(
        `({ ${source.slice(start, source.indexOf('attributes:', start))} }).handleClick`,
        {
            window: { api: { openExternalUrl: async (url) => opened.push(url) } },
            console,
        },
    );
    const link = { href: 'https://example.com/' };
    let prevented = false;
    const event = {
        button: 0,
        target: { closest: () => link },
        preventDefault: () => {
            prevented = true;
        },
    };
    assert.equal(handleClick({ dom: { contains: () => true } }, 0, event), true);
    assert.equal(prevented, true);
    assert.deepEqual(opened, [link.href]);
    assert.equal(handleClick({ dom: { contains: () => false } }, 0, event), false);
    assert.equal(handleClick({}, 0, { button: 2 }), false);
});
