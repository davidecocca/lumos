import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { diffWordsWithSpace } from 'diff';

export const inlineEditAIPluginKey = new PluginKey('inlineEditAI');

const escapeHtml = (value) =>
    String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const getOriginalTextMap = ({ doc, from, to }) => {
    const segments = [];
    let text = '';

    doc.nodesBetween(from, to, (node, pos) => {
        if (!node.isText) {
            return;
        }

        const textFrom = Math.max(from, pos);
        const textTo = Math.min(to, pos + node.text.length);
        const segmentText = node.text.slice(textFrom - pos, textTo - pos);
        const textStart = text.length;

        text += segmentText;
        segments.push({
            from: textFrom,
            to: textTo,
            textStart,
            textEnd: text.length,
        });
    });

    const positionAtOffset = (offset) => {
        if (!segments.length || offset <= 0) {
            return from;
        }

        if (offset >= text.length) {
            return to;
        }

        const segment = segments.find(
            ({ textStart, textEnd }) =>
                offset >= textStart && offset <= textEnd,
        );

        if (segment) {
            return segment.from + offset - segment.textStart;
        }

        const nextSegment = segments.find(
            ({ textStart }) => offset < textStart,
        );
        return nextSegment?.from ?? to;
    };

    return {
        text,
        positionAtOffset,
    };
};

const groupedDecorations = ({ doc, from, to, editedText }) => {
    const original = getOriginalTextMap({ doc, from, to });

    if (!original.text || !editedText) {
        return [];
    }

    const decorations = [];
    const changes = diffWordsWithSpace(original.text, editedText);
    let originalOffset = 0;

    const addInsertionWidget = (position, value) => {
        if (!value.trim()) {
            return;
        }

        const widget = document.createElement('span');
        widget.className = 'lumos-inline-edit-ai-addition';
        widget.innerHTML = escapeHtml(value);

        decorations.push(
            Decoration.widget(position, widget, {
                side: -1,
                key: `inline-edit-ai-addition-${position}-${decorations.length}`,
            }),
        );
    };

    changes.forEach((change) => {
        if (change.added) {
            addInsertionWidget(
                original.positionAtOffset(originalOffset),
                change.value,
            );
            return;
        }

        const nextOffset = originalOffset + change.value.length;

        if (change.removed) {
            const deleteFrom = original.positionAtOffset(originalOffset);
            const deleteTo = original.positionAtOffset(nextOffset);
            if (deleteFrom < deleteTo) {
                decorations.push(
                    Decoration.inline(deleteFrom, deleteTo, {
                        class: 'lumos-inline-edit-ai-deletion',
                    }),
                );
            }
        }

        originalOffset = nextOffset;
    });

    return decorations;
};

export const setInlineEditAIPreview = (editor, payload) => {
    if (!editor || editor.isDestroyed) {
        return;
    }

    editor.view.dispatch(
        editor.state.tr.setMeta(inlineEditAIPluginKey, {
            type: 'setPreview',
            ...payload,
        }),
    );
};

export const clearInlineEditAIPreview = (editor) => {
    if (!editor || editor.isDestroyed) {
        return;
    }

    editor.view.dispatch(
        editor.state.tr.setMeta(inlineEditAIPluginKey, {
            type: 'clearPreview',
        }),
    );
};

export default Extension.create({
    name: 'inlineEditAI',

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: inlineEditAIPluginKey,
                state: {
                    init: () => DecorationSet.empty,
                    apply: (transaction, decorationSet, oldState, newState) => {
                        const meta = transaction.getMeta(inlineEditAIPluginKey);

                        if (meta?.type === 'clearPreview') {
                            return DecorationSet.empty;
                        }

                        if (meta?.type === 'setPreview') {
                            return DecorationSet.create(
                                newState.doc,
                                groupedDecorations({
                                    doc: newState.doc,
                                    from: meta.from,
                                    to: meta.to,
                                    editedText: meta.editedText,
                                }),
                            );
                        }

                        if (transaction.docChanged) {
                            return DecorationSet.empty;
                        }

                        return decorationSet.map(
                            transaction.mapping,
                            transaction.doc,
                        );
                    },
                },
                props: {
                    decorations: (state) =>
                        inlineEditAIPluginKey.getState(state),
                },
            }),
        ];
    },
});
