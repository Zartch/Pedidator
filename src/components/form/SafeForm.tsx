import type { FormHTMLAttributes, KeyboardEvent } from 'react'

// Elements where Enter keeps its normal meaning: a line break, or pressing the focused button.
const ENTER_ALLOWED = new Set(['TEXTAREA', 'BUTTON', 'A'])

/**
 * Form that never submits from the keyboard: Enter in a field does nothing.
 * Saving only happens through an explicit submit button (CLAUDE.md: "Enter nunca envía").
 */
export function SafeForm({ onKeyDown, ...rest }: FormHTMLAttributes<HTMLFormElement>) {
  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    onKeyDown?.(event)
    if (event.key !== 'Enter' || event.defaultPrevented) return
    const target = event.target
    if (target instanceof HTMLElement && ENTER_ALLOWED.has(target.tagName)) return
    event.preventDefault()
  }

  return <form {...rest} onKeyDown={handleKeyDown} />
}
