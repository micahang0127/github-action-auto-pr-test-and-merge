import { useNavigate } from '@tanstack/react-router'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '../../stores/authStore'
import { Header } from './Header'

const mockNavigate = vi.fn()

// TanStack Router 목킹
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  useNavigate: vi.fn(),
}))

describe('Header', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({ isLoggedIn: false })
    vi.mocked(useNavigate).mockReturnValue(mockNavigate)
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('로그인 상태가 아니면 Login 링크를 보여준다', () => {
    render(<Header />)
    expect(screen.getByText('Login')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Logout' })).not.toBeInTheDocument()
  })

  it('로그인 상태면 Logout 버튼을 보여준다', () => {
    useAuthStore.setState({ isLoggedIn: true })
    render(<Header />)
    expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument()
    expect(screen.queryByText('Login')).not.toBeInTheDocument()
  })

  it('Logout 버튼 클릭 시 isLoggedIn이 false가 된다', async () => {
    useAuthStore.setState({ isLoggedIn: true })
    localStorage.setItem('accessToken', 'mock-token')

    render(<Header />)
    const logoutBtn = screen.getByRole('button', { name: 'Logout' })
    await userEvent.click(logoutBtn)

    expect(useAuthStore.getState().isLoggedIn).toBe(false)
    expect(localStorage.getItem('accessToken')).toBeNull()
  })

  it('Logout 버튼 클릭 시 /login으로 이동한다', async () => {
    useAuthStore.setState({ isLoggedIn: true })
    localStorage.setItem('accessToken', 'mock-token')

    render(<Header />)
    const logoutBtn = screen.getByRole('button', { name: 'Logout' })
    await userEvent.click(logoutBtn)

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/login' })
  })

  it('모든 네비게이션 링크가 렌더링된다', () => {
    render(<Header />)
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Main')).toBeInTheDocument()
    expect(screen.getByText('Zustand')).toBeInTheDocument()
  })

  it('사이트 로고가 렌더링된다', () => {
    render(<Header />)
    expect(screen.getByText('prj-tobe')).toBeInTheDocument()
  })

  it('Logout 버튼 클릭 시 전체 흐름이 올바르게 동작한다', async () => {
    useAuthStore.setState({ isLoggedIn: true })
    localStorage.setItem('accessToken', 'test-token')

    render(<Header />)
    const logoutBtn = screen.getByRole('button', { name: 'Logout' })

    await userEvent.click(logoutBtn)

    // 모든 로그아웃 관련 동작 확인
    expect(useAuthStore.getState().isLoggedIn).toBe(false)
    expect(localStorage.getItem('accessToken')).toBeNull()
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/login' })

    // 로그아웃 후 Login 링크가 보여야 함
    expect(screen.getByText('Login')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Logout' })).not.toBeInTheDocument()
  })
})
