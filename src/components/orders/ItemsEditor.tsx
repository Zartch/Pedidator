import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { emptyDraft, ItemEditorRow, type ItemDraft } from './ItemEditorRow'

type Props = {
  drafts: ItemDraft[]
  onChange: (next: ItemDraft[]) => void
}

/** The items of an order: add, reorder with up/down buttons, delete. */
export function ItemsEditor({ drafts, onChange }: Props) {
  const { t } = useTranslation('orderForm')
  const [focus, setFocus] = useState<{ key: string; n: number }>({ key: '', n: 0 })

  function add() {
    const draft = emptyDraft()
    onChange([...drafts, draft])
    setFocus((f) => ({ key: draft.key, n: f.n + 1 }))
  }

  function move(index: number, delta: -1 | 1) {
    const target = index + delta
    if (target < 0 || target >= drafts.length) return
    const next = [...drafts]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  function goNext(index: number) {
    const next = drafts[index + 1]
    if (!next) return add()
    setFocus((f) => ({ key: next.key, n: f.n + 1 }))
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {drafts.map((d, i) => (
          <ItemEditorRow
            key={d.key}
            draft={d}
            index={i}
            count={drafts.length}
            focusToken={focus.key === d.key ? focus.n : 0}
            onChange={(next) => onChange(drafts.map((x) => (x.key === d.key ? next : x)))}
            onMove={(delta) => move(i, delta)}
            onRemove={() => onChange(drafts.filter((x) => x.key !== d.key))}
            onNext={() => goNext(i)}
          />
        ))}
      </ul>
      <Button onClick={add} className="self-start">
        <Plus className="size-5" aria-hidden="true" />
        {t('items.add')}
      </Button>
    </div>
  )
}
