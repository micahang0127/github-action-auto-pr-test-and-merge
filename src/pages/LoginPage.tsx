import * as PortOne from '@portone/browser-sdk/v2'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

import { confirmIdentityVerification } from '../api/auth'
import { DEVICE_TYPE_WEB, login, otpLogin } from '../api/user'
import { useAuthStore } from '../stores/authStore'
import { getFingerprint } from '../utils/fingerprint'

// ─── Types ────────────────────────────────────────────────────────────────────

type LoginStep = { kind: 'credentials' } | { kind: 'otp'; email: string; expiresAt: number }

// ─── Component ─────────────────────────────────────────────────────────────────

export function LoginPage() {
  const navigate = useNavigate()
  const setLoggedIn = useAuthStore((s) => s.setLoggedIn)

  // 로그인 단계 상태
  const [step, setStep] = useState<LoginStep>({ kind: 'credentials' })

  // 자격증명 폼 상태
  const [form, setForm] = useState({ email: '', password: '' })

  // OTP 입력 상태
  const [otpCode, setOtpCode] = useState('')
  const [timeLeft, setTimeLeft] = useState(0)

  // 본인인증 상태
  const [ivPending, setIvPending] = useState(false)
  const [ivError, setIvError] = useState<string | null>(null)
  const [ivSuccess, setIvSuccess] = useState(false)

  // 핑거프린트 (두 mutation 간 공유)
  const fingerprintRef = useRef<string | null>(null)

  // ─── OTP 타이머 ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (step.kind !== 'otp') return

    const tick = () => {
      const remaining = Math.max(0, Math.floor((step.expiresAt - Date.now()) / 1000))
      setTimeLeft(remaining)
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [step])

  // ─── Mutations ─────────────────────────────────────────────────────────────────

  const loginMutation = useMutation({
    mutationFn: async (vars: { email: string; password: string }) => {
      const fp = await getFingerprint()
      fingerprintRef.current = fp
      return login({ email: vars.email, password: vars.password, deviceType: DEVICE_TYPE_WEB }, fp)
    },
    onSuccess: (res) => {
      if (res.data.type === 'T' && res.data.token) {
        // 같은 기기 — 즉시 로그인
        sessionStorage.setItem('accessToken', res.data.token)
        setLoggedIn(true)
        void navigate({ to: '/main' })
      } else if (res.data.type === 'O') {
        // 새 기기 — OTP 필요
        setStep({
          kind: 'otp',
          email: form.email,
          expiresAt: Date.now() + 5 * 60 * 1000, // 5분
        })
      }
    },
    // [TEMP] 추후 로그인 backend api 연동 필요 26.04.14
    // backend 연동 완료 시 아래 onError 블록 전체 제거
    onError: () => {
      const TEMP_TOKEN =
        'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJ0ZW1wLXVzZXIiLCJleHAiOjk5OTk5OTk5OTl9.temp'
      sessionStorage.setItem('accessToken', TEMP_TOKEN)
      setLoggedIn(true)
      void navigate({ to: '/main' })
    },
    // [TEMP] end
  })

  const otpMutation = useMutation({
    mutationFn: (vars: { otpCode: string; email: string }) =>
      otpLogin(
        { email: vars.email, otpCode: vars.otpCode, deviceType: DEVICE_TYPE_WEB },
        fingerprintRef.current
      ),
    onSuccess: (res) => {
      sessionStorage.setItem('accessToken', res.data.token)
      setLoggedIn(true)
      void navigate({ to: '/main' })
    },
  })

  // ─── Event Handlers ───────────────────────────────────────────────────────────

  const handleLoginSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    loginMutation.mutate(form)
  }

  const handleOtpSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (step.kind !== 'otp') return
    otpMutation.mutate({ otpCode, email: step.email })
  }

  const handleIdentityVerification = async () => {
    setIvPending(true)
    setIvError(null)
    setIvSuccess(false)

    const identityVerificationId = `identity-verification-${crypto.randomUUID()}`

    const response = await PortOne.requestIdentityVerification({
      storeId: import.meta.env.VITE_PORTONE_STORE_ID ?? '',
      identityVerificationId,
      channelKey: import.meta.env.VITE_PORTONE_CHANNEL_KEY ?? '',
      popup: {
        center: true,
      },
    })

    if (response?.code !== undefined) {
      setIvError(response.message ?? '본인인증에 실패했습니다.')
      setIvPending(false)
      return
    }

    try {
      const res = await confirmIdentityVerification({ identityVerificationId })
      if (res.statusCode === 200) {
        setIvSuccess(true)
        setIvError(null)
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '본인인증 확인 중 오류가 발생했습니다.'
      setIvError(errorMessage)
      setIvSuccess(false)
    } finally {
      setIvPending(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  const credentialErrors = loginMutation.error instanceof Error ? [loginMutation.error.message] : []
  const otpErrors = otpMutation.error instanceof Error ? [otpMutation.error.message] : []

  const isOtpExpired = timeLeft === 0 && step.kind === 'otp'
  const canSubmitOtp = otpCode.length === 6 && !isOtpExpired && !otpMutation.isPending

  return (
    <section className="mx-auto w-full max-w-sm">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">로그인</h1>

      {step.kind === 'credentials' ? (
        <>
          {/* 자격증명 폼 에러 */}
          {credentialErrors.length > 0 && (
            <ul className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {credentialErrors.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          )}

          {/* 자격증명 폼 */}
          <form className="space-y-4" onSubmit={handleLoginSubmit}>
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
                이메일
              </label>
              <input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loginMutation.isPending ? '로그인 중...' : '로그인'}
            </button>
          </form>

          {/* 본인인증 피드백 */}
          {ivError && (
            <ul
              role="alert"
              className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-600"
            >
              <li>{ivError}</li>
            </ul>
          )}
          {ivSuccess && (
            <p className="mt-4 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-600">
              본인인증이 완료되었습니다.
            </p>
          )}

          {/* 구분선 */}
          <div className="my-6 flex items-center gap-3">
            <hr className="flex-1 border-gray-200" />
            <span className="text-xs text-gray-400">또는</span>
            <hr className="flex-1 border-gray-200" />
          </div>

          {/* 본인인증 버튼 */}
          <button
            type="button"
            disabled={ivPending}
            onClick={() => {
              void handleIdentityVerification()
            }}
            className="w-full rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {ivPending ? '본인인증 중...' : '본인인증'}
          </button>
        </>
      ) : (
        <>
          {/* OTP 폼 에러 */}
          {otpErrors.length > 0 && (
            <ul className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {otpErrors.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          )}

          {/* OTP 만료 알림 */}
          {isOtpExpired && (
            <div className="mb-4 rounded border border-orange-200 bg-orange-50 p-3 text-sm text-orange-600">
              인증 시간이 만료되었습니다. 다시 로그인해주세요.
            </div>
          )}

          {/* OTP 입력 폼 */}
          <form className="space-y-4" onSubmit={handleOtpSubmit}>
            <p className="text-sm text-gray-600">
              {step.email}로 발송된 6자리 인증번호를 입력해주세요.
            </p>

            <div>
              <label htmlFor="otp-code" className="mb-1 block text-sm font-medium text-gray-700">
                인증번호
              </label>
              <input
                id="otp-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                className="w-full rounded border border-gray-300 px-3 py-2 text-center text-sm font-mono tracking-widest focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* OTP 타이머 */}
            <div className="text-center text-sm text-gray-600">
              남은 시간:{' '}
              <span className={isOtpExpired ? 'text-red-600' : ''}>
                {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:
                {String(timeLeft % 60).padStart(2, '0')}
              </span>
            </div>

            {/* OTP 제출 버튼 */}
            <button
              type="submit"
              disabled={!canSubmitOtp}
              className="w-full rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {otpMutation.isPending ? 'OTP 확인 중...' : 'OTP 인증'}
            </button>

            {/* 다시 로그인하기 */}
            <button
              type="button"
              onClick={() => {
                setStep({ kind: 'credentials' })
                setOtpCode('')
                setTimeLeft(0)
              }}
              className="w-full rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              처음부터 시작
            </button>
          </form>
        </>
      )}
    </section>
  )
}
