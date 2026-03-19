import { createFileRoute, redirect } from '@tanstack/react-router'

import { requireAuth } from '../utils/requireAuth'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    requireAuth()
    throw redirect({ to: '/main' })
  },
})
