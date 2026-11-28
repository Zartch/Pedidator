import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { deriveBrand } from '@shared/theme'
import { BrandTheme } from './BrandTheme'

const root = () => document.documentElement.style

function brandVariables() {
  return {
    '--brand': root().getPropertyValue('--brand'),
    '--on-brand': root().getPropertyValue('--on-brand'),
    '--brand-strong': root().getPropertyValue('--brand-strong'),
    '--brand-soft': root().getPropertyValue('--brand-soft'),
  }
}

afterEach(() => {
  cleanup()
  for (const name of ['--brand', '--on-brand', '--brand-strong', '--brand-soft']) {
    root().removeProperty(name)
  }
})

describe('BrandTheme', () => {
  it('sets the four brand variables from deriveBrand and removes them on unmount', () => {
    const expected = deriveBrand('#a31d2f')!
    const { unmount } = render(
      <BrandTheme color="#a31d2f">
        <p>x</p>
      </BrandTheme>,
    )
    expect(brandVariables()).toEqual({
      '--brand': expected.brand,
      '--on-brand': expected.onBrand,
      '--brand-strong': expected.brandStrong,
      '--brand-soft': expected.brandSoft,
    })
    unmount()
    expect(brandVariables()).toEqual({
      '--brand': '',
      '--on-brand': '',
      '--brand-strong': '',
      '--brand-soft': '',
    })
  })

  it('without a color stays neutral and clears a previous color', () => {
    const { rerender } = render(<BrandTheme color="#0f67b3">x</BrandTheme>)
    expect(root().getPropertyValue('--brand')).not.toBe('')
    rerender(<BrandTheme color={null}>x</BrandTheme>)
    expect(brandVariables()['--brand']).toBe('')
  })

  it('an invalid color is treated as neutral', () => {
    render(<BrandTheme color="no-es-un-color">x</BrandTheme>)
    expect(brandVariables()['--brand']).toBe('')
  })
})
