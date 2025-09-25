import { Navigate, useLocation } from 'react-router-dom'

export default function RequireAuth({ children }) {
  const authed = typeof window !== 'undefined' && window.localStorage.getItem('auth') === '1'
  const location = useLocation()
  if (!authed) {
    return <Navigate to="/signin" replace state={{ from: location }} />
  }
  return children
}