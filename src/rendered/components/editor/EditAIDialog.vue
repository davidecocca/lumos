<template>
    <v-dialog
    :model-value="modelValue"
    @update:model-value="onDialogModelUpdate"
    max-width="720"
    >
    <v-card rounded="xl" elevation="8">
        <v-card-title class="d-flex align-center pt-5 pb-1 px-6">
            <v-avatar color="blue-lighten-4" size="36" class="mr-3">
                <v-icon size="24" color="blue-darken-2">mdi-pencil</v-icon>
            </v-avatar>
            <div>
                <div class="text-h6">Edit with AI</div>
                <div class="text-subtitle-2 text-medium-emphasis">Describe what to change and watch it happen.</div>
            </div>
            <v-spacer />
        </v-card-title>
        
        <v-card-text class="px-6 pb-4">
            <div class="d-flex flex-column align-center">
                <v-textarea
                :model-value="props.selectedText"
                width="100%"
                rows="6"
                auto-grow
                no-resize
                readonly
                class="mt-2"
                variant="outlined"
                />
                
                <v-textarea
                placeholder="Describe what to change..."
                width="100%"
                rows="3"
                clearable
                auto-grow
                no-resize
                v-model="userText"
                class="mt-4"
                variant="outlined"
                @keydown="onPromptKeydown"
                />
                
                <v-textarea
                v-if="aiText"
                class="mt-4 ai-output"
                width="100%"
                rows="10"
                :loading="isAITextLoading"
                auto-grow
                no-resize
                readonly
                variant="outlined"
                v-model="aiText"
                id="aiTextAreaId"
                :max-rows="14"
                >
                <template #append-inner>
                    <v-icon
                    @click="copyToClipboard(aiText)"
                    :color="copyIconState.color"
                    class="copy-icon"
                    :class="{ 'copy-animation': copyIconState.animate }"
                    >
                    {{ copyIconState.icon }}
                </v-icon>
            </template>
        </v-textarea>
    </div>
</v-card-text>

<v-divider />
<v-card-actions class="px-6 py-3">
    <span class="text-caption text-medium-emphasis">Tip: Press ⌘⏎ to generate</span>
    <v-spacer />
    <v-btn variant="text" @click="closeDialog">Close</v-btn>
    <v-btn
    color="success"
    prepend-icon="mdi-check"
    :disabled="!aiText || isAITextLoading"
    @click="applyText"
    >
    Apply
</v-btn>
    <v-btn
    color="primary"
    prepend-icon="mdi-creation"
    :disabled="!userText || isAITextLoading"
    :loading="isAITextLoading"
    @click="editWithAI"
    >
    Generate
</v-btn>
</v-card-actions>
</v-card>
</v-dialog>
</template>

<script setup>
    import { createLlmService } from '../../services/llmService';
    import editWithAIPrompt from '../../prompts/editWithAIPrompt';
    
    import { ref, reactive, computed, nextTick, watch } from 'vue'
    
    const props = defineProps({
        modelValue: {
            type: Boolean,
            default: false
        },
        selectedText: {
            type: String,
            default: ''
        }
    })
    
    const userText = ref('')
    const aiText = ref('')
    const isAITextLoading = ref(false)
    
    const copyIconState = reactive({
        icon: 'mdi-content-copy',
        color: '',
        animate: false
    })
    
    const emit = defineEmits(['update:modelValue', 'apply'])
    
    // Forward internal dialog updates to parent v-model
    const onDialogModelUpdate = (val) => {
        emit('update:modelValue', val)
    }
    
    const closeDialog = () => {
        // Reset the text areas
        userText.value = ''
        aiText.value = ''
        isAITextLoading.value = false
        
        emit('update:modelValue', false)
    }
    
    const editWithAI = async () => {
        try {
            // Create LLM service with the selected tone
            const editWithAILLMService = createLlmService(editWithAIPrompt(props.selectedText), 'editor');
            isAITextLoading.value = true
            aiText.value = "Generating..."
            
            let isFirstChunk = true
            const stream = editWithAILLMService.stream(userText.value)
            for await (const chunk of stream) {
                if (isFirstChunk) {
                    aiText.value = ''
                    isFirstChunk = false
                }
                aiText.value += chunk
                
                // Scroll to the bottom of the AI text area
                await nextTick()
                const aiTextAreaRef = document.getElementById('aiTextAreaId')
                if (aiTextAreaRef) {
                    aiTextAreaRef.scrollTop = aiTextAreaRef.scrollHeight
                }
            }
        } catch (error) {
            console.error("Error:", error)
            aiText.value = 'Error generating text'
        } finally {
            isAITextLoading.value = false
        }
    }
    
    // Keyboard: Cmd+Enter to generate while focused in the prompt
    const onPromptKeydown = (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && userText.value && !isAITextLoading.value) {
            e.preventDefault()
            editWithAI()
        }
    }
    
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            // Animate the icon change
            copyIconState.animate = true
            
            // Change to checkmark icon and make it green
            copyIconState.icon = 'mdi-check-circle'
            copyIconState.color = 'success'
            
            // Reset the icon after 1.5 seconds
            setTimeout(() => {
                copyIconState.icon = 'mdi-content-copy'
                copyIconState.color = ''
                
                // Remove animation class after the transition is complete
                setTimeout(() => {
                    copyIconState.animate = false
                }, 300)
            }, 1500)
        }).catch(err => {
            console.error('Error copying text: ', err)
        })
    }
    
    const applyText = () => {
        emit('apply', aiText.value)
        closeDialog()
    }
</script>

<style scoped>
    .copy-icon {
        cursor: pointer;
        transition: transform 0.3s ease, color 0.3s ease;
    }
    
    .copy-animation {
        animation: pulse 0.5s ease;
    }
    
    @keyframes pulse {
        0% {
            transform: scale(1);
        }
        50% {
            transform: scale(1.3);
        }
        100% {
            transform: scale(1);
        }
    }
    
    /* Cap the AI output height and make inner textarea scroll */
    .ai-output :deep(textarea) {
        max-height: 320px; /* ~ 14 rows depending on line-height */
        overflow-y: auto !important;
    }
</style>