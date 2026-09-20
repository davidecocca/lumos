<template>
    <BaseDialog
        :model-value="modelValue"
        :persistent="saving"
        :title="workspace ? 'Edit workspace' : 'New workspace'"
        :subtitle="
            workspace
                ? 'Make this workspace your own.'
                : 'A separate space for your notes and chats.'
        "
        @update:model-value="emit('update:modelValue', $event)"
    >
        <template #title-extra>
            <div class="order-first mr-5 mb-1 flex-shrink-0">
                <WorkspaceIconPicker
                    v-model="draftIcon"
                    v-model:color="draftColor"
                    :disabled="saving"
                />
            </div>
        </template>
        <v-form @submit.prevent="save">
            <v-text-field
                v-model="draftName"
                label="Workspace name"
                autofocus
                variant="outlined"
                density="comfortable"
                rounded="lg"
                :disabled="saving"
                :rules="nameRules"
                :maxlength="80"
                counter="80"
                clearable
            />
            <v-alert
                v-if="error"
                type="error"
                variant="tonal"
                rounded="lg"
                role="alert"
                density="comfortable"
            >
                {{ error }}
            </v-alert>
        </v-form>
        <template #actions>
            <v-spacer />
            <v-btn
                variant="text"
                :disabled="saving"
                @click="emit('update:modelValue', false)"
                >Cancel</v-btn
            >
            <v-btn
                color="primary"
                variant="tonal"
                :disabled="!validName"
                :loading="saving"
                @click="save"
            >
                {{ workspace ? 'Save' : 'Create' }}
            </v-btn>
        </template>
    </BaseDialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import BaseDialog from '../../commons/BaseDialog.vue';
import WorkspaceIconPicker from '../../workspaces/WorkspaceIconPicker.vue';
import { useWorkspaceStore } from '../../../stores/workspaceStore';

const props = defineProps({
    modelValue: { type: Boolean, default: false },
    workspace: { type: Object, default: null },
});
const emit = defineEmits(['update:modelValue']);
const workspaceStore = useWorkspaceStore();
const draftName = ref('');
const draftIcon = ref('ph-squares-four');
const draftColor = ref('primary');
const saving = ref(false);
const error = ref('');
const normalizedName = computed(() =>
    String(draftName.value || '')
        .replace(/\s+/g, ' ')
        .trim(),
);
const validName = computed(
    () => normalizedName.value.length > 0 && normalizedName.value.length <= 80,
);
const nameRules = [
    (value) => !!String(value || '').trim() || 'Enter a workspace name.',
    (value) =>
        String(value || '').length <= 80 || 'Use 80 characters or fewer.',
];

watch(
    () => props.modelValue,
    (isOpen) => {
        if (!isOpen) return;
        draftName.value = props.workspace?.name || '';
        draftIcon.value = props.workspace?.icon || 'ph-squares-four';
        draftColor.value = props.workspace?.color || 'primary';
        error.value = '';
    },
);

const save = async () => {
    if (saving.value || !validName.value) return;
    if (
        workspaceStore.workspaces.some(
            (workspace) =>
                workspace.id !== props.workspace?.id &&
                workspace.name.toLowerCase() ===
                    normalizedName.value.toLowerCase(),
        )
    ) {
        error.value = 'A workspace with this name already exists.';
        return;
    }
    saving.value = true;
    error.value = '';
    try {
        if (props.workspace) {
            await workspaceStore.renameWorkspace(
                props.workspace.id,
                normalizedName.value,
                draftIcon.value,
                draftColor.value,
            );
        } else {
            await workspaceStore.createWorkspace(
                normalizedName.value,
                draftIcon.value,
                draftColor.value,
            );
        }
        emit('update:modelValue', false);
    } catch (cause) {
        error.value =
            cause.message || 'Could not save the workspace. Please try again.';
    } finally {
        saving.value = false;
    }
};
</script>
