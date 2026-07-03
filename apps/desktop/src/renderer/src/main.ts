import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { i18n } from './locales'
import { pushRecentTool } from './stores/preferences'
import './styles/main.css'

const app = createApp(App)

app.use(i18n)
app.use(router)

router.afterEach((to) => {
  if (typeof to.name === 'string') {
    pushRecentTool(to.name)
  }
})

app.mount('#app')
