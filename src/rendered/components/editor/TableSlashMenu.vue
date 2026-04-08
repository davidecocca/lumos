<template>
    <v-card min-width="260" rounded="xl" border elevation="8">
        <v-list density="comfortable" nav>
            <v-list-subheader>Insert</v-list-subheader>
            <v-list-item
            v-for="(item, index) in items"
            :key="item.title"
            :active="selectedIndex === index"
            rounded="lg"
            @click="selectItem(index)"
            >
                <template v-slot:prepend>
                    <v-icon :icon="item.icon"></v-icon>
                </template>
                <v-list-item-title>{{ item.title }}</v-list-item-title>
                <v-list-item-subtitle>{{ item.subtitle }}</v-list-item-subtitle>
            </v-list-item>
        </v-list>
    </v-card>
</template>

<script setup>
    import { ref, watch } from 'vue'

    const props = defineProps({
        items: {
            type: Array,
            default: () => [],
        },
        command: {
            type: Function,
            required: true,
        },
    })

    const selectedIndex = ref(0)

    watch(() => props.items, () => {
        selectedIndex.value = 0
    }, { immediate: true })

    const selectItem = (index) => {
        const item = props.items[index]

        if (!item) {
            return
        }

        props.command(item)
    }

    const onKeyDown = ({ event }) => {
        if (!props.items.length) {
            return false
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault()
            selectedIndex.value = (
                (selectedIndex.value + props.items.length - 1) % props.items.length
            )
            return true
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault()
            selectedIndex.value = (
                (selectedIndex.value + 1) % props.items.length
            )
            return true
        }

        if (event.key === 'Enter') {
            event.preventDefault()
            selectItem(selectedIndex.value)
            return true
        }

        return false
    }

    defineExpose({
        onKeyDown,
    })
</script>
