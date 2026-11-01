const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { createRequire } = require('node:module');

async function loadModule(relativePath, overrides) {
    const filename = path.resolve(__dirname, relativePath);
    const realRequire = createRequire(filename);
    const module = { exports: {} };
    vm.runInNewContext(
        await fs.readFile(filename, 'utf8'),
        {
            module,
            console,
            require: (id) => overrides[id] || realRequire(id),
        },
        { filename },
    );
    return module.exports;
}

const plain = (value) => JSON.parse(JSON.stringify(value));
const call = (operation, ...args) =>
    new Promise((resolve, reject) =>
        operation(...args, (error, result) =>
            error ? reject(error) : resolve(result),
        ),
    );

async function fixture(t) {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'lumos-crud-'));
    const context = { active: 0 };
    const workspaceContext = {
        DEFAULT_WORKSPACE_ID: 0,
        getActiveWorkspaceId: () => context.active,
    };
    const db = await loadModule('../src/main/database/db.js', {
        '../storagePaths': {
            initializeStorage() {},
            getDatabasePath: () => path.join(directory, 'test.sqlite'),
        },
        '../workspaceContext': workspaceContext,
    });
    t.after(async () => {
        await new Promise((resolve, reject) =>
            db.close((error) => (error ? reject(error) : resolve())),
        );
        await fs.rm(directory, { recursive: true });
    });
    await db.ready;
    const overrides = {
        '../../db': db,
        '../../../workspaceContext': workspaceContext,
    };
    const modules = {};
    for (const [name, file] of [
        ['folders', 'folders'],
        ['noteSearch', 'search'],
        ['vectorSync', 'vectorSync'],
    ]) {
        modules[name] = await loadModule(
            `../src/main/database/crud/notes/${file}.js`,
            overrides,
        );
    }
    modules.chat = await loadModule('../src/main/database/crud/chat.js', {
        '../db': db,
        '../../workspaceContext': workspaceContext,
    });
    const effects = { indexed: [], vectorsDeleted: [], imagesDeleted: [] };
    const vectorStore = {
        deleteNote: async (id) => {
            effects.vectorsDeleted.push(id);
        },
        addNote: async (...args) => {
            effects.added = args;
        },
    };
    modules.notes = await loadModule(
        '../src/main/database/crud/notes/notes.js',
        {
            ...overrides,
            './search': modules.noteSearch,
            '../chat': modules.chat,
            './vectorSync': modules.vectorSync,
            '../../vectorStore': vectorStore,
            '../../../services/vectorIndexer': {
                requestIndex: (id) => effects.indexed.push(id),
            },
            '../../../services/imageService': {
                normalizeNoteContentForStorage: (value) => value,
                collectManagedImagePaths: () => [],
                resolveNoteContentForDisplay: async (value) => value,
                pruneNoteImages: async () => {},
                deleteNoteImages: async (id) => {
                    effects.imagesDeleted.push(id);
                },
            },
        },
    );
    const run = (sql, params = []) =>
        new Promise((resolve, reject) =>
            db.run(sql, params, (error) => (error ? reject(error) : resolve())),
        );
    const all = (sql, params = []) =>
        new Promise((resolve, reject) =>
            db.all(sql, params, (error, rows) =>
                error ? reject(error) : resolve(rows),
            ),
        );
    const folderId = await call(modules.folders.createFolder, 'Folder');
    const document = { type: 'doc', content: [] };
    const noteId = await call(
        modules.notes.createNote,
        folderId,
        'Note',
        document,
        'Original   content',
    );
    return {
        ...modules,
        context,
        effects,
        vectorStore,
        run,
        all,
        folderId,
        noteId,
        document,
    };
}

test('split folder and note CRUD preserves search, metadata, and workspace boundaries', async (t) => {
    const {
        folders,
        notes,
        noteSearch,
        context,
        effects,
        run,
        folderId,
        noteId,
        document,
    } = await fixture(t);
    assert.deepEqual(
        plain((await call(notes.getNote, noteId)).content_json),
        document,
    );
    assert.equal(
        (await call(noteSearch.searchNotes, 'Original', 10))[0].id,
        noteId,
    );
    assert.equal(
        (await call(folders.getFolderContent, folderId))[0].id,
        noteId,
    );
    await call(folders.updateFolder, folderId, 'Renamed folder');
    await call(notes.renameNote, noteId, 'Renamed note');
    await call(notes.updateNote, noteId, 'Topic', document, 'Updated content');
    assert.deepEqual(effects.indexed, [noteId, noteId]);
    assert.equal(
        (await call(noteSearch.searchNotes, 'Updated', 10))[0].title,
        'Renamed note',
    );
    assert.equal(
        (await call(noteSearch.searchNotes, 'Original', 10)).length,
        0,
    );
    await call(notes.setNoteFavorite, noteId, true);
    await call(notes.updateNoteLastViewed, noteId);
    assert.equal((await call(notes.getFavoriteNotes))[0].id, noteId);
    assert.equal((await call(notes.getLastViewedNotes))[0].id, noteId);
    const destination = await call(folders.createFolder, 'Destination');
    await call(notes.moveNoteToFolder, noteId, destination);
    assert.equal((await call(notes.getNote, noteId)).folder_id, destination);
    await run("INSERT INTO workspaces (id, name) VALUES (1, 'Other')");
    context.active = 1;
    assert.equal((await call(notes.listNotes)).length, 0);
    assert.equal((await call(folders.listFolders)).length, 0);
    assert.equal((await call(noteSearch.searchNotes, 'Updated', 10)).length, 0);
    await assert.rejects(
        call(notes.updateNote, noteId, '', document, 'Wrong workspace'),
        /not found/,
    );
});

test('split chat CRUD preserves messages, sources, scope, and note cleanup', async (t) => {
    const { chat, context, run, noteId } = await fixture(t);
    const conversation = await call(chat.createChatConversation, {
        scope: 'note',
        noteId,
        title: 'Chat',
    });
    const sources = [{ noteId, title: 'Note' }];
    await call(chat.appendChatMessage, {
        conversationId: conversation.id,
        role: 'assistant',
        content: 'Answer',
        sources,
    });
    const saved = await call(chat.getChatConversation, conversation.id);
    assert.deepEqual(plain(saved.messages[0].sources), sources);
    assert.equal(saved.noteId, noteId);
    await call(chat.updateChatConversation, {
        id: conversation.id,
        title: 'Renamed',
    });
    assert.equal(
        (await call(chat.listChatConversations, { scope: 'note', noteId }))[0]
            .title,
        'Renamed',
    );
    await run("INSERT INTO workspaces (id, name) VALUES (1, 'Other')");
    context.active = 1;
    assert.equal(await call(chat.getChatConversation, conversation.id), null);
    await assert.rejects(
        call(chat.appendChatMessage, {
            conversationId: conversation.id,
            content: 'Wrong workspace',
        }),
        /not found/,
    );
    context.active = 0;
    await chat.deleteNoteChatConversations(noteId);
    assert.equal(await call(chat.getChatConversation, conversation.id), null);
});

test('note deletion still coordinates search, vector sync, vectors, and image cleanup', async (t) => {
    const { notes, noteSearch, vectorSync, effects, all, noteId } =
        await fixture(t);
    const raw = await call(vectorSync.getNoteRawForIndexing, noteId);
    await call(vectorSync.setNoteVectorSynced, noteId, raw.updated_at);
    assert.equal((await call(vectorSync.getVectorSyncStats)).indexedCount, 1);
    await call(notes.deleteNote, noteId);
    assert.deepEqual(await all('SELECT * FROM vector_sync'), []);
    assert.equal(
        (await call(noteSearch.searchNotes, 'Original', 10)).length,
        0,
    );
    assert.deepEqual(effects.vectorsDeleted, [noteId]);
    assert.deepEqual(effects.imagesDeleted, [noteId]);
    assert.deepEqual(await all('PRAGMA foreign_key_check'), []);
});

test('background indexer uses vectorSync directly without a circular notes dependency', async (t) => {
    const { vectorSync, vectorStore, effects, noteId } = await fixture(t);
    const indexer = await loadModule('../src/main/services/vectorIndexer.js', {
        '../database/vectorStore': vectorStore,
        '../database/crud/notes/vectorSync': vectorSync,
    });
    await indexer.indexNote(noteId);
    assert.equal(effects.added[0], noteId);
    assert.equal(effects.added[3], 0);
    assert.equal((await call(vectorSync.getNotesNeedingVectorSync)).length, 0);
    await call(vectorSync.clearVectorSync);
    assert.equal(
        (await call(vectorSync.getNotesNeedingVectorSync))[0].id,
        noteId,
    );
});
