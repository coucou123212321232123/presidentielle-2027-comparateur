import { FileText, Globe, BookOpen, Video, FileX, BadgeCheck, MessageSquareQuote, Vote, Search } from 'lucide-react'
import type { CandidateStatus, Precision, ProgramFormat, ProgramStatus, SourceType } from '../data/schema'
import { FORMAT_LABELS, PRECISION_LABELS, PROGRAM_STATUS_LABELS, SOURCE_TYPE_LABELS, STATUS_LABELS } from '../lib/labels'
import { Badge } from './ui'

const SOURCE_TONES = { officiel: 'blue', declaration: 'violet', vote_ou_bilan: 'teal', analyse_tierce: 'amber' } as const
const SOURCE_ICONS = { officiel: BadgeCheck, declaration: MessageSquareQuote, vote_ou_bilan: Vote, analyse_tierce: Search }

export function SourceTypeBadge({ type }: { type: SourceType }) {
  const Icon = SOURCE_ICONS[type]
  return (
    <Badge tone={SOURCE_TONES[type]} title={SOURCE_TYPE_LABELS[type].hint}>
      <Icon className="size-3" aria-hidden="true" />
      {SOURCE_TYPE_LABELS[type].label}
    </Badge>
  )
}

export function PrecisionBadge({ precision }: { precision: Precision }) {
  return <Badge title={PRECISION_LABELS[precision].hint}>{PRECISION_LABELS[precision].label}</Badge>
}

export function StatusBadge({ status }: { status: CandidateStatus }) {
  const tone = status === 'declare' ? 'green' : status === 'probable' ? 'amber' : 'neutral'
  return <Badge tone={tone}>{STATUS_LABELS[status]}</Badge>
}

export function ProgramStatusBadge({ status }: { status: ProgramStatus }) {
  const tone = status === 'publie' ? 'green' : status === 'partiel' ? 'amber' : 'neutral'
  return <Badge tone={tone}>{PROGRAM_STATUS_LABELS[status]}</Badge>
}

const FORMAT_ICONS = { pdf: FileText, page_web: Globe, livret: BookOpen, video: Video, aucun: FileX }

export function FormatIcon({ format, className = 'size-4' }: { format: ProgramFormat; className?: string }) {
  const Icon = FORMAT_ICONS[format]
  return <Icon className={className} aria-label={FORMAT_LABELS[format]} role="img" />
}
