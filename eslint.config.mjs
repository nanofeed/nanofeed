// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    // Prettier owns whitespace and tag formatting, including Vue void elements.
    'vue/html-self-closing': 'off',
  },
})
