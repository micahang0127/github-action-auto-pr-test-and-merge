import { redirect } from '@tanstack/react-router'

export function requireAuth() {
  if (!localStorage.getItem('accessToken')) {
    throw redirect({ to: '/login' })
  }
}
