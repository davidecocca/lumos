const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

test('renderer ESM boundary does not block Phosphor font assets', async () => {
    const { resolveConfig, isFileServingAllowed } = await import('vite');
    const root = path.resolve(__dirname, '..');
    const config = await resolveConfig(
        { configFile: path.join(root, 'vite.config.js') },
        'serve',
    );
    for (const [style, name] of [
        ['regular', 'Phosphor'],
        ['fill', 'Phosphor-Fill'],
    ]) {
        for (const extension of ['woff2', 'woff', 'ttf']) {
            const file = path.join(
                root,
                `node_modules/@phosphor-icons/web/src/${style}/${name}.${extension}`,
            );
            assert.ok(fs.existsSync(file), `Font exists: ${file}`);
            assert.ok(
                isFileServingAllowed(config, `/@fs${file}`),
                `Font allowed: ${file}`,
            );
        }
    }
    assert.equal(
        isFileServingAllowed(
            config,
            `/@fs${path.resolve(root, '../outside-vite-allow-list.woff2')}`,
        ),
        false,
        'Paths outside the repository remain blocked',
    );
});
