
import { queueRefresh } from '@/api/axios'
import { useAuthStore } from '@/stores/Auth/authStore'
import { useEffect }    from 'react'

export const usePeriodicRefresh = () => {
  const { accessToken } = useAuthStore()

  useEffect(() => {
    if (!accessToken) return  // nothing to do when logged out

    // fire every 5 minutes
    const id = setInterval(() => {
      queueRefresh().catch(console.error)
    }, 5 * 60 * 1000)

    return () => clearInterval(id)
  }, [accessToken])
}

// This hook sets up a timer to periodically refresh the JWT token
// every 5 minutes. It calls the `queueRefresh` function to refresh the token.
// The timer is cleared when the component unmounts or when the access token changes.
// Note: This hook is mainly used for debugging purposes and is not recommended for production use.
// It is better to use the `useProactiveRefresh` hook, which refreshes the token