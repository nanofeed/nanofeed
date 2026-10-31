export default defineNuxtPlugin(async () => {
  await useNanoAuth().refreshSession()
})
