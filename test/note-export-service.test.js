const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');

const loadService = async (dataPath, BrowserWindow = class {}) => {
    const source = await fs.readFile(
        path.join(__dirname, '../src/main/services/noteExportService.js'),
        'utf8',
    );
    const module = { exports: {} };
    vm.runInNewContext(source, {
        module,
        URL,
        require: (name) => {
            if (name === 'electron') return { BrowserWindow };
            if (name === '../storagePaths') {
                return {
                    getDataPath: () => dataPath,
                    getImagePath: () => path.join(dataPath, 'note-images'),
                };
            }
            return require(name);
        },
    });
    return module.exports;
};

test('Markdown export copies images with escaped alt text and encoded paths', async (t) => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'lumos-export-'));
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    const dataPath = path.join(directory, 'data');
    const imageDirectory = path.join(dataPath, 'note-images/20');
    await fs.mkdir(imageDirectory, { recursive: true });
    const filename = 'my_image (test).svg';
    await fs.writeFile(path.join(imageDirectory, filename), '<svg/>');
    const { writeExport } = await loadService(dataPath);
    const filePath = path.join(directory, 'Note (export).md');
    const image =
        '![Local \\[left\\]](note-images/20/my_image%20%28test%29.svg)';
    await writeExport({
        filePath,
        format: 'markdown',
        title: 'Note',
        content: `${image}\n\n${image}`,
    });

    assert.equal(
        await fs.readFile(filePath, 'utf8'),
        Array(2)
            .fill(
                '![Local \\[left\\]](Note%20%28export%29.assets/my_image%20%28test%29.svg)',
            )
            .join('\n\n'),
    );
    assert.deepEqual(
        await fs.readdir(path.join(directory, 'Note (export).assets')),
        [filename],
    );
    assert.equal(
        await fs.readFile(
            path.join(directory, 'Note (export).assets', filename),
            'utf8',
        ),
        '<svg/>',
    );
});

test('Markdown export does not copy paths outside managed images', async (t) => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'lumos-export-'));
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    const { writeExport } = await loadService(directory);
    const filePath = path.join(directory, 'Note.md');
    const content =
        '![escape](note-images/%2e%2e/secret.svg)\n\n![invalid](note-images/%ZZ.svg)';
    await writeExport({ filePath, format: 'markdown', title: 'Note', content });
    assert.equal(await fs.readFile(filePath, 'utf8'), content);
    assert.deepEqual(await fs.readdir(directory), ['Note.md']);
});

test('HTML and PDF share image alignment, task-list, and media spacing styles', async (t) => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'lumos-export-'));
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    let pdfHtml;
    let destroyed = false;
    class ExportWindow {
        webContents = {
            executeJavaScript: async () => {},
            printToPDF: async () => Buffer.from('PDF'),
        };
        async loadURL(url) {
            pdfHtml = decodeURIComponent(url.split(',').slice(1).join(','));
        }
        isDestroyed() {
            return destroyed;
        }
        destroy() {
            destroyed = true;
        }
    }
    const { writeExport } = await loadService(directory, ExportWindow);
    const content =
        '<img src="data:image/svg+xml;base64,PHN2Zy8+" data-align="left" width="240">' +
        '<img src="data:image/svg+xml;base64,PHN2Zy8+" data-align="right" width="360">' +
        '<div data-youtube-video=""><iframe src="https://www.youtube-nocookie.com/embed/jNQXAC9IVRw"></iframe></div><h2>After video</h2>';
    const htmlPath = path.join(directory, 'Note.html');
    await writeExport({
        filePath: htmlPath,
        format: 'html',
        title: 'Note',
        content,
    });
    await writeExport({
        filePath: path.join(directory, 'Note.pdf'),
        format: 'pdf',
        title: 'Note',
        content,
    });
    const html = await fs.readFile(htmlPath, 'utf8');
    assert.equal(pdfHtml, html);
    assert.equal(destroyed, true);
    assert.match(
        html,
        /img\[data-align="left"\] \{ margin-left: 0; margin-right: auto;/,
    );
    assert.match(
        html,
        /img\[data-align="right"\] \{ margin-left: auto; margin-right: 0;/,
    );
    assert.match(html, /ul\[data-type="taskList"\] \{ list-style: none;/);
    assert.match(html, /ul\[data-type="taskList"\] > li \{ display: flex;/);
    assert.match(html, /break-inside: avoid/);
    assert.match(html, /break-after: avoid-page/);
    assert.match(
        html,
        /\[data-youtube-video\] > \.video-export-link \{ margin: 0;/,
    );
    assert.match(
        html,
        /<div data-youtube-video=""><p class="video-export-link"><a href="https:\/\/www.youtube.com\/watch\?v=jNQXAC9IVRw"/,
    );
    assert.doesNotMatch(html, /<iframe/);
});

test('PDF expands closed and nested details before printing without changing HTML', async (t) => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'lumos-export-'));
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    const details = [{ open: false }, { open: false }, { open: true }];
    let expanded = false;
    class ExportWindow {
        webContents = {
            executeJavaScript: async (script) => {
                vm.runInNewContext(script, {
                    document: {
                        querySelectorAll: (selector) => {
                            assert.equal(selector, 'details');
                            return details;
                        },
                    },
                });
                expanded = true;
            },
            printToPDF: async () => {
                assert.equal(expanded, true);
                assert(details.every((section) => section.open));
                return Buffer.from('PDF');
            },
        };
        async loadURL() {}
        isDestroyed() {
            return false;
        }
        destroy() {}
    }
    const { writeExport } = await loadService(directory, ExportWindow);
    const content =
        '<details><summary>Closed</summary><p>Hidden body</p>' +
        '<details><summary>Nested closed</summary><p>Nested body</p></details></details>' +
        '<details open><summary>Open</summary><p>Visible body</p></details>';
    await writeExport({
        filePath: path.join(directory, 'Note.pdf'),
        format: 'pdf',
        title: 'Note',
        content,
    });
    const htmlPath = path.join(directory, 'Note.html');
    await writeExport({
        filePath: htmlPath,
        format: 'html',
        title: 'Note',
        content,
    });
    assert((await fs.readFile(htmlPath, 'utf8')).includes(content));
});
