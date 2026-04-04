import Youtube from '@tiptap/extension-youtube'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import EmbeddedYoutubeNodeView from './EmbeddedYoutubeNodeView.vue'

export default Youtube.extend({
    draggable: false,

    addOptions() {
        return {
            ...this.parent?.(),
            resize: {
                enabled: true,
                directions: ['left', 'right'],
                minWidth: 240,
                maxWidth: null,
            },
        }
    },

    addAttributes() {
        return {
            ...this.parent?.(),
            align: {
                default: 'center',
                parseHTML: (element) => element.getAttribute('data-align') || 'center',
                renderHTML: (attributes) => ({
                    'data-align': attributes.align || 'center',
                }),
            },
        }
    },

    addNodeView() {
        return VueNodeViewRenderer(EmbeddedYoutubeNodeView)
    },
})
