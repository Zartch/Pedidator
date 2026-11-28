import '@/i18n'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { AppDialog } from './AppDialog'

afterEach(cleanup)

describe('AppDialog', () => {
  it('reopens when the native dialog closes by itself (second Escape in Chrome)', () => {
    // jsdom has no showModal: provide a minimal one that tracks `open`.
    const proto = HTMLDialogElement.prototype
    let shown = 0
    proto.showModal = function (this: HTMLDialogElement) {
      shown++
      this.setAttribute('open', '')
    }
    proto.close = function (this: HTMLDialogElement) {
      this.removeAttribute('open')
    }
    const { container } = render(
      <AppDialog open title="T" onClose={() => {}}>
        x
      </AppDialog>,
    )
    const dialog = container.querySelector('dialog') as HTMLDialogElement
    expect(dialog.open).toBe(true)
    expect(shown).toBe(1)

    dialog.removeAttribute('open')
    fireEvent(dialog, new Event('close'))
    expect(dialog.open).toBe(true)
    expect(shown).toBe(2)
  })
})
