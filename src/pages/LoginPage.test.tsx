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

vi.mock('../utils/fingerprint', () => ({
  getFingerprint: vi.fn().mockResolvedValue('mock-fingerprint-abc123'),
}))

describe('LoginPage - 로그인 폼 (동일 기기, type T)', () => {
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
      http.post('*/user/login', () =>
        HttpResponse.json({
          statusCode: 200,
          data: { type: 'T', token: 'new-token-123' },
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

    await waitFor(() => {
      expect(localStorage.getItem('accessToken')).toBe('new-token-123')
      expect(useAuthStore.getState().isLoggedIn).toBe(true)
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/main' })
    })
  })

  it('로그인 실패 시 에러 메시지를 표시한다', async () => {
    server.use(
      http.post('*/user/login', () =>
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

    expect(await screen.findByText(/이메일 또는 비밀번호가 틀렸습니다./)).toBeInTheDocument()

    await waitFor(() => {
      expect(localStorage.getItem('accessToken')).toBeNull()
      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  it('로그인 중에는 버튼이 disabled 상태다', async () => {
    let resolveLogin: () => void = () => {}
    const loginPromise = new Promise<void>((resolve) => {
      resolveLogin = resolve
    })

    server.use(
      http.post('*/user/login', async () => {
        await loginPromise
        return HttpResponse.json({
          statusCode: 200,
          data: { type: 'T', token: 'token' },
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

describe('LoginPage - 로그인 폼 (신규 기기, OTP 플로우)', () => {
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

  it('type O 응답 시 OTP 입력 UI가 표시된다', async () => {
    server.use(
      http.post('*/user/login', () =>
        HttpResponse.json({
          statusCode: 200,
          data: { type: 'O' },
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

    // OTP 입력 UI가 표시되어야 함
    expect(await screen.findByLabelText(/인증번호/)).toBeInTheDocument()
    expect(screen.getByText(/남은 시간/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /OTP 인증/ })).toBeInTheDocument()
  })

  it('OTP 6자리 입력 후 제출 시 /main으로 이동한다', async () => {
    server.use(
      http.post('*/user/login', () =>
        HttpResponse.json({
          statusCode: 200,
          data: { type: 'O' },
          error: [],
        })
      ),
      http.post('*/user/otplogin', () =>
        HttpResponse.json({
          statusCode: 200,
          data: { token: 'otp-token-456' },
          error: [],
        })
      )
    )

    render(<LoginPage />)

    // 자격증명 입력 및 제출
    await userEvent.type(screen.getByLabelText(/이메일/), 'user@test.com')
    await userEvent.type(screen.getByLabelText(/비밀번호/), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /^로그인$/ }))

    // OTP 입력
    const otpInput = await screen.findByLabelText(/인증번호/)
    await userEvent.type(otpInput, '123456')

    // OTP 제출
    const otpButton = screen.getByRole('button', { name: /OTP 인증/ })
    await userEvent.click(otpButton)

    await waitFor(() => {
      expect(localStorage.getItem('accessToken')).toBe('otp-token-456')
      expect(useAuthStore.getState().isLoggedIn).toBe(true)
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/main' })
    })
  })

  it('OTP 입력 중에는 숫자만 입력된다', async () => {
    server.use(
      http.post('*/user/login', () =>
        HttpResponse.json({
          statusCode: 200,
          data: { type: 'O' },
          error: [],
        })
      )
    )

    render(<LoginPage />)

    await userEvent.type(screen.getByLabelText(/이메일/), 'user@test.com')
    await userEvent.type(screen.getByLabelText(/비밀번호/), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /^로그인$/ }))

    const otpInput = (await screen.findByLabelText(/인증번호/)) as HTMLInputElement
    await userEvent.type(otpInput, 'abc123def')

    // 숫자만 입력되어야 함
    expect(otpInput.value).toBe('123')
  })

  it('OTP 6자리 미만이면 제출 버튼이 disabled다', async () => {
    server.use(
      http.post('*/user/login', () =>
        HttpResponse.json({
          statusCode: 200,
          data: { type: 'O' },
          error: [],
        })
      )
    )

    render(<LoginPage />)

    await userEvent.type(screen.getByLabelText(/이메일/), 'user@test.com')
    await userEvent.type(screen.getByLabelText(/비밀번호/), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /^로그인$/ }))

    const otpInput = await screen.findByLabelText(/인증번호/)
    const otpButton = screen.getByRole('button', { name: /OTP 인증/ })

    // 5자리 입력
    await userEvent.type(otpInput, '12345')
    expect(otpButton).toBeDisabled()

    // 6자리 입력
    await userEvent.type(otpInput, '6')
    expect(otpButton).not.toBeDisabled()
  })

  it('OTP 오류 시 에러 메시지를 표시한다', async () => {
    server.use(
      http.post('*/user/login', () =>
        HttpResponse.json({
          statusCode: 200,
          data: { type: 'O' },
          error: [],
        })
      ),
      http.post('*/user/otplogin', () =>
        HttpResponse.json(
          {
            statusCode: 400,
            data: {},
            error: ['잘못된 OTP 코드입니다.'],
          },
          { status: 400 }
        )
      )
    )

    render(<LoginPage />)

    await userEvent.type(screen.getByLabelText(/이메일/), 'user@test.com')
    await userEvent.type(screen.getByLabelText(/비밀번호/), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /^로그인$/ }))

    const otpInput = await screen.findByLabelText(/인증번호/)
    await userEvent.type(otpInput, '000000')
    await userEvent.click(screen.getByRole('button', { name: /OTP 인증/ }))

    expect(await screen.findByText(/잘못된 OTP 코드입니다./)).toBeInTheDocument()
  })

  it('"처음부터 시작" 버튼을 클릭하면 자격증명 폼으로 돌아간다', async () => {
    server.use(
      http.post('*/user/login', () =>
        HttpResponse.json({
          statusCode: 200,
          data: { type: 'O' },
          error: [],
        })
      )
    )

    render(<LoginPage />)

    await userEvent.type(screen.getByLabelText(/이메일/), 'user@test.com')
    await userEvent.type(screen.getByLabelText(/비밀번호/), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /^로그인$/ }))

    // OTP 단계 확인
    expect(await screen.findByLabelText(/인증번호/)).toBeInTheDocument()

    // "처음부터 시작" 버튼 클릭
    await userEvent.click(screen.getByRole('button', { name: /처음부터 시작/ }))

    // 자격증명 폼으로 돌아갔는지 확인
    expect(screen.getByLabelText(/^이메일/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^비밀번호/)).toBeInTheDocument()
  })

  it('OTP 중에는 제출 버튼이 disabled다', async () => {
    let resolveOtp: () => void = () => {}
    const otpPromise = new Promise<void>((resolve) => {
      resolveOtp = resolve
    })

    server.use(
      http.post('*/user/login', () =>
        HttpResponse.json({
          statusCode: 200,
          data: { type: 'O' },
          error: [],
        })
      ),
      http.post('*/user/otplogin', async () => {
        await otpPromise
        return HttpResponse.json({
          statusCode: 200,
          data: { token: 'tok' },
          error: [],
        })
      })
    )

    render(<LoginPage />)

    await userEvent.type(screen.getByLabelText(/이메일/), 'user@test.com')
    await userEvent.type(screen.getByLabelText(/비밀번호/), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /^로그인$/ }))

    const otpInput = await screen.findByLabelText(/인증번호/)
    await userEvent.type(otpInput, '123456')

    const otpButton = screen.getByRole('button', { name: /OTP 인증/ })
    await userEvent.click(otpButton)

    expect(otpButton).toBeDisabled()
    expect(otpButton).toHaveTextContent(/OTP 확인 중/)

    resolveOtp()
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

    expect(ivButton).toBeDisabled()
    expect(ivButton).toHaveTextContent(/본인인증 중/)

    resolveVerification()
  })

  it('본인인증은 여러 번 시도할 수 있다', async () => {
    const { requestIdentityVerification } = await import('@portone/browser-sdk/v2')

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

    await userEvent.click(ivButton)
    expect(await screen.findByText(/본인인증이 완료되었습니다./)).toBeInTheDocument()

    vi.mocked(requestIdentityVerification).mockResolvedValueOnce({
      code: 'USER_CANCELLED',
      message: '사용자가 취소했습니다.',
    } as any)

    await userEvent.click(ivButton)

    expect(await screen.findByText(/사용자가 취소했습니다./)).toBeInTheDocument()
  })
})
