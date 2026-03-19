import * as PortOne from '@portone/browser-sdk/v2'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { confirmIdentityVerification } from '../api/auth'
// import { login } from '../api/user'
import { useAuthStore } from '../stores/authStore'

export function LoginPage() {
  const navigate = useNavigate()
  const setLoggedIn = useAuthStore((s) => s.setLoggedIn)
  const [form, setForm] = useState({ email: '', password: '' })
  const [ivPending, setIvPending] = useState(false)
  const [ivError, setIvError] = useState<string | null>(null)
  const [ivSuccess, setIvSuccess] = useState(false)

  const {
    mutate,
    isPending,
    error: mutError,
  } = useMutation({
    // [TEMP] 로그인 API 미연동으로 mutationFn 임시 처리 26.03.19 
    // mutationFn: login,
    mutationFn: async (vars: typeof form) => {
      // 테스트를 위해 특정 이메일 입력 시 실패하도록 처리
      if (vars.email === 'wrong@test.com') {
        throw new Error('이메일 또는 비밀번호가 틀렸습니다.')
      }
      return { data: { accessToken: 'new-token-123' } } as any
    },
    onSuccess: (res) => {
      // [TEMP] 26.03.11
      // if (res.statusCode === 200) {
      localStorage.setItem('accessToken', res.data.accessToken)
      setLoggedIn(true)
      navigate({ to: '/main' })
      // }
    },
  })

  const errorMessages = mutError instanceof Error ? [mutError.message] : []

  const handleIdentityVerification = async () => {
    setIvPending(true)
    setIvError(null)
    setIvSuccess(false) // 시작 시 이전 성공 상태를 확실히 초기화

    const identityVerificationId = `identity-verification-${crypto.randomUUID()}`

    const response = await PortOne.requestIdentityVerification({
      storeId: (import.meta.env.VITE_PORTONE_STORE_ID ?? '') as string,
      identityVerificationId,
      channelKey: (import.meta.env.VITE_PORTONE_CHANNEL_KEY ?? '') as string,
      popup: {
        center: true,
      },
    })

    if (response?.code !== undefined) {
      // 사용자 취소 또는 SDK 오류
      setIvError(response.message ?? '본인인증에 실패했습니다.')
      setIvPending(false)
      return
    }

    // 백엔드 최종 검증
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

  return (
    <section className="mx-auto w-full max-w-sm">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">로그인</h1>

      {errorMessages.length > 0 && (
        <ul className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {errorMessages.map((msg) => (
            <li key={msg}>{msg}</li>
          ))}
        </ul>
      )}

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          mutate(form)
        }}
      >
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
          disabled={isPending}
          className="w-full rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {isPending ? '로그인 중...' : '로그인'}
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
        onClick={handleIdentityVerification}
        className="w-full rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {ivPending ? '본인인증 중...' : '본인인증'}
      </button>
    </section>
  )
}
