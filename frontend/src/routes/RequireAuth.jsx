import { Navigate, useLocation } from 'react-router-dom'

export default function RequireAuth({ children }) {
  const location = useLocation()

  // Check if user is authenticated by verifying auth data exists in localStorage
  let authed = false
  if (typeof window !== 'undefined') {
    try {
      const auth = localStorage.getItem('auth')
      if (auth) {
        const parsed = JSON.parse(auth)
        authed = !!parsed.user // User is authenticated if user object exists
      }
    } catch (e) {
      console.error('Error parsing auth:', e)
      authed = false
    }
  }

  if (!authed) {
    return <Navigate to="/signin" replace state={{ from: location }} />
  }
  return children
}