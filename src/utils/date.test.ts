import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { describe, expect, it } from 'vitest'

import { formatDate, formatDateTime } from './date'

dayjs.extend(utc)
dayjs.extend(timezone)

describe('date utilities', () => {
  describe('formatDate', () => {
    it('should format UTC date to YYYY.MM.DD in KST', () => {
      const utcDate = '2024-01-15T00:00:00Z'
      const result = formatDate(utcDate)
      expect(result).toBe('2024.01.15')
    })

    it('should handle Date object input', () => {
      const utcDate = new Date('2024-06-20T10:30:00Z')
      const result = formatDate(utcDate)
      expect(result).toBe('2024.06.20')
    })
  })

  describe('formatDateTime', () => {
    it('should format UTC datetime to YYYY.MM.DD HH:mm in KST', () => {
      const utcDate = '2024-01-15T15:30:00Z'
      const result = formatDateTime(utcDate)
      expect(result).toBe('2024.01.16 00:30')
    })

    it('should handle Date object input', () => {
      const utcDate = new Date('2024-06-20T10:30:00Z')
      const result = formatDateTime(utcDate)
      expect(result).toBe('2024.06.20 19:30')
    })
  })
})
