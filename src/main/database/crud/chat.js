const db = require('../db');
const { getActiveWorkspaceId } = require('../../workspaceContext');

function deleteNoteChatConversations(noteId) {
    return new Promise((resolve, reject) => {
        db.all(
            `
            SELECT id
            FROM chat_conversations
            WHERE scope = 'note' AND note_id = ?
        `,
            [noteId],
            (selectErr, rows) => {
                if (selectErr) {
                    reject(selectErr);
                    return;
                }

                const conversationIds = rows.map((row) => row.id);
                if (conversationIds.length === 0) {
                    resolve();
                    return;
                }

                const placeholders = conversationIds.map(() => '?').join(',');
                db.run(
                    `DELETE FROM chat_messages WHERE conversation_id IN (${placeholders})`,
                    conversationIds,
                    (messageErr) => {
                        if (messageErr) {
                            reject(messageErr);
                            return;
                        }

                        db.run(
                            `DELETE FROM chat_conversations WHERE id IN (${placeholders})`,
                            conversationIds,
                            (conversationErr) => {
                                if (conversationErr) reject(conversationErr);
                                else resolve();
                            },
                        );
                    },
                );
            },
        );
    });
}

function normalizeChatScope(scope) {
    return scope === 'note' ? 'note' : 'all';
}

function parseMessageSources(message) {
    if (!message.sources_json) return [];

    try {
        const parsed = JSON.parse(message.sources_json);
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        return [];
    }
}

function mapConversation(row) {
    if (!row) return null;

    return {
        id: row.id,
        scope: row.scope,
        noteId: row.note_id,
        title: row.title,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function mapChatMessage(row) {
    return {
        id: row.id,
        conversationId: row.conversation_id,
        role: row.role,
        content: row.content,
        sources: parseMessageSources(row),
        createdAt: row.created_at,
    };
}

function createChatConversation(
    { scope = 'all', noteId = null, title = '' },
    callback,
) {
    const normalizedScope = normalizeChatScope(scope);
    const normalizedNoteId = normalizedScope === 'note' ? noteId : null;

    db.run(
        `
        INSERT INTO chat_conversations (workspace_id, scope, note_id, title)
        VALUES (?, ?, ?, ?)
    `,
        [
            getActiveWorkspaceId(),
            normalizedScope,
            normalizedNoteId,
            title || 'New chat',
        ],
        function (err) {
            if (err) {
                callback(err);
                return;
            }

            getChatConversation(this.lastID, callback);
        },
    );
}

function listChatConversations(
    { scope = 'all', noteId = null, limit = 20 } = {},
    callback,
) {
    const normalizedScope = normalizeChatScope(scope);
    const safeLimit = Math.max(1, Number(limit) || 20);
    const params = [getActiveWorkspaceId(), normalizedScope];
    let where = `workspace_id = ? AND scope = ?`;

    if (normalizedScope === 'note') {
        where += ` AND note_id = ?`;
        params.push(noteId);
    }

    params.push(safeLimit);

    db.all(
        `
        SELECT id, scope, note_id, title, created_at, updated_at
        FROM chat_conversations
        WHERE ${where}
        ORDER BY updated_at DESC, id DESC
        LIMIT ?
    `,
        params,
        (err, rows) => {
            callback(err, rows ? rows.map(mapConversation) : []);
        },
    );
}

function getChatConversation(id, callback) {
    db.get(
        `
        SELECT id, scope, note_id, title, created_at, updated_at
        FROM chat_conversations
        WHERE id = ? AND workspace_id = ?
    `,
        [id, getActiveWorkspaceId()],
        (conversationErr, conversation) => {
            if (conversationErr) {
                callback(conversationErr);
                return;
            }

            if (!conversation) {
                callback(null, null);
                return;
            }

            db.all(
                `
            SELECT id, conversation_id, role, content, sources_json, created_at
            FROM chat_messages
            WHERE conversation_id = ?
            ORDER BY created_at ASC, id ASC
        `,
                [id],
                (messagesErr, messages) => {
                    if (messagesErr) {
                        callback(messagesErr);
                        return;
                    }

                    callback(null, {
                        ...mapConversation(conversation),
                        messages: messages.map(mapChatMessage),
                    });
                },
            );
        },
    );
}

function appendChatMessage(
    { conversationId, role, content, sources = [] },
    callback,
) {
    const normalizedRole = role === 'assistant' ? 'assistant' : 'user';
    const sourcesJson =
        normalizedRole === 'assistant' ? JSON.stringify(sources || []) : null;

    db.run(
        `
        INSERT INTO chat_messages (conversation_id, role, content, sources_json)
        SELECT ?, ?, ?, ?
        WHERE EXISTS (
            SELECT 1 FROM chat_conversations
            WHERE id = ? AND workspace_id = ?
        )
    `,
        [
            conversationId,
            normalizedRole,
            content || '',
            sourcesJson,
            conversationId,
            getActiveWorkspaceId(),
        ],
        function (err) {
            if (err) {
                callback(err);
                return;
            }

            if (this.changes === 0) {
                callback(new Error('Chat conversation not found.'));
                return;
            }

            db.run(
                `
            UPDATE chat_conversations
            SET updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND workspace_id = ?
        `,
                [conversationId, getActiveWorkspaceId()],
                (updateErr) => {
                    if (updateErr) {
                        callback(updateErr);
                        return;
                    }

                    callback(null, this.lastID);
                },
            );
        },
    );
}

function updateChatConversation({ id, title }, callback) {
    db.run(
        `
        UPDATE chat_conversations
        SET title = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND workspace_id = ?
    `,
        [title || 'New chat', id, getActiveWorkspaceId()],
        function (err) {
            callback(err, this ? this.changes : 0);
        },
    );
}

function deleteChatConversation(id, callback) {
    db.run(
        `DELETE FROM chat_messages WHERE conversation_id IN (
            SELECT id FROM chat_conversations WHERE id = ? AND workspace_id = ?
        )`,
        [id, getActiveWorkspaceId()],
        (messageErr) => {
            if (messageErr) {
                callback(messageErr);
                return;
            }

            db.run(
                `DELETE FROM chat_conversations WHERE id = ? AND workspace_id = ?`,
                [id, getActiveWorkspaceId()],
                function (conversationErr) {
                    callback(conversationErr, this ? this.changes : 0);
                },
            );
        },
    );
}

module.exports = {
    deleteNoteChatConversations,
    createChatConversation,
    listChatConversations,
    getChatConversation,
    appendChatMessage,
    updateChatConversation,
    deleteChatConversation,
};
