const { BrowserWindow } = require('electron');
const fs = require('fs/promises');
const path = require('path');
const { getDataPath, getImagePath } = require('../storagePaths');

const IMAGE_ROOT_DIR = path.basename(getImagePath());
const MANAGED_MARKDOWN_IMAGE_PATTERN =
    /(!\[(?:\\.|[^\]\\])*\]\()(note-images\/[^)\s]+)(\))/g;

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

// Converts a YouTube embed URL to a watch URL
const getYoutubeWatchUrl = (source) => {
    const url = new URL(source.replace(/&amp;/g, '&'));
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const videoId =
        url.searchParams.get('v') ||
        (url.hostname === 'youtu.be' ? pathSegments[0] : null) ||
        (['embed', 'shorts'].includes(pathSegments[0])
            ? pathSegments[1]
            : null);

    return videoId && /^[\w-]{11}$/.test(videoId)
        ? `https://www.youtube.com/watch?v=${videoId}`
        : null;
};

// Replaces YouTube iframe embeds with a link to the video
const replaceYoutubeEmbeds = (content) =>
    content.replace(
        /<iframe\b[^>]*\bsrc=(["'])(.*?)\1[^>]*>(?:\s*<\/iframe>)?/gi,
        (iframe, _, source) => {
            try {
                const url = new URL(source);
                const isYoutube =
                    url.hostname === 'youtube.com' ||
                    url.hostname.endsWith('.youtube.com') ||
                    url.hostname === 'youtube-nocookie.com' ||
                    url.hostname.endsWith('.youtube-nocookie.com');

                const watchUrl = isYoutube && getYoutubeWatchUrl(source);

                if (!watchUrl) return iframe;

                return `<p class="video-export-link"><a href="${watchUrl}">${watchUrl}</a></p>`;
            } catch {
                return iframe;
            }
        },
    );

// Ensures that all links in the exported content open in a new window
const makeLinksOpenInNewWindow = (content) =>
    content.replace(/<a\b([^>]*)>/gi, (_, attributes) => {
        const safeAttributes = attributes
            .replace(/\s(?:target|rel)=(['"])[\s\S]*?\1/gi, '')
            .trimEnd();

        return `<a${safeAttributes} target="_blank" rel="noopener noreferrer">`;
    });

// Returns the absolute path to a managed image if it is within the note-images directory, otherwise returns null
const getManagedImageSourcePath = (storagePath) => {
    const dataPath = getDataPath();
    const imageRoot = getImagePath();
    const sourcePath = path.resolve(dataPath, storagePath);
    const relativePath = path.relative(imageRoot, sourcePath);

    return relativePath &&
        !relativePath.startsWith('..') &&
        !path.isAbsolute(relativePath)
        ? sourcePath
        : null;
};

// Writes the exported Markdown content to disk, copying any managed images to an assets directory alongside the Markdown file
async function writeMarkdownExport(filePath, content) {
    const assetsDirectoryName = `${path.basename(
        filePath,
        path.extname(filePath),
    )}.assets`;
    const assetsDirectoryPath = path.join(
        path.dirname(filePath),
        assetsDirectoryName,
    );
    const imageSources = new Map();
    const markdown = content.replace(
        MANAGED_MARKDOWN_IMAGE_PATTERN,
        (match, prefix, storagePath, suffix) => {
            let decodedPath;
            try {
                decodedPath = decodeURIComponent(storagePath);
            } catch {
                return match;
            }
            const sourcePath = getManagedImageSourcePath(decodedPath);

            if (!sourcePath) return match;

            const fileName = path.basename(sourcePath);
            imageSources.set(sourcePath, fileName);
            const destination = encodeURI(
                `${assetsDirectoryName}/${fileName}`,
            ).replace(/[()]/g, (character) =>
                character === '(' ? '%28' : '%29',
            );
            return `${prefix}${destination}${suffix}`;
        },
    );

    if (imageSources.size) {
        await fs.mkdir(assetsDirectoryPath, { recursive: true });
        await Promise.all(
            [...imageSources].map(([sourcePath, fileName]) =>
                fs.copyFile(
                    sourcePath,
                    path.join(assetsDirectoryPath, fileName),
                ),
            ),
        );
    }

    await fs.writeFile(filePath, markdown);
}

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
        h1, h2, h3, h4, h5, h6 { break-after: avoid-page; }
        img, video, iframe { display: block; max-width: 100%; height: auto; margin: 16px auto; break-inside: avoid; }
        img[data-align="left"] { margin-left: 0; margin-right: auto; }
        img[data-align="right"] { margin-left: auto; margin-right: 0; }
        img[data-align="center"] { margin-left: auto; margin-right: auto; }
        ul[data-type="taskList"] { list-style: none; padding-left: 24px; }
        ul[data-type="taskList"] > li { display: flex; align-items: flex-start; gap: 8px; margin: 8px 0; }
        ul[data-type="taskList"] > li > label { flex: 0 0 auto; }
        ul[data-type="taskList"] > li > div { flex: 1; min-width: 0; }
        ul[data-type="taskList"] > li > div > :first-child { margin-top: 0; }
        ul[data-type="taskList"] > li > div > :last-child { margin-bottom: 0; }
        pre { background: #f5f5f5; border-radius: 4px; overflow-wrap: break-word; padding: 12px; white-space: pre-wrap; }
        code { font-family: "SFMono-Regular", Consolas, monospace; }
        blockquote { border-left: 3px solid #777; color: #555; margin-left: 0; padding-left: 16px; }
        table { border-collapse: collapse; margin: 16px 0; width: 100%; }
        th, td { border: 1px solid #bbb; padding: 8px; text-align: left; vertical-align: top; }
        th { background: #f5f5f5; }
        details { margin: 12px 0; }
        a { color: #345995; }
        [data-youtube-video] { margin: 16px 0; break-inside: avoid; }
        .video-export-link { margin: 16px 0; overflow-wrap: anywhere; }
        [data-youtube-video] > .video-export-link { margin: 0; }
    </style>
</head>
<body>
    <h1>${escapeHtml(title)}</h1>
    ${makeLinksOpenInNewWindow(replaceYoutubeEmbeds(content))}
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
        // PDF cannot expand interactive sections, so include every details body.
        await exportWindow.webContents.executeJavaScript(`
            document.querySelectorAll('details').forEach((details) => {
                details.open = true;
            });
        `);
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
    if (format === 'markdown') {
        await writeMarkdownExport(filePath, content);
        return;
    }

    const output =
        format === 'pdf'
            ? await createPdf(title, content)
            : format === 'html'
              ? createExportDocument(title, content)
              : content;
    await fs.writeFile(filePath, output);
}

module.exports = { getSaveDialogOptions, writeExport };
