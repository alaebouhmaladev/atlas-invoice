export default defineNuxtRouteMiddleware(async (to) => {
  const { user, fetchUser } = useAuth()

  if (!user.value) {
    await fetchUser()
  }

  if (!user.value) {
    return navigateTo('/login')
  }

  if (user.value.mustChangePassword && to.path !== '/changer-mot-de-passe') {
    return navigateTo('/changer-mot-de-passe')
  }
})
