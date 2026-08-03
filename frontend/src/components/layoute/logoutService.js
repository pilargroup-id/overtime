import api from '../../services/api.js'

export async function submitLogout() {
  if (typeof window === 'undefined') {
    return
  }

  api.clearToken()
  window.history.pushState({}, '', '/login')
  window.dispatchEvent(new PopStateEvent('popstate'))
}
