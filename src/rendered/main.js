import { createApp } from 'vue'
import router from './router/router'
import { createPinia } from 'pinia'

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

// Components
import App from './App.vue'

// Styles
import '@mdi/font/css/materialdesignicons.css'

const vuetify = createVuetify({
    components,
    directives,
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