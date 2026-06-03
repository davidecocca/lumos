import fixGrammarPrompt from '../../../prompts/fixGrammarPrompt'
import formatTextPrompt from '../../../prompts/formatTextPrompt'
import improveWritingPrompt from '../../../prompts/improveWritingPrompt'
import makeShorterPrompt from '../../../prompts/makeShorterPrompt'
import makeLongerPrompt from '../../../prompts/makeLongerPrompt'
import simplifyLanguagePrompt from '../../../prompts/simplifyLanguagePrompt'
import changeTonePrompt from '../../../prompts/changeTonePrompt'
import translateToPrompt from '../../../prompts/translateToPrompt'
import { createLlmService } from '../../../services/llmService'

export const supportedTones = [
    { key: 'professional', icon: 'ph-briefcase', label: 'Professional' },
    { key: 'friendly', icon: 'ph-smiley', label: 'Friendly' },
    { key: 'empathetic', icon: 'ph-handshake', label: 'Empathetic' },
    { key: 'persuasive', icon: 'ph-sparkle', label: 'Persuasive' },
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

export function useEditorAITransforms({
    editor,
    isLoading,
    selectedText,
    selectionFrom,
    selectionTo,
    editWithAIDialog,
}) {
    let fixGrammarLLMService = null
    let formatTextLLMService = null
    let improveWritingLLMService = null
    let makeShorterLLMService = null
    let makeLongerLLMService = null
    let simplifyLanguageLLMService = null

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

    const aiEdit = () => {
        const context = getSelectionContext('\n')
        if (!context) return

        selectionFrom.value = context.from
        selectionTo.value = context.to
        selectedText.value = context.text
        editWithAIDialog.value = true
    }

    const handleApply = (aiText) => {
        if (!editor.value) {
            console.error('Editor not ready')
            return
        }

        editor.value
            .chain()
            .focus()
            .setTextSelection({ from: selectionFrom.value, to: selectionTo.value })
            .insertContent(aiText)
            .run()
    }

    return {
        aiEdit,
        handleApply,
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
