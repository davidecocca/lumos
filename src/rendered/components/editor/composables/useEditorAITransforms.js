import fixGrammarPrompt from '../../../prompts/fixGrammarPrompt'
import formatTextPrompt from '../../../prompts/formatTextPrompt'
import improveWritingPrompt from '../../../prompts/improveWritingPrompt'
import makeShorterPrompt from '../../../prompts/makeShorterPrompt'
import makeLongerPrompt from '../../../prompts/makeLongerPrompt'
import simplifyLanguagePrompt from '../../../prompts/simplifyLanguagePrompt'
import changeTonePrompt from '../../../prompts/changeTonePrompt'
import translateToPrompt from '../../../prompts/translateToPrompt'
import editWithAIPrompt from '../../../prompts/editWithAIPrompt'
import { createLlmService } from '../../../services/llmService'
import { clearInlineEditAIPreview, setInlineEditAIPreview } from '../inline-ai/inlineEditAIDecorations'
import InlineEditAIInput from '../inline-ai/InlineEditAIInput.vue'
import { autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom'
import { marked, Renderer } from 'marked'
import { VueRenderer } from '@tiptap/vue-3'
import { reactive, watch } from 'vue'

export const supportedTones = [
    { key: 'professional', icon: 'ph-briefcase', label: 'Professional' },
    { key: 'friendly', icon: 'ph-smiley', label: 'Friendly' },
    { key: 'empathetic', icon: 'ph-handshake', label: 'Empathetic' },
    { key: 'persuasive', icon: 'ph-megaphone', label: 'Persuasive' },
    { key: 'casual', icon: 'ph-smiley-wink', label: 'Casual' },
]

export const supportedLanguages = [
    { key: 'english', icon: '🇺🇸', label: 'English' },
    { key: 'italian', icon: '🇮🇹', label: 'Italian' },
    { key: 'spanish', icon: '🇪🇸', label: 'Spanish' },
    { key: 'french', icon: '🇫🇷', label: 'French' },
    { key: 'german', icon: '🇩🇪', label: 'German' },
    { key: 'portuguese', icon: '🇧🇷', label: 'Portuguese' },
]

const createEditorLlmService = (prompt) => createLlmService(prompt, 'editor')

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

export function useEditorAITransforms({
    editor,
    isLoading,
}) {
    let fixGrammarLLMService = null
    let formatTextLLMService = null
    let improveWritingLLMService = null
    let makeShorterLLMService = null
    let makeLongerLLMService = null
    let simplifyLanguageLLMService = null
    let inlineEditRequestId = 0
    let inlineEditComponent = null
    let inlineEditPopup = null
    let cleanupInlineEditAutoUpdate = null
    let removeInlineEditOutsidePointerListener = null

    const inlineAIEdit = reactive({
        active: false,
        isLoading: false,
        prompt: '',
        editedText: '',
        from: null,
        to: null,
        originalText: '',
    })

    const getInlineEditSelectionRect = () => {
        if (
            !editor.value
            || inlineAIEdit.from === null
            || inlineAIEdit.to === null
        ) {
            return null
        }

        const fromCoords = editor.value.view.coordsAtPos(inlineAIEdit.from)
        const toCoords = editor.value.view.coordsAtPos(inlineAIEdit.to)
        const top = Math.min(fromCoords.top, toCoords.top)
        const bottom = Math.max(fromCoords.bottom, toCoords.bottom)
        const left = Math.min(fromCoords.left, toCoords.left)
        const right = Math.max(fromCoords.right, toCoords.right)

        return {
            width: Math.max(1, right - left),
            height: Math.max(1, bottom - top),
            top,
            right,
            bottom,
            left,
            x: left,
            y: top,
        }
    }

    const createInlineEditVirtualElement = () => ({
        getBoundingClientRect: () => getInlineEditSelectionRect() || {
            width: 1,
            height: 1,
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            x: 0,
            y: 0,
        },
    })

    const updateInlineEditPopupPosition = async () => {
        if (!inlineEditPopup || !editor.value || editor.value.isDestroyed) {
            return
        }

        const { x, y } = await computePosition(
            createInlineEditVirtualElement(),
            inlineEditPopup,
            {
                placement: 'bottom-start',
                strategy: 'fixed',
                middleware: [
                    offset(10),
                    flip(),
                    shift({ padding: 12 }),
                ],
            }
        )

        Object.assign(inlineEditPopup.style, {
            left: `${x}px`,
            top: `${y}px`,
        })
    }

    const updateInlineEditPopupProps = () => {
        inlineEditComponent?.updateProps({
            loading: inlineAIEdit.isLoading,
            editedText: inlineAIEdit.editedText,
            onSubmit: submitInlineAIEdit,
            onApply: applyInlineAIEdit,
            onReject: rejectInlineAIEdit,
        })
    }

    const destroyInlineEditPopup = () => {
        cleanupInlineEditAutoUpdate?.()
        cleanupInlineEditAutoUpdate = null
        removeInlineEditOutsidePointerListener?.()
        removeInlineEditOutsidePointerListener = null

        if (inlineEditPopup?.parentNode) {
            inlineEditPopup.parentNode.removeChild(inlineEditPopup)
        }

        inlineEditPopup = null
        inlineEditComponent?.destroy()
        inlineEditComponent = null
    }

    const bindInlineEditOutsidePointerListener = () => {
        removeInlineEditOutsidePointerListener?.()

        const onPointerDown = (event) => {
            if (
                !inlineEditPopup
                || inlineEditPopup.contains(event.target)
                || inlineAIEdit.isLoading
                || inlineAIEdit.editedText
            ) {
                return
            }

            rejectInlineAIEdit()
        }

        document.addEventListener('pointerdown', onPointerDown, true)
        removeInlineEditOutsidePointerListener = () => {
            document.removeEventListener('pointerdown', onPointerDown, true)
        }
    }

    const openInlineEditPopup = () => {
        if (!editor.value || editor.value.isDestroyed) {
            return
        }

        destroyInlineEditPopup()

        inlineEditComponent = new VueRenderer(InlineEditAIInput, {
            editor: editor.value,
            props: {
                loading: inlineAIEdit.isLoading,
                editedText: inlineAIEdit.editedText,
                onSubmit: submitInlineAIEdit,
                onApply: applyInlineAIEdit,
                onReject: rejectInlineAIEdit,
            },
        })

        inlineEditPopup = document.createElement('div')
        Object.assign(inlineEditPopup.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            zIndex: '1600',
        })
        inlineEditPopup.appendChild(inlineEditComponent.element)
        document.body.appendChild(inlineEditPopup)

        cleanupInlineEditAutoUpdate = autoUpdate(
            createInlineEditVirtualElement(),
            inlineEditPopup,
            () => {
                void updateInlineEditPopupPosition()
            }
        )

        bindInlineEditOutsidePointerListener()
        void updateInlineEditPopupPosition()
        void inlineEditComponent.ref?.focus?.()
    }

    try {
        fixGrammarLLMService = createEditorLlmService(fixGrammarPrompt)
        formatTextLLMService = createEditorLlmService(formatTextPrompt)
        improveWritingLLMService = createEditorLlmService(improveWritingPrompt)
        makeShorterLLMService = createEditorLlmService(makeShorterPrompt)
        makeLongerLLMService = createEditorLlmService(makeLongerPrompt)
        simplifyLanguageLLMService = createEditorLlmService(simplifyLanguagePrompt)
    } catch (error) {
        console.error('Error initializing editor AI services:', error)
    }

    const getSelectionContext = (separator = ' ') => {
        if (!editor.value) {
            console.error('Editor not ready')
            return null
        }

        const { state } = editor.value.view
        const { from, to } = state.selection
        const isTextSelected = from !== to
        const text = isTextSelected
            ? state.doc.textBetween(from, to, separator)
            : state.doc.textContent

        return {
            state,
            from,
            to,
            text,
            isTextSelected,
        }
    }

    const replaceSelection = ({ state, from, to, isTextSelected }, content) => {
        const range = isTextSelected
            ? { from, to }
            : { from: 0, to: state.doc.content.size }

        editor.value
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent(content)
            .run()
    }

    const streamSelectionReplacement = async (serviceFactory) => {
        const context = getSelectionContext()
        if (!context) return

        rejectInlineAIEdit()
        editor.value.commands.blur()
        isLoading.value = true

        try {
            const service = serviceFactory()
            const stream = await service.stream(context.text)
            let streamedText = ''
            let firstChunk = true

            for await (const chunk of stream) {
                streamedText += chunk
                if (firstChunk) {
                    replaceSelection(context, streamedText)
                    firstChunk = false
                } else {
                    editor.value.chain().focus().insertContent(chunk).run()
                }
            }
        } catch (error) {
            console.error('Failed to get response:', error)
        } finally {
            isLoading.value = false
        }
    }

    const generateSelectionReplacement = async (service) => {
        const context = getSelectionContext()
        if (!context) return

        rejectInlineAIEdit()
        editor.value.commands.blur()
        isLoading.value = true

        try {
            const response = await service.generate(context.text)
            await new Promise(resolve => setTimeout(resolve, 100))
            replaceSelection(context, response)
        } catch (error) {
            console.error('Failed to get response:', error)
        } finally {
            isLoading.value = false
        }
    }

    const startInlineAIEdit = () => {
        const context = getSelectionContext('\n')
        if (!context || !context.isTextSelected) return

        inlineEditRequestId += 1
        clearInlineEditAIPreview(editor.value)

        inlineAIEdit.active = true
        inlineAIEdit.isLoading = false
        inlineAIEdit.prompt = ''
        inlineAIEdit.editedText = ''
        inlineAIEdit.from = context.from
        inlineAIEdit.to = context.to
        inlineAIEdit.originalText = context.text

        editor.value.view.dispatch(editor.value.state.tr.setMeta('inlineEditAI', {
            type: 'openPopup',
        }))
        openInlineEditPopup()
    }

    const updateInlineEditPreview = () => {
        if (!inlineAIEdit.active || !inlineAIEdit.editedText) {
            clearInlineEditAIPreview(editor.value)
            return
        }

        setInlineEditAIPreview(editor.value, {
            from: inlineAIEdit.from,
            to: inlineAIEdit.to,
            editedText: inlineAIEdit.editedText,
        })
    }

    const submitInlineAIEdit = async (prompt) => {
        if (!editor.value || !inlineAIEdit.active || inlineAIEdit.isLoading) {
            return
        }

        const requestId = ++inlineEditRequestId
        inlineAIEdit.prompt = prompt
        inlineAIEdit.editedText = ''
        inlineAIEdit.isLoading = true
        isLoading.value = true
        clearInlineEditAIPreview(editor.value)
        updateInlineEditPopupProps()
        void updateInlineEditPopupPosition()

        try {
            const service = createEditorLlmService(editWithAIPrompt(prompt))
            const stream = await service.stream(inlineAIEdit.originalText)

            for await (const chunk of stream) {
                if (requestId !== inlineEditRequestId || !chunk || !editor.value || editor.value.isDestroyed) {
                    continue
                }

                inlineAIEdit.editedText += chunk
                updateInlineEditPopupProps()
                updateInlineEditPreview()
                void updateInlineEditPopupPosition()
            }
        } catch (error) {
            console.error('Failed to edit selected text with AI:', error)
        } finally {
            if (requestId === inlineEditRequestId) {
                inlineAIEdit.isLoading = false
                isLoading.value = false
                updateInlineEditPopupProps()
                updateInlineEditPreview()
                void updateInlineEditPopupPosition()
            }
        }
    }

    const rejectInlineAIEdit = () => {
        const wasInlineEditLoading = inlineAIEdit.isLoading

        inlineEditRequestId += 1
        clearInlineEditAIPreview(editor.value)
        destroyInlineEditPopup()

        inlineAIEdit.active = false
        inlineAIEdit.isLoading = false
        inlineAIEdit.prompt = ''
        inlineAIEdit.editedText = ''
        inlineAIEdit.from = null
        inlineAIEdit.to = null
        inlineAIEdit.originalText = ''

        if (wasInlineEditLoading) {
            isLoading.value = false
        }
    }

    const applyInlineAIEdit = () => {
        if (
            !editor.value
            || !inlineAIEdit.active
            || inlineAIEdit.isLoading
            || !inlineAIEdit.editedText
            || inlineAIEdit.from === null
            || inlineAIEdit.to === null
        ) {
            return
        }

        const editedText = inlineAIEdit.editedText
        const from = inlineAIEdit.from
        const to = inlineAIEdit.to

        clearInlineEditAIPreview(editor.value)
        editor.value
            .chain()
            .focus()
            .deleteRange({ from, to })
            .insertContent(markdownToEditorHtml(editedText))
            .run()

        rejectInlineAIEdit()
    }

    watch(editor, (currentEditor, previousEditor, onCleanup) => {
        if (!currentEditor) {
            return
        }

        const clearIfSelectionMoved = ({ editor: updatedEditor }) => {
            if (!inlineAIEdit.active || inlineAIEdit.from === null || inlineAIEdit.to === null) {
                return
            }

            const { from, to } = updatedEditor.state.selection

            if (from !== inlineAIEdit.from || to !== inlineAIEdit.to) {
                rejectInlineAIEdit()
            }
        }

        currentEditor.on('selectionUpdate', clearIfSelectionMoved)
        currentEditor.on('destroy', rejectInlineAIEdit)

        onCleanup(() => {
            currentEditor.off('selectionUpdate', clearIfSelectionMoved)
            currentEditor.off('destroy', rejectInlineAIEdit)
            destroyInlineEditPopup()
        })
    }, { immediate: true })

    return {
        inlineAIEdit,
        startInlineAIEdit,
        submitInlineAIEdit,
        applyInlineAIEdit,
        rejectInlineAIEdit,
        aiFixGrammar: () => streamSelectionReplacement(() => fixGrammarLLMService),
        aiFormatText: () => generateSelectionReplacement(formatTextLLMService),
        aiImproveWriting: () => streamSelectionReplacement(() => improveWritingLLMService),
        aiMakeShorter: () => streamSelectionReplacement(() => makeShorterLLMService),
        aiMakeLonger: () => streamSelectionReplacement(() => makeLongerLLMService),
        aiSimplify: () => streamSelectionReplacement(() => simplifyLanguageLLMService),
        aiChangeTone: (tone) => streamSelectionReplacement(() => createEditorLlmService(changeTonePrompt(tone))),
        aiTranslateTo: (language) => streamSelectionReplacement(() => createEditorLlmService(translateToPrompt(language))),
    }
}
