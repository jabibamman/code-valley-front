import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

export default createVuetify({
    components,
    directives,
    icons: {
        defaultSet: 'mdi',
        aliases,
        sets: {
            mdi,
        },
    },
    theme: {
        defaultTheme: 'light',
        themes: {
            light: {
                colors: {
                    primary: '#902de0',
                    secondary: '#e07e2d',
                    background: '#ededed',
                    surface: '#ffffff',
                    'primary-darken-1': '#6a21a6',
                    'secondary-darken-1': '#d98b2d',
                    'on-primary': '#ffffff',
                    'on-secondary': '#ffffff',
                    'on-background': '#1a1a1a',
                    'on-surface': '#1a1a1a',
                },
                variables: {
                    'border-color': '#4a4a4a',
                },
            },
            dark: {
                colors: {
                    primary: '#7158e0',
                    secondary: '#d98b2d',
                    background: '#1a1a1a',
                    surface: '#2c2c2c',
                    'primary-darken-1': '#6a21a6',
                    'secondary-darken-1': '#d98b2d',
                    'on-primary': '#ededed',
                    'on-secondary': '#ededed',
                    'on-background': '#ededed',
                    'on-surface': '#ededed',
                },
                variables: {
                    'border-color': '#a8a8a8',
                },
            },
        },
    },
    defaults: {
        VBtn: {
            color: 'primary',
            variant: 'flat',
        },
    },
})
