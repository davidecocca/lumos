import { createMemoryHistory, createRouter } from 'vue-router'

import HomeView from '../views/HomeView.vue'
import SettingsView from '../views/SettingsView.vue'
import EditorView from '../views/EditorView.vue'

const routes = [
    {
        path: '/',
        name: 'home',
        component: HomeView
    },
    {
        path: '/settings',
        name: 'settings',
        component: SettingsView
    },
    {
        path: '/notes/:noteId?',
        name: 'notes',
        component: EditorView,
        props: true
    }
]

const router = createRouter({
    history: createMemoryHistory(),
    routes,
})

export default router