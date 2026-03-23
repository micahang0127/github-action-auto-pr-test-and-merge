import { useNavigate } from '@tanstack/react-router'
import { cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '../stores/authStore'
import { server } from '../test/mocks/server'
import { render, screen } from '../test/test-utils'
import { LoginPage } from './LoginPage'

const mockNavigate = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useNavigate: vi.fn(),
}))

vi.mock('@portone/browser-sdk/v2', () => ({
  requestIdentityVerification: vi.fn(),
}))

describe('LoginPage - 로그인 폼', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({ isLoggedIn: false })
    vi.mocked(useNavigate).mockReturnValue(mockNavigate)
    vi.clearAllMocks()
    server.resetHandlers()
  })

  afterEach(() => {
    cleanup()
  })

  it('이메일과 비밀번호를 입력하고 로그인할 수 있다', async () => {
    server.use(
      http.post('*/auth/login', () =>
        HttpResponse.json({
          statusCode: 200,
          data: { accessToken: 'new-token-123' },
          error: [],
        })
      )
    )

    render(<LoginPage />)

    const emailInput = screen.getByLabelText(/이메일/)
    const passwordInput = screen.getByLabelText(/비밀번호/)
    const submitButton = screen.getByRole('button', { name: /^로그인$/ })

    await userEvent.type(emailInput, 'user@test.com')
    await userEvent.type(passwordInput, 'password123')
    await userEvent.click(submitButton)

    // 토큰 저장 확인 (비동기 지연을 고려하여 waitFor 사용)
    await waitFor(() => {
      expect(localStorage.getItem('accessToken')).toBe('new-token-123')
      // store 업데이트 확인
      expect(useAuthStore.getState().isLoggedIn).toBe(true)
      // 네비게이션 확인
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/main' })
    })
  })

  it('로그인 실패 시 에러 메시지를 표시한다', async () => {
    server.use(
      http.post('*/auth/login', () =>
        HttpResponse.json(
          {
            statusCode: 401,
            data: {},
            error: ['이메일 또는 비밀번호가 틀렸습니다.'],
          },
          { status: 401 }
        )
      )
    )

    render(<LoginPage />)

    const emailInput = screen.getByLabelText(/이메일/)
    const passwordInput = screen.getByLabelText(/비밀번호/)
    const submitButton = screen.getByRole('button', { name: /^로그인$/ })

    await userEvent.type(emailInput, 'wrong@test.com')
    await userEvent.type(passwordInput, 'wrong')
    await userEvent.click(submitButton)

    // 에러 메시지 표시 확인
    expect(await screen.findByText(/이메일 또는 비밀번호가 틀렸습니다./)).toBeInTheDocument()

    // 토큰이 저장되지 않아야 함
    await waitFor(() => {
      expect(localStorage.getItem('accessToken')).toBeNull()
      // 네비게이션이 호출되지 않아야 함
      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  it('로그인 중에는 버튼이 disabled 상태다', async () => {
    let resolveLogin: () => void = () => {}
    const loginPromise = new Promise<void>((resolve) => {
      resolveLogin = resolve
    })

    server.use(
      http.post('*/auth/login', async () => {
        await loginPromise
        return HttpResponse.json({
          statusCode: 200,
          data: { accessToken: 'token' },
          error: [],
        })
      })
    )

    render(<LoginPage />)

    const emailInput = screen.getByLabelText(/이메일/)
    const passwordInput = screen.getByLabelText(/비밀번호/)
    const submitButton = screen.getByRole('button', { name: /^로그인$/ })

    await userEvent.type(emailInput, 'user@test.com')
    await userEvent.type(passwordInput, 'password123')
    await userEvent.click(submitButton)

    // 로그인 중 버튼이 disabled
    expect(submitButton).toBeDisabled()
    expect(submitButton).toHaveTextContent(/로그인 중/)

    resolveLogin()
  })

  it('폼 입력값이 유지된다', async () => {
    render(<LoginPage />)

    const emailInput = screen.getByLabelText(/이메일/) as HTMLInputElement
    const passwordInput = screen.getByLabelText(/비밀번호/) as HTMLInputElement

    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.type(passwordInput, 'test123')

    expect(emailInput.value).toBe('test@example.com')
    expect(passwordInput.value).toBe('test123')
  })
})

describe('LoginPage - 본인인증', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({ isLoggedIn: false })
    vi.mocked(useNavigate).mockReturnValue(mockNavigate)
    vi.clearAllMocks()
    server.resetHandlers()
  })

  afterEach(() => {
    cleanup()
  })

  it('본인인증 API 성공 시 성공 메시지를 표시한다', async () => {
    const { requestIdentityVerification } = await import('@portone/browser-sdk/v2')
    vi.mocked(requestIdentityVerification).mockResolvedValue({
      identityVerificationId: 'iv-success-id',
      transactionType: 'IDENTITY_VERIFICATION',
      identityVerificationTxId: 'tx-id',
    } as any)

    server.use(
      http.post('*/auth/identity-verification', () =>
        HttpResponse.json({
          statusCode: 200,
          data: { identityVerificationId: 'iv-success-id' },
          error: [],
        })
      )
    )

    render(<LoginPage />)
    await userEvent.click(screen.getByRole('button', { name: /본인인증/ }))

    expect(await screen.findByText(/본인인증이 완료되었습니다./)).toBeInTheDocument()
    // 에러 알럿이 없어야 함
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('본인인증 버튼을 클릭하면 SDK를 호출한다', async () => {
    const { requestIdentityVerification } = await import('@portone/browser-sdk/v2')
    vi.mocked(requestIdentityVerification).mockResolvedValue({
      identityVerificationId: 'iv-id',
      transactionType: 'IDENTITY_VERIFICATION',
      identityVerificationTxId: 'tx-id',
    } as any)

    server.use(
      http.post('*/auth/identity-verification', () =>
        HttpResponse.json({
          statusCode: 200,
          data: { identityVerificationId: 'iv-id' },
          error: [],
        })
      )
    )

    render(<LoginPage />)
    const ivButton = screen.getByRole('button', { name: /본인인증/ })

    await userEvent.click(ivButton)

    // SDK가 호출되었는지 확인
    expect(requestIdentityVerification).toHaveBeenCalled()
  })

  it('본인인증 SDK 호출이 취소되면 에러를 표시한다', async () => {
    const { requestIdentityVerification } = await import('@portone/browser-sdk/v2')
    vi.mocked(requestIdentityVerification).mockResolvedValue({
      code: 'USER_CANCELLED',
      message: '사용자가 본인인증을 취소했습니다.',
    } as any)

    render(<LoginPage />)
    await userEvent.click(screen.getByRole('button', { name: /본인인증/ }))

    expect(await screen.findByText(/사용자가 본인인증을 취소했습니다./)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeInTheDocument()
  })

  it('본인인증 SDK 호출 중 에러 메시지를 표시한다', async () => {
    const { requestIdentityVerification } = await import('@portone/browser-sdk/v2')
    vi.mocked(requestIdentityVerification).mockResolvedValue({
      code: 'SDK_ERROR',
      message: 'SDK 오류가 발생했습니다.',
    } as any)

    render(<LoginPage />)
    await userEvent.click(screen.getByRole('button', { name: /본인인증/ }))

    expect(await screen.findByText(/SDK 오류가 발생했습니다./)).toBeInTheDocument()
  })

  it('본인인증 중에는 버튼이 disabled 상태다', async () => {
    let resolveVerification: () => void = () => {}
    const verificationPromise = new Promise<void>((resolve) => {
      resolveVerification = resolve
    })

    const { requestIdentityVerification } = await import('@portone/browser-sdk/v2')
    vi.mocked(requestIdentityVerification).mockImplementation(async () => {
      await verificationPromise
      return {
        identityVerificationId: 'iv-id',
        transactionType: 'IDENTITY_VERIFICATION',
        identityVerificationTxId: 'tx-id',
      } as any
    })

    server.use(
      http.post('*/auth/identity-verification', () =>
        HttpResponse.json({
          statusCode: 200,
          data: { identityVerificationId: 'iv-id' },
          error: [],
        })
      )
    )

    render(<LoginPage />)
    const ivButton = screen.getByRole('button', { name: /본인인증/ })

    await userEvent.click(ivButton)

    // 본인인증 중 버튼이 disabled
    expect(ivButton).toBeDisabled()
    expect(ivButton).toHaveTextContent(/본인인증 중/)

    resolveVerification()
  })

  it('본인인증은 여러 번 시도할 수 있다', async () => {
    const { requestIdentityVerification } = await import('@portone/browser-sdk/v2')

    // 첫 번째 시도: 성공
    vi.mocked(requestIdentityVerification).mockResolvedValueOnce({
      identityVerificationId: 'iv-success-1',
      transactionType: 'IDENTITY_VERIFICATION',
      identityVerificationTxId: 'tx-id',
    } as any)

    server.use(
      http.post('*/auth/identity-verification', () =>
        HttpResponse.json({
          statusCode: 200,
          data: { identityVerificationId: 'iv-success-1' },
          error: [],
        })
      )
    )

    render(<LoginPage />)
    const ivButton = screen.getByRole('button', { name: /본인인증/ })

    // 첫 번째 본인인증
    await userEvent.click(ivButton)
    expect(await screen.findByText(/본인인증이 완료되었습니다./)).toBeInTheDocument()

    // 두 번째 시도: 유저가 취소
    vi.mocked(requestIdentityVerification).mockResolvedValueOnce({
      code: 'USER_CANCELLED',
      message: '사용자가 취소했습니다.',
    } as any)

    // 두 번째 본인인증 시도
    await userEvent.click(ivButton)

    // 새로운 에러 메시지가 표시됨
    expect(await screen.findByText(/사용자가 취소했습니다./)).toBeInTheDocument()
  })
})
