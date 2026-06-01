import { ref } from 'vue'

export const useFolderTreeActions = () => {
    const hoveredActionKey = ref(null)
    const activeActionMenuKey = ref(null)

    const getActionKey = (type, id) => `${type}:${id}`

    const setActionMenuOpen = (type, id, isOpen) => {
        activeActionMenuKey.value = isOpen ? getActionKey(type, id) : null
    }

    const isActionVisible = (type, id) => {
        const key = getActionKey(type, id)
        return hoveredActionKey.value === key || activeActionMenuKey.value === key
    }

    return {
        hoveredActionKey,
        activeActionMenuKey,
        getActionKey,
        setActionMenuOpen,
        isActionVisible
    }
}
