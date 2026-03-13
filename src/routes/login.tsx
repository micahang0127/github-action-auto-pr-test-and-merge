import { createFileRoute, redirect } from '@tanstack/react-router'

import { LoginPage } from '../pages/LoginPage'

export const Route = createFileRoute('/login')({
  beforeLoad: () => {
    if (localStorage.getItem('accessToken')) {
      throw redirect({ to: '/main' })
    }
  },
  component: LoginPage,
})
