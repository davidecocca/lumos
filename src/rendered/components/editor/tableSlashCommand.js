import { Extension } from '@tiptap/core'
import { PluginKey } from '@tiptap/pm/state'
import { autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom'
import Suggestion from '@tiptap/suggestion'
import { VueRenderer } from '@tiptap/vue-3'
import TableSlashMenu from './TableSlashMenu.vue'

export const tableSlashCommandPluginKey = new PluginKey('tableSlashCommand')
export const OPEN_YOUTUBE_DIALOG_EVENT = 'lumos-open-youtube-embed-dialog'

const slashItems = [
    {
        title: 'Table',
        subtitle: 'Insert a 3x3 table with a header row',
        icon: 'ph-table',
        command: ({ editor, range }) => editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertTable({
                rows: 3,
                cols: 3,
                withHeaderRow: true,
            })
            .run(),
    },
    {
        title: 'Horizontal rule',
        subtitle: 'Insert a divider line',
        icon: 'ph-minus',
        command: ({ editor, range }) => editor
            .chain()
            .focus()
            .deleteRange(range)
            .setHorizontalRule()
            .run(),
    },
    {
        title: 'Details',
        subtitle: 'Insert a collapsible details block',
        icon: 'ph-caret-right',
        command: ({ editor, range }) => editor
            .chain()
            .focus()
            .deleteRange(range)
            .setDetails()
            .updateAttributes('details', {
                open: true,
            })
            .run(),
    },
    {
        title: 'YouTube video',
        subtitle: 'Embed a YouTube video from a pasted URL',
        icon: 'ph-youtube-logo',
        command: ({ editor, range }) => {
            editor
                .chain()
                .focus()
                .deleteRange(range)
                .run()

            window.dispatchEvent(new CustomEvent(OPEN_YOUTUBE_DIALOG_EVENT))

            return true
        },
    },
]

export default Extension.create({
    name: 'tableSlashCommand',

    addOptions() {
        return {
            suggestion: {
                char: '/',
                pluginKey: tableSlashCommandPluginKey,
                allowSpaces: false,
                startOfLine: false,
                items: ({ query }) => {
                    const normalizedQuery = query.trim().toLowerCase()

                    if (!normalizedQuery) {
                        return slashItems
                    }

                    return slashItems.filter((item) => (
                        item.title.toLowerCase().includes(normalizedQuery)
                    ))
                },
                command: ({ editor, range, props }) => {
                    return props.command({ editor, range })
                },
                allow: ({ editor, state, range }) => {
                    const parentNode = state.selection.$from.parent
                    const textBeforeCursor = parentNode.textContent.slice(0, state.selection.$from.parentOffset)

                    return editor.isEditable
                        && parentNode.type.name === 'paragraph'
                        && !editor.isActive('table')
                        && !editor.isActive('codeBlock')
                        && textBeforeCursor.startsWith('/')
                        && range.from === state.selection.$from.start()
                },
                render: () => {
                    let component = null
                    let popup = null
                    let cleanupAutoUpdate = null

                    const destroyPopup = () => {
                        cleanupAutoUpdate?.()
                        cleanupAutoUpdate = null

                        if (popup?.parentNode) {
                            popup.parentNode.removeChild(popup)
                        }

                        popup = null
                    }

                    const createVirtualElement = (clientRect) => ({
                        getBoundingClientRect: () => clientRect(),
                    })

                    const updatePopupPosition = async (props) => {
                        if (!popup || !props.clientRect) {
                            return
                        }

                        const { x, y } = await computePosition(
                            createVirtualElement(props.clientRect),
                            popup,
                            {
                                placement: 'bottom-start',
                                strategy: 'fixed',
                                middleware: [
                                    offset(8),
                                    flip(),
                                    shift({ padding: 8 }),
                                ],
                            }
                        )

                        Object.assign(popup.style, {
                            left: `${x}px`,
                            top: `${y}px`,
                        })
                    }

                    const bindPopupAutoUpdate = (props) => {
                        cleanupAutoUpdate?.()

                        if (!popup || !props.clientRect) {
                            cleanupAutoUpdate = null
                            return
                        }

                        cleanupAutoUpdate = autoUpdate(
                            createVirtualElement(props.clientRect),
                            popup,
                            () => {
                                void updatePopupPosition(props)
                            }
                        )
                    }

                    return {
                        onStart: (props) => {
                            component = new VueRenderer(TableSlashMenu, {
                                editor: props.editor,
                                props,
                            })

                            if (!props.clientRect) {
                                return
                            }

                            popup = document.createElement('div')
                            Object.assign(popup.style, {
                                position: 'fixed',
                                top: '0',
                                left: '0',
                                zIndex: '1600',
                            })
                            popup.appendChild(component.element)
                            document.body.appendChild(popup)

                            bindPopupAutoUpdate(props)
                            void updatePopupPosition(props)
                        },

                        onUpdate: (props) => {
                            component?.updateProps(props)

                            if (!popup || !props.clientRect) {
                                destroyPopup()
                                return
                            }

                            bindPopupAutoUpdate(props)
                            void updatePopupPosition(props)
                        },

                        onKeyDown: (props) => {
                            if (props.event.key === 'Escape') {
                                destroyPopup()
                                return true
                            }

                            return component?.ref?.onKeyDown?.(props) ?? false
                        },

                        onExit: () => {
                            destroyPopup()
                            component?.destroy()
                            component = null
                        },
                    }
                },
            },
        }
    },

    addProseMirrorPlugins() {
        return [
            Suggestion({
                editor: this.editor,
                ...this.options.suggestion,
            }),
        ]
    },
})
