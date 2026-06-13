import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom'
import { VueRenderer } from '@tiptap/vue-3'
import { marked, Renderer } from 'marked'
import InlineGenerateAIInput from './InlineGenerateAIInput.vue'
import { createLlmService } from '../../../services/llmService'
import generateWithAIPrompt from '../../../prompts/generateWithAIPrompt'

export const inlineGenerateAIPluginKey = new PluginKey('inlineGenerateAI')

const markdownRenderer = new Renderer()
const escapeHtml = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

markdownRenderer.html = ({ text }) => escapeHtml(text)

const markdownToEditorHtml = (markdown) => marked.parse(markdown, {
    async: false,
    breaks: true,
    renderer: markdownRenderer,
})

const createVirtualElement = (clientRect) => ({
    getBoundingClientRect: () => clientRect,
})

const getCursorRect = (view, position) => {
    const coords = view.coordsAtPos(position)

    return {
        width: 0,
        height: coords.bottom - coords.top,
        top: coords.top,
        right: coords.left,
        bottom: coords.bottom,
        left: coords.left,
        x: coords.left,
        y: coords.top,
    }
}

/**
 * Trigger condition: the user presses plain space, the selection is empty,
 * the current node is an empty paragraph, the cursor is at offset 0, and the editor is
 * not inside a table or code block
 */
const isEmptyParagraphSpace = ({ editor, event, state }) => {
    if (
        !editor.isEditable
        || event.defaultPrevented
        || event.isComposing
        || event.metaKey
        || event.ctrlKey
        || event.altKey
        || event.shiftKey
        || event.key !== ' '
    ) {
        return false
    }

    const { selection } = state
    const parentNode = selection.$from.parent

    return selection.empty
        && parentNode.type.name === 'paragraph'
        && parentNode.content.size === 0
        && selection.$from.parentOffset === 0
        && !editor.isActive('table')
        && !editor.isActive('codeBlock')
}

export default Extension.create({
    name: 'inlineGenerateAI',

    addProseMirrorPlugins() {
        const editor = this.editor
        let component = null
        let popup = null
        let cleanupAutoUpdate = null
        let insertPosition = null
        let isGenerating = false
        let generatedText = ''
        let removeOutsidePointerListener = null

        const updateComponentProps = (nextProps = {}) => {
            component?.updateProps({
                loading: isGenerating,
                generatedText,
                onSubmit: streamInlineGeneration,
                onInsert: insertGeneratedText,
                onCancel: () => destroyPopup({ focusEditor: true }),
                ...nextProps,
            })
        }

        const destroyPopup = ({ focusEditor = false } = {}) => {
            cleanupAutoUpdate?.()
            cleanupAutoUpdate = null
            removeOutsidePointerListener?.()
            removeOutsidePointerListener = null

            if (popup?.parentNode) {
                popup.parentNode.removeChild(popup)
            }

            popup = null
            component?.destroy()
            component = null
            insertPosition = null
            isGenerating = false
            generatedText = ''

            if (focusEditor && !editor.isDestroyed) {
                editor.chain().focus().run()
            }
        }

        const bindOutsidePointerListener = () => {
            removeOutsidePointerListener?.()

            const onPointerDown = (event) => {
                if (!popup || popup.contains(event.target) || isGenerating || generatedText) {
                    return
                }

                destroyPopup()
            }

            document.addEventListener('pointerdown', onPointerDown, true)
            removeOutsidePointerListener = () => {
                document.removeEventListener('pointerdown', onPointerDown, true)
            }
        }

        const updatePopupPosition = async () => {
            if (!popup || insertPosition === null || editor.isDestroyed) {
                return
            }

            const cursorRect = getCursorRect(editor.view, insertPosition)
            const { x, y } = await computePosition(
                createVirtualElement(cursorRect),
                popup,
                {
                    placement: 'bottom-start',
                    strategy: 'fixed',
                    middleware: [
                        offset(12),
                        flip(),
                        shift({ padding: 12 }),
                    ],
                }
            )

            Object.assign(popup.style, {
                left: `${x}px`,
                top: `${y}px`,
            })
        }

        const bindPopupAutoUpdate = () => {
            cleanupAutoUpdate?.()

            if (!popup || insertPosition === null || editor.isDestroyed) {
                cleanupAutoUpdate = null
                return
            }

            const virtualElement = createVirtualElement(getCursorRect(editor.view, insertPosition))
            cleanupAutoUpdate = autoUpdate(
                virtualElement,
                popup,
                () => {
                    void updatePopupPosition()
                }
            )
        }

        const insertGeneratedText = () => {
            if (!generatedText || insertPosition === null || editor.isDestroyed) {
                return
            }

            editor
                .chain()
                .focus()
                .setTextSelection(insertPosition)
                .insertContent(markdownToEditorHtml(generatedText))
                .run()

            destroyPopup({ focusEditor: true })
        }

        const streamInlineGeneration = async (prompt) => {
            if (isGenerating || insertPosition === null || editor.isDestroyed) {
                return
            }

            isGenerating = true
            generatedText = ''
            updateComponentProps()
            void updatePopupPosition()

            try {
                const service = createLlmService(generateWithAIPrompt, 'editor')
                const stream = service.stream(prompt)

                for await (const chunk of stream) {
                    if (!chunk || editor.isDestroyed) {
                        continue
                    }

                    generatedText += chunk
                    updateComponentProps()
                    void updatePopupPosition()
                }
            } catch (error) {
                console.error('Failed to generate inline AI content:', error)
            } finally {
                isGenerating = false
                updateComponentProps()
                void updatePopupPosition()
            }
        }

        const openPopup = (position) => {
            destroyPopup()

            insertPosition = position
            component = new VueRenderer(InlineGenerateAIInput, {
                editor,
                props: {
                    loading: false,
                    generatedText: '',
                    onSubmit: streamInlineGeneration,
                    onInsert: insertGeneratedText,
                    onCancel: () => destroyPopup({ focusEditor: true }),
                },
            })

            popup = document.createElement('div')
            Object.assign(popup.style, {
                position: 'fixed',
                top: '0',
                left: '0',
                zIndex: '1600',
            })
            popup.appendChild(component.element)
            document.body.appendChild(popup)

            bindPopupAutoUpdate()
            bindOutsidePointerListener()
            void updatePopupPosition()
            void component.ref?.focus?.()
        }

        return [
            new Plugin({
                key: inlineGenerateAIPluginKey,
                props: {
                    handleKeyDown: (view, event) => {
                        if (event.key === 'Escape' && popup) {
                            event.preventDefault()
                            destroyPopup({ focusEditor: true })
                            return true
                        }

                        if (popup || !isEmptyParagraphSpace({ editor, event, state: view.state })) {
                            return false
                        }

                        event.preventDefault()
                        openPopup(view.state.selection.from)
                        return true
                    },
                },
                view: () => ({
                    destroy: () => {
                        destroyPopup()
                    },
                }),
            }),
        ]
    },
})
