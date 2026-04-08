import { createApp, h } from 'vue'
import router from './router/router'
import { createPinia } from 'pinia'

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases as vuetifyPhAliases } from 'vuetify/iconsets/ph'

// Components
import App from './App.vue'

// Styles
import '@phosphor-icons/web/fill'
import '@phosphor-icons/web/regular'

const phAliases = Object.fromEntries(
    Object.entries(vuetifyPhAliases).map(([name, icon]) => [
        name,
        typeof icon === 'string' && icon.startsWith('i-ph:')
            ? `ph-${icon.slice('i-ph:'.length)}`
            : icon,
    ]),
)

const ph = {
    component: (props) => {
        const isFill = typeof props.icon === 'string' && props.icon.endsWith('-fill')
        const iconClass = isFill ? props.icon.slice(0, -'-fill'.length) : props.icon

        return h(props.tag, {
            class: [isFill ? 'ph-fill' : 'ph', iconClass],
        })
    },
}

const vuetify = createVuetify({
    components,
    directives,
    icons: {
        defaultSet: 'ph',
        aliases: phAliases,
        sets: {
            ph,
        },
    },
    theme: {
        defaultTheme: 'light',
    }
})

const pinia = createPinia()

createApp(App)
.use(vuetify)
.use(router)
.use(pinia)
.mount('#app')
