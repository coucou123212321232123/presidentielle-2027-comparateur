import type {
  CandidateStatus,
  Position,
  Precision,
  ProgramFormat,
  ProgramStatus,
  SourceType,
} from '../data/schema'

export const POSITION_LABELS: Record<Position, string> = {
  extreme_gauche: 'Extrême gauche',
  gauche_radicale: 'Gauche radicale',
  gauche: 'Gauche',
  centre_gauche: 'Centre-gauche',
  centre: 'Centre',
  centre_droit: 'Centre-droit',
  droite: 'Droite',
  extreme_droite: 'Extrême droite',
}

export const POSITION_ORDER: Position[] = Object.keys(POSITION_LABELS) as Position[]

export type Family = 'extreme_gauche' | 'gauche' | 'centre' | 'droite' | 'extreme_droite'

export const FAMILY_LABELS: Record<Family, string> = {
  extreme_gauche: 'Extrême gauche',
  gauche: 'Gauche et écologistes',
  centre: 'Centre',
  droite: 'Droite',
  extreme_droite: 'Extrême droite',
}

export function familyOf(position: Position): Family {
  switch (position) {
    case 'extreme_gauche':
      return 'extreme_gauche'
    case 'gauche_radicale':
    case 'gauche':
    case 'centre_gauche':
      return 'gauche'
    case 'centre':
    case 'centre_droit':
      return 'centre'
    case 'droite':
      return 'droite'
    case 'extreme_droite':
      return 'extreme_droite'
  }
}

export const STATUS_LABELS: Record<CandidateStatus, string> = {
  declare: 'Candidature déclarée',
  probable: 'Candidature probable',
  hypothese: 'Hypothèse',
}

export const SOURCE_TYPE_LABELS: Record<SourceType, { label: string; hint: string }> = {
  officiel: { label: 'Programme officiel', hint: 'Programme, livret ou site officiel du candidat ou de son parti' },
  declaration: { label: 'Déclaration', hint: 'Interview, discours ou tribune du candidat — hors programme écrit' },
  vote_ou_bilan: { label: 'Vote / bilan', hint: 'Proposition de loi, vote au Parlement ou bilan de gestion' },
  analyse_tierce: { label: 'Analyse tierce', hint: 'Source externe au candidat (fact-checking, institut, presse)' },
}

export const PRECISION_LABELS: Record<Precision, { label: string; hint: string }> = {
  chiffre: { label: 'Chiffrée', hint: 'La mesure comporte une valeur chiffrée' },
  precis: { label: 'Précise', hint: 'Mesure concrète, sans chiffrage' },
  orientation_generale: { label: 'Orientation', hint: 'Intention ou principe général' },
}

export const PROGRAM_STATUS_LABELS: Record<ProgramStatus, string> = {
  publie: 'Programme publié',
  partiel: 'Programme partiel',
  en_cours_d_elaboration: "En cours d'élaboration",
}

export const FORMAT_LABELS: Record<ProgramFormat, string> = {
  page_web: 'Page web',
  pdf: 'PDF',
  livret: 'Livret',
  video: 'Vidéo',
  aucun: 'Aucun document',
}
