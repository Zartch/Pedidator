import '@/i18n'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { InstallHint, isIosSafari, shouldShowInstallHint } from './InstallHint'

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'
const IPAD_SAFARI_DESKTOP_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15'
const IPHONE_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1'
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'
const MAC_SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15'

describe('iOS Safari detection', () => {
  it('recognises Safari on iPhone and iPad', () => {
    expect(isIosSafari({ userAgent: IPHONE_SAFARI, standalone: false, maxTouchPoints: 5 })).toBe(true)
    expect(
      isIosSafari({ userAgent: IPAD_SAFARI_DESKTOP_UA, standalone: false, maxTouchPoints: 5 }),
    ).toBe(true)
  })

  it('rejects a Mac without touch, Chrome on iOS and Android', () => {
    expect(isIosSafari({ userAgent: MAC_SAFARI, standalone: false, maxTouchPoints: 0 })).toBe(false)
    expect(isIosSafari({ userAgent: IPHONE_CHROME, standalone: false, maxTouchPoints: 5 })).toBe(false)
    expect(isIosSafari({ userAgent: ANDROID_CHROME, standalone: false, maxTouchPoints: 5 })).toBe(false)
  })
})

describe('shouldShowInstallHint', () => {
  it('shows it in iOS Safari when the app is not installed', () => {
    expect(shouldShowInstallHint({ userAgent: IPHONE_SAFARI, standalone: false, maxTouchPoints: 5 })).toBe(true)
  })

  it('hides it once the app runs installed', () => {
    expect(shouldShowInstallHint({ userAgent: IPHONE_SAFARI, standalone: true, maxTouchPoints: 5 })).toBe(false)
  })

  it('hides it outside iOS Safari', () => {
    expect(shouldShowInstallHint({ userAgent: ANDROID_CHROME, standalone: false, maxTouchPoints: 5 })).toBe(false)
    expect(shouldShowInstallHint({ userAgent: IPHONE_CHROME, standalone: false, maxTouchPoints: 5 })).toBe(false)
  })
})

describe('InstallHint', () => {
  const originalUa = Object.getOwnPropertyDescriptor(window.navigator, 'userAgent')

  function setUserAgent(value: string) {
    Object.defineProperty(window.navigator, 'userAgent', { value, configurable: true })
  }

  beforeEach(() => {
    window.localStorage.clear()
    setUserAgent(IPHONE_SAFARI)
  })

  afterEach(() => {
    cleanup()
    if (originalUa) Object.defineProperty(window.navigator, 'userAgent', originalUa)
    else delete (window.navigator as { userAgent?: string }).userAgent
    window.localStorage.clear()
  })

  it('can be closed and the choice is remembered', () => {
    const { unmount } = render(<InstallHint />)
    const close = screen.getByRole('button', { name: /Ocultar|Amaga/ })
    fireEvent.click(close)
    expect(screen.queryByRole('button', { name: /Ocultar|Amaga/ })).toBeNull()
    expect(window.localStorage.getItem('pedidator.installHint.dismissed')).toBe('1')
    unmount()

    render(<InstallHint />)
    expect(screen.queryByRole('button', { name: /Ocultar|Amaga/ })).toBeNull()
  })

  it('renders nothing outside iOS Safari', () => {
    setUserAgent(ANDROID_CHROME)
    render(<InstallHint />)
    expect(screen.queryByRole('button', { name: /Ocultar|Amaga/ })).toBeNull()
  })
})
