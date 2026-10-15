import { SlidersHorizontal, X } from 'lucide-react'
import type { Precision, SourceType } from '../data/schema'
import { PRECISION_LABELS, SOURCE_TYPE_LABELS } from '../lib/labels'
import { useFilters } from '../lib/store'
import { Chip } from './ui'

export function MeasureFilters() {
  const f = useFilters()
  const active = f.sourceTypes.length > 0 || f.precisions.length > 0 || f.onlyCosted
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4" role="group" aria-label="Filtres des mesures">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
          <SlidersHorizontal className="size-4" aria-hidden="true" /> Filtrer les mesures
        </span>
        {active && (
          <button type="button" onClick={f.reset} className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-ink">
            <X className="size-3.5" aria-hidden="true" /> Réinitialiser
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-full text-xs font-medium uppercase tracking-wide text-muted sm:w-auto sm:pr-1">Source</span>
        {(Object.keys(SOURCE_TYPE_LABELS) as SourceType[]).map((s) => (
          <Chip key={s} active={f.sourceTypes.includes(s)} onClick={() => f.toggleSourceType(s)} className="text-xs">
            {SOURCE_TYPE_LABELS[s].label}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-full text-xs font-medium uppercase tracking-wide text-muted sm:w-auto sm:pr-1">Précision</span>
        {(Object.keys(PRECISION_LABELS) as Precision[]).map((p) => (
          <Chip key={p} active={f.precisions.includes(p)} onClick={() => f.togglePrecision(p)} className="text-xs">
            {PRECISION_LABELS[p].label}
          </Chip>
        ))}
        <Chip active={f.onlyCosted} onClick={() => f.setOnlyCosted(!f.onlyCosted)} className="text-xs">
          Chiffrées uniquement
        </Chip>
      </div>
    </div>
  )
}
