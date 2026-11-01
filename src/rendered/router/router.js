import { createMemoryHistory, createRouter } from 'vue-router';

import HomeView from '../views/HomeView.vue';
import ChatView from '../views/ChatView.vue';
import SettingsView from '../views/SettingsView.vue';
import EditorView from '../views/EditorView.vue';
import KanbanView from '../views/KanbanView.vue';
import KanbanBoardView from '../views/KanbanBoardView.vue';

const routes = [
    {
        path: '/',
        name: 'home',
        component: HomeView,
    },
    {
        path: '/kanban',
        name: 'kanban',
        component: KanbanView,
    },
    {
        path: '/kanban/:boardId',
        name: 'kanban-board',
        component: KanbanBoardView,
    },
    {
        path: '/chat',
        name: 'chat',
        component: ChatView,
    },
    {
        path: '/settings',
        name: 'settings',
        component: SettingsView,
    },
    {
        path: '/notes/:noteId?',
        name: 'notes',
        component: EditorView,
        props: true,
    },
];

const router = createRouter({
    history: createMemoryHistory(),
    routes,
});

export default router;
