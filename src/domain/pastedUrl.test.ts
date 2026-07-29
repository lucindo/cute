import { describe, expect, it } from 'vitest'

import { classifyPastedUrl } from './pastedUrl'

describe('classifyPastedUrl', () => {
  it('passes a direct image URL through as a fetch candidate', () => {
    const result = classifyPastedUrl('https://cdn.example.com/photo.jpg')
    expect(result).toEqual({ kind: 'candidate', url: new URL('https://cdn.example.com/photo.jpg') })
  })

  it('treats an extensionless CDN URL as a candidate rather than guessing', () => {
    const result = classifyPastedUrl('https://pbs.twimg.com/media/ABC?format=jpg&name=large')
    expect(result.kind).toBe('candidate')
  })

  it('names a social page link by its base host', () => {
    expect(classifyPastedUrl('https://www.instagram.com/p/abc123/')).toEqual({
      kind: 'page-link',
      host: 'instagram.com',
    })
  })

  it('matches page hosts through any subdomain', () => {
    expect(classifyPastedUrl('https://m.facebook.com/story?id=1')).toEqual({
      kind: 'page-link',
      host: 'facebook.com',
    })
  })

  it('does not match a page host as a bare substring of another host', () => {
    expect(classifyPastedUrl('https://notinstagram.com/p/abc').kind).toBe('candidate')
  })

  it('rejects http — it would be blocked as mixed content', () => {
    expect(classifyPastedUrl('http://cdn.example.com/photo.jpg').kind).toBe('none')
  })

  it('rejects plain text and surrounding prose', () => {
    expect(classifyPastedUrl('what a cute baby').kind).toBe('none')
    expect(classifyPastedUrl('look at this https://cdn.example.com/photo.jpg').kind).toBe('none')
  })

  it('tolerates the whitespace a clipboard copy picks up', () => {
    expect(classifyPastedUrl('  https://cdn.example.com/photo.jpg\n').kind).toBe('candidate')
  })
})
