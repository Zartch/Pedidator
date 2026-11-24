import { beforeEach, describe, expect, it, vi } from 'vitest'

const compress = vi.fn()
vi.mock('browser-image-compression', () => ({ default: (...a: unknown[]) => compress(...a) }))

import { preparePhoto } from './photo'

beforeEach(() => {
  compress.mockReset()
  compress.mockImplementation(async (f: File) => new Blob([f], { type: 'image/jpeg' }))
})

describe('preparePhoto', () => {
  it('compresses to 1600 px JPEG 0.7 and builds a 300 px thumbnail', async () => {
    const file = new File(['x'], 'a.png', { type: 'image/png' })
    const { photo, thumb } = await preparePhoto(file)
    expect(photo).toBeInstanceOf(Blob)
    expect(thumb).toBeInstanceOf(Blob)
    expect(compress).toHaveBeenCalledTimes(2)
    expect(compress.mock.calls[0][1]).toMatchObject({
      maxWidthOrHeight: 1600,
      initialQuality: 0.7,
      fileType: 'image/jpeg',
    })
    expect(compress.mock.calls[1][1]).toMatchObject({ maxWidthOrHeight: 300 })
  })
})
