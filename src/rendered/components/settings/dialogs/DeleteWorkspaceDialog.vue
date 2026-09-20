<template>
    <BaseDialog
        :model-value="modelValue"
        :persistent="deleting"
        title="Delete workspace"
        icon="ph-trash"
        icon-color="error"
        @update:model-value="emit('update:modelValue', $event)"
    >
        This workspace and all its folders, notes, images, and chats will be permanently deleted. This action cannot be undone.
        <div
            class="mt-4"
            v-if="workspace?.id === workspaceStore.currentWorkspaceId"
        >
            You’ll be switched to the <strong>Default</strong> workspace first.
        </div>
        <v-alert
            v-if="error"
            type="error"
            variant="tonal"
            rounded="lg"
            class="mt-3"
            role="alert"
        >
            {{ error }}
        </v-alert>
        <template #actions>
            <v-spacer />
            <v-btn
                variant="text"
                :disabled="deleting"
                @click="emit('update:modelValue', false)"
                >Cancel</v-btn
            >
            <v-btn
                color="error"
                variant="tonal"
                :loading="deleting"
                :disabled="!workspace || !!workspace.is_default"
                @click="remove"
            >
                Delete workspace
            </v-btn>
        </template>
    </BaseDialog>
</template>

<script setup>
import { ref, watch } from 'vue';
import BaseDialog from '../../commons/BaseDialog.vue';
import { useWorkspaceStore } from '../../../stores/workspaceStore';

const props = defineProps({
    modelValue: { type: Boolean, default: false },
    workspace: { type: Object, default: null },
});
const emit = defineEmits(['update:modelValue']);
const workspaceStore = useWorkspaceStore();
const deleting = ref(false);
const error = ref('');
watch(
    () => props.modelValue,
    () => {
        error.value = '';
    },
);

const remove = async () => {
    if (deleting.value || !props.workspace || props.workspace.is_default)
        return;
    deleting.value = true;
    error.value = '';
    try {
        await workspaceStore.deleteWorkspace(props.workspace.id);
        emit('update:modelValue', false);
    } catch (cause) {
        error.value =
            cause.message ||
            'Could not delete the workspace. Please try again.';
    } finally {
        deleting.value = false;
    }
};
</script>
