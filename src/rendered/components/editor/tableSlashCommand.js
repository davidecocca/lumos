import { Extension } from '@tiptap/core'
import { PluginKey } from '@tiptap/pm/state'
import Suggestion from '@tiptap/suggestion'
import { VueRenderer } from '@tiptap/vue-3'
import tippy from 'tippy.js'
import TableSlashMenu from './TableSlashMenu.vue'

export const tableSlashCommandPluginKey = new PluginKey('tableSlashCommand')

const slashItems = [
    {
        title: 'Table',
        subtitle: 'Insert a 3x3 table with a header row',
        icon: 'ph-table',
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
                    editor
                        .chain()
                        .focus()
                        .deleteRange(range)
                        .insertTable({
                            rows: 3,
                            cols: 3,
                            withHeaderRow: true,
                        })
                        .run()

                    return true
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

                    return {
                        onStart: (props) => {
                            component = new VueRenderer(TableSlashMenu, {
                                editor: props.editor,
                                props,
                            })

                            if (!props.clientRect) {
                                return
                            }

                            popup = tippy(document.body, {
                                getReferenceClientRect: props.clientRect,
                                appendTo: () => document.body,
                                content: component.element,
                                interactive: true,
                                placement: 'bottom-start',
                                showOnCreate: true,
                                trigger: 'manual',
                                offset: [0, 8],
                                zIndex: 1600,
                            })
                        },

                        onUpdate: (props) => {
                            component?.updateProps(props)

                            if (!props.clientRect || !popup?.[0]) {
                                return
                            }

                            popup[0].setProps({
                                getReferenceClientRect: props.clientRect,
                            })
                        },

                        onKeyDown: (props) => {
                            if (props.event.key === 'Escape') {
                                popup?.[0]?.hide()
                                return true
                            }

                            return component?.ref?.onKeyDown?.(props) ?? false
                        },

                        onExit: () => {
                            popup?.[0]?.destroy()
                            component?.destroy()
                            popup = null
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
