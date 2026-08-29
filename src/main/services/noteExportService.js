const { BrowserWindow } = require('electron');
const fs = require('fs/promises');

// Normalizes a note title for filenames, replacing OS-invalid characters and limiting length.
const exportFileName = (title) =>
    String(title || 'Untitled note')
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
        .trim()
        .slice(0, 100) || 'Untitled note';

// Prevents a note title from breaking the generated HTML document
const escapeHtml = (value) =>
    String(value).replace(
        /[&<>"']/g,
        (character) =>
            ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
            })[character],
    );

// Wraps Tiptap’s HTML in a standalone HTML page, adds the title, and provides styles used by both HTML and PDF export
const createExportDocument = (title, content) => `<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <title>${escapeHtml(title)}</title>
    <style>
        @page { margin: 18mm; }
        body { color: #1d1b20; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 11pt; line-height: 1.55; }
        h1 { font-size: 24pt; margin: 0 0 24px; }
        h2 { font-size: 18pt; margin-top: 28px; }
        h3 { font-size: 14pt; margin-top: 22px; }
        img, video, iframe { display: block; max-width: 100%; height: auto; margin: 16px auto; }
        pre { background: #f5f5f5; border-radius: 4px; overflow-wrap: break-word; padding: 12px; white-space: pre-wrap; }
        code { font-family: "SFMono-Regular", Consolas, monospace; }
        blockquote { border-left: 3px solid #777; color: #555; margin-left: 0; padding-left: 16px; }
        table { border-collapse: collapse; margin: 16px 0; width: 100%; }
        th, td { border: 1px solid #bbb; padding: 8px; text-align: left; vertical-align: top; }
        th { background: #f5f5f5; }
        details { margin: 12px 0; }
        a { color: #345995; }
    </style>
</head>
<body>
    <h1>${escapeHtml(title)}</h1>
    ${content}
</body>
</html>`;

// Builds the native Save As defaults and filter for the selected format.
const getSaveDialogOptions = (title, format) => ({
    title: 'Export note',
    defaultPath: `${exportFileName(title)}.${
        format === 'markdown' ? 'md' : format
    }`,
    filters:
        format === 'markdown'
            ? [{ name: 'Markdown', extensions: ['md', 'markdown'] }]
            : [{ name: format.toUpperCase(), extensions: [format] }],
});

// Creates a hidden, sandboxed Electron window, loads the standalone HTML through a data: URL, then calls Electron’s printToPDF().
async function createPdf(title, content) {
    const exportWindow = new BrowserWindow({
        show: false,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
    });

    try {
        await exportWindow.loadURL(
            `data:text/html;charset=utf-8,${encodeURIComponent(
                createExportDocument(title, content),
            )}`,
        );
        return await exportWindow.webContents.printToPDF({
            pageSize: 'A4',
            printBackground: true,
        });
    } finally {
        if (!exportWindow.isDestroyed()) exportWindow.destroy();
    }
}

// Selexts the final content to write to disk based on the selected format, then writes it to the specified file path.
async function writeExport({ filePath, format, title, content }) {
    const output =
        format === 'pdf'
            ? await createPdf(title, content)
            : format === 'html'
              ? createExportDocument(title, content)
              : content;
    await fs.writeFile(filePath, output);
}

module.exports = { getSaveDialogOptions, writeExport };
