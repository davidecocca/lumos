<template>
    <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:askAIDialog', $event)"
    max-width="800"
    >
    <v-card
    title="Ask AI"
    subtitle="Ask AI to explain, edit your text, or anything else you need."
    prepend-icon="mdi-forum"
    >
    <v-card-text>
        <div class="d-flex flex-column align-center">
            <p class="text-subtitle-2 text-grey-darken-1 mb-2 ml-1 text-left w-100">
                <v-icon>mdi-format-quote-close</v-icon>
                Selected Text
            </p>
            <v-textarea
            width="100%"
            rows="6"
            clearable
            no-resize
            :value="selectedText"
            readonly
            ></v-textarea>
            <div class="d-flex align-center w-100 mb-2 ml-1">
                <v-tooltip location="right" open-delay="100">
                    <template #activator="{ props }">
                        <p class="text-subtitle-2 text-grey-darken-1 text-left mb-0"
                        v-bind="props"
                        style="display: flex; align-items: center; cursor: pointer;">
                        <v-icon>mdi-text-account</v-icon>
                        Prompt
                    </p>
                </template>
                <span>
                    Prompt will be used only by the <b>Edit</b> function
                </span>
            </v-tooltip>
        </div>
        <v-textarea
        placeholder="Type here what you want AI to do..."
        width="100%"
        rows="2"
        clearable
        no-resize
        v-model="userText"
        ></v-textarea>
        <div class="d-flex flex-row ga-4 mt-4">
            <v-btn
            width="150px"
            variant="tonal"
            color="primary"
            prepend-icon="mdi-lightbulb-on-60"
            @click="explainWithAI"
            >Explain</v-btn>
            <v-btn
            width="150px"
            variant="tonal"
            color="secondary"
            :disabled="!userText"
            prepend-icon="mdi-pencil"
            @click="editWithAI"
            >Edit</v-btn>
        </div>
        <v-textarea
        v-if="aiText"
        class="mt-6"
        width="100%"
        rows="6"
        :loading="isAITextLoading"
        no-resize
        readonly
        v-model="aiText"
        id="aiTextAreaId"
        >
        <template v-slot:append-inner>
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
<v-divider></v-divider>
<v-card-actions>
    <v-spacer></v-spacer>
    <v-btn @click="closeDialog">
        Close
    </v-btn>
</v-card-actions>
</v-card>

</v-dialog>
</template>

<script setup>
import { createLlmService } from '../../services/llmService';
import explainPrompt from '../../prompts/explainPrompt';
import editWithAIPrompt from '../../prompts/editWithAIPrompt';

import { ref, reactive, computed, nextTick } from 'vue'

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

// Init the LLM service for the explain service
var explainLLMService = null;
try {
    explainLLMService = createLlmService(explainPrompt, 'editorChatTools');
} catch (error) {
    console.error("Error creating LLM service:", error);
}

const userText = ref('')
const aiText = ref('')
const isAITextLoading = ref(false)

const copyIconState = reactive({
    icon: 'mdi-content-copy',
    color: '',
    animate: false
})

const emit = defineEmits(['update:modelValue'])

const closeDialog = () => {
    // Reset the text areas
    userText.value = ''
    aiText.value = ''
    isAITextLoading.value = false
    
    emit('update:modelValue', false)
}

const editWithAI = async () => {
    try {
        isAITextLoading.value = true
        aiText.value = "Generating..."
        
        // Create an instance of the LLM service with the editWithAIPrompt
        const editWithAI = createLlmService(editWithAIPrompt(userText.value), 'editorChatTools');
        
        let isFirstChunk = true
        const stream = editWithAI.stream(props.selectedText)
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

const explainWithAI = async () => {
    try {
        isAITextLoading.value = true
        aiText.value = "Generating..."
        
        let isFirstChunk = true
        const stream = explainLLMService.stream(props.selectedText)
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
</style>