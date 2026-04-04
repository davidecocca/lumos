import Image from '@tiptap/extension-image'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import ResizableImageNodeView from './ResizableImageNodeView.vue'

export default Image.extend({
    name: 'noteImage',
    draggable: false,

    addOptions() {
        return {
            ...this.parent?.(),
            resize: {
                enabled: true,
                directions: ['left', 'right'],
                minWidth: 120,
                maxWidth: null,
                alwaysPreserveAspectRatio: true,
            },
        }
    },

    addAttributes() {
        return {
            ...this.parent?.(),
            storageSrc: {
                default: null,
            },
            align: {
                default: 'center',
                parseHTML: (element) => element.getAttribute('data-align') || 'center',
                renderHTML: (attributes) => ({
                    'data-align': attributes.align || 'center',
                }),
            },
            width: {
                default: null,
                parseHTML: (element) => {
                    const widthValue = element.getAttribute('data-width') || element.getAttribute('width')
                    return widthValue ? Number(widthValue) : null
                },
                renderHTML: (attributes) => (
                    attributes.width
                        ? {
                            width: attributes.width,
                            'data-width': attributes.width,
                        }
                        : {}
                ),
            },
        }
    },

    addCommands() {
        const parentCommands = this.parent?.() ?? {}

        return {
            ...parentCommands,
            setImage: (attributes) => ({ commands }) => commands.insertContent({
                type: this.name,
                attrs: attributes,
            }),
            setNoteImage: (attributes) => ({ commands }) => commands.insertContent({
                type: this.name,
                attrs: attributes,
            }),
        }
    },

    addNodeView() {
        return VueNodeViewRenderer(ResizableImageNodeView)
    },
})
