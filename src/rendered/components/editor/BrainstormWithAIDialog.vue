<template>
    <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:brainstormWithAIDialog', $event)"
    max-width="800"
    >
    <v-card
    title="Brainstorm with AI"
    subtitle="Type your idea. Watch it come alive."
    prepend-icon="mdi-lightbulb"
    >
    <v-card-text>
        <div class="d-flex flex-column align-center">
            <v-textarea
            placeholder="Type here you idea..."
            width="100%"
            rows="3"
            clearable
            no-resize
            v-model="userText"
            ></v-textarea>
            <v-btn
            width="150px"
            variant="tonal"
            color="primary"
            prepend-icon="mdi-rocket-launch"
            @click="generateWithAI"
            >Generate</v-btn>
            <v-textarea
            v-if="aiText"
            class="mt-6"
            width="100%"
            rows="10"
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
import generateWithAIPrompt from '../../prompts/generateWithAIPrompt';

import { defineProps, ref, reactive, computed, nextTick } from 'vue'

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    },
})

const generateWithAILlmService = createLlmService(generateWithAIPrompt, 'generateWithAI');

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

const generateWithAI = async () => {
    try {
        isAITextLoading.value = true
        aiText.value = "Generating..."
        
        let isFirstChunk = true
        const stream = generateWithAILlmService.stream(userText.value)
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