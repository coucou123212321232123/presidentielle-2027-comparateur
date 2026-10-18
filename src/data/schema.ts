import { z } from 'zod'

export const THEME_IDS = [
  'economie',
  'fiscalite',
  'emploi',
  'retraites',
  'energie',
  'ecologie',
  'agriculture',
  'logement',
  'sante',
  'education',
  'securite',
  'immigration',
  'institutions',
  'europe',
  'international',
  'numerique',
  'culture',
  'outre_mer',
  'services_publics',
  'famille',
] as const

export const POSITIONS = [
  'extreme_gauche',
  'gauche_radicale',
  'gauche',
  'centre_gauche',
  'centre',
  'centre_droit',
  'droite',
  'extreme_droite',
] as const

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date attendue au format YYYY-MM-DD')
/** Date d'une source : au jour près, ou au mois près (YYYY-MM) quand le document n'indique que le mois. */
const sourceDate = z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/, 'Date attendue au format YYYY-MM-DD ou YYYY-MM')
const httpUrl = z.string().url().refine((u) => /^https?:\/\//.test(u), 'URL http(s) attendue')

export const ThemeIdSchema = z.enum(THEME_IDS)
export const PositionSchema = z.enum(POSITIONS)
export const SourceTypeSchema = z.enum(['officiel', 'declaration', 'vote_ou_bilan', 'analyse_tierce'])
export const PrecisionSchema = z.enum(['chiffre', 'precis', 'orientation_generale'])
export const CandidateStatusSchema = z.enum(['declare', 'probable', 'hypothese'])
export const ProgramFormatSchema = z.enum(['page_web', 'pdf', 'livret', 'video', 'aucun'])
export const ProgramStatusSchema = z.enum(['publie', 'partiel', 'en_cours_d_elaboration'])

export const IndicatorDefSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(['number', 'enum']),
  unit: z.string().optional(),
  options: z.record(z.string(), z.string()).optional(),
})

export const ThemeSchema = z.object({
  id: ThemeIdSchema,
  label: z.string(),
  short: z.string(),
  icon: z.string(),
  description: z.string(),
  indicators: z.array(IndicatorDefSchema),
})

export const ThematicLinkSchema = z.object({
  theme: ThemeIdSchema,
  title: z.string().min(1),
  url: httpUrl,
  format: ProgramFormatSchema,
  page_range: z.string().nullable().optional(),
})

export const ProgramSchema = z.object({
  title: z.string().nullable(),
  main_url: httpUrl.nullable(),
  format: ProgramFormatSchema,
  published_date: isoDate.nullable(),
  status: ProgramStatusSchema,
  note: z.string().nullable().optional(),
  thematic_links: z.array(ThematicLinkSchema),
  archive_url: httpUrl.nullable(),
})

export const CandidateSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    birth_date: isoDate.nullable(),
    party: z.string().min(1),
    party_short: z.string().min(1),
    position: PositionSchema,
    position_source_url: httpUrl.nullable(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    status: CandidateStatusSchema,
    status_note: z.string().nullable(),
    status_source_url: httpUrl.nullable(),
    declaration_date: isoDate.nullable(),
    photo: z
      .object({
        url: httpUrl,
        commons_page: httpUrl,
        author: z.string().nullable(),
        license: z.string().min(1),
      })
      .nullable(),
    bio_summary: z.string().min(1),
    current_roles: z.array(z.string()),
    past_roles: z.array(z.string()),
    key_people: z.array(z.object({ name: z.string().min(1), role: z.string().min(1) })),
    slogan: z.string().nullable(),
    slogan_source_url: httpUrl.nullable(),
    main_axes: z.array(z.string()).max(5),
    main_axes_source_url: httpUrl.nullable(),
    website: httpUrl.nullable(),
    news_url: httpUrl.nullable(),
    socials: z.array(z.object({ platform: z.string(), url: httpUrl })),
    program: ProgramSchema,
    sources: z.array(z.object({ label: z.string(), url: httpUrl })),
    last_verified: isoDate,
  })
  .refine((c) => c.slogan === null || c.slogan_source_url !== null, {
    message: 'Un slogan doit être accompagné de sa source',
    path: ['slogan_source_url'],
  })
  .refine((c) => c.main_axes.length === 0 || c.main_axes_source_url !== null, {
    message: 'Les axes principaux doivent être sourcés',
    path: ['main_axes_source_url'],
  })

export const IndicatorValueSchema = z.object({ key: z.string(), value: z.union([z.string(), z.number()]) })

export const MeasureSchema = z.object({
  id: z.string().regex(/^[a-z0-9_-]+$/),
  theme: ThemeIdSchema,
  title: z.string().min(1).max(140),
  description: z.string().min(1),
  source_type: SourceTypeSchema,
  source_title: z.string().min(1),
  source_url: httpUrl,
  source_date: sourceDate.nullable(),
  source_page: z.string().nullable().optional(),
  precision: PrecisionSchema,
  cost: z
    .object({
      label: z.string().min(1),
      source_label: z.string().min(1),
      source_url: httpUrl.nullable().optional(),
    })
    .nullable()
    .optional(),
  /** Point(s) de comparaison énoncé(s) littéralement par la source (une mesure peut en porter plusieurs). */
  indicator: z.union([IndicatorValueSchema, z.array(IndicatorValueSchema).min(1)]).nullable().optional(),
  last_verified: isoDate,
  /** Date d'ajout de la mesure à l'outil (badge « Nouveau »). */
  added: isoDate,
})

export const MeasureFileSchema = z.array(MeasureSchema)

export const OtherCandidateSchema = z.object({
  name: z.string(),
  party: z.string(),
  declaration_date: isoDate.nullable(),
})

export const MetaSchema = z.object({
  last_updated: isoDate,
  election: z.object({ first_round: isoDate, second_round: isoDate }),
  inclusion_rule: z.string(),
  inclusion_sources: z.array(z.object({ label: z.string(), url: httpUrl })),
  other_declared: z.array(OtherCandidateSchema),
  report_url: z.string().nullable(),
})

export const LinkStatusSchema = z.record(
  z.string(),
  z.object({
    ok: z.boolean(),
    status: z.number().nullable(),
    checked_at: z.string(),
    note: z.string().optional(),
    archive: httpUrl.optional(),
  }),
)

export const ChangelogSchema = z.array(
  z.object({
    date: isoDate,
    summary: z.string(),
    accepted: z.number().int().nonnegative(),
    rejected: z.number().int().nonnegative(),
    changes: z.array(z.object({ candidate: z.string(), text: z.string() })),
  }),
)

export const GlossaryEntrySchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  term: z.string().min(1),
  expansion: z.string().min(1),
  aliases: z.array(z.string().min(1)),
  definition: z.string().min(1).max(320),
  source_label: z.string().min(1),
  source_url: httpUrl,
})
export const GlossarySchema = z.array(GlossaryEntrySchema)

export const VotePositionSchema = z.enum(['pour', 'contre', 'abstention', 'non_votant', 'absent'])

/** Un scrutin public de l'Assemblée nationale, tel que publié en open data (data.assemblee-nationale.fr). */
export const ScrutinSchema = z.object({
  id: z.string().regex(/^l\d+-\d+$/),
  legislature: z.number().int(),
  numero: z.number().int(),
  date: isoDate,
  /** Intitulé court, rédigé pour l'outil (ex. « Loi immigration : vote final »). */
  short_title: z.string().min(1),
  theme: ThemeIdSchema,
  /** Contexte factuel et neutre (procédure, étape de la navette). */
  context: z.string().min(1),
  /** Intitulé officiel du scrutin. */
  official_title: z.string().min(1),
  vote_type: z.string(),
  /** Motion de censure : seuls les votes « pour » sont recueillis. */
  censure: z.boolean(),
  result: z.enum(['adopte', 'rejete']),
  majority_required: z.number().int().nullable(),
  totals: z.object({ pour: z.number().int(), contre: z.number().int(), abstention: z.number().int(), non_votant: z.number().int() }),
  groups: z.array(
    z.object({
      ref: z.string(),
      short: z.string(),
      label: z.string(),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      members: z.number().int(),
      pour: z.number().int(),
      contre: z.number().int(),
      abstention: z.number().int(),
      non_votant: z.number().int(),
      absent: z.number().int(),
    }),
  ),
  /** Vote des candidats alors députés. */
  candidates: z.array(z.object({ candidate: z.string(), group: z.string(), vote: VotePositionSchema })),
  source_url: httpUrl,
})

export const VotesFileSchema = z.object({
  generated_at: z.string(),
  source_label: z.string(),
  source_url: httpUrl,
  scrutins: z.array(ScrutinSchema),
})

/** Paquet de données publié en ligne (public-data/data-v2.json) et téléchargé par l'application de bureau. */
export const DataBundleSchema = z.object({
  version: z.literal(2),
  generated_at: z.string(),
  meta: MetaSchema,
  themes: z.array(ThemeSchema),
  candidates: z.array(CandidateSchema),
  measures: z.record(z.string(), MeasureFileSchema),
  link_status: LinkStatusSchema,
  changelog: ChangelogSchema,
  glossary: GlossarySchema,
  votes: VotesFileSchema,
})

export type ThemeId = z.infer<typeof ThemeIdSchema>
export type Position = z.infer<typeof PositionSchema>
export type SourceType = z.infer<typeof SourceTypeSchema>
export type Precision = z.infer<typeof PrecisionSchema>
export type CandidateStatus = z.infer<typeof CandidateStatusSchema>
export type ProgramFormat = z.infer<typeof ProgramFormatSchema>
export type ProgramStatus = z.infer<typeof ProgramStatusSchema>
export type IndicatorDef = z.infer<typeof IndicatorDefSchema>
export type Theme = z.infer<typeof ThemeSchema>
export type ThematicLink = z.infer<typeof ThematicLinkSchema>
export type Program = z.infer<typeof ProgramSchema>
export type Candidate = z.infer<typeof CandidateSchema>
export type Measure = z.infer<typeof MeasureSchema>
export type Meta = z.infer<typeof MetaSchema>
export type LinkStatus = z.infer<typeof LinkStatusSchema>
export type Changelog = z.infer<typeof ChangelogSchema>
export type DataBundle = z.infer<typeof DataBundleSchema>
export type IndicatorValue = z.infer<typeof IndicatorValueSchema>
export type GlossaryEntry = z.infer<typeof GlossaryEntrySchema>
export type VotePosition = z.infer<typeof VotePositionSchema>
export type Scrutin = z.infer<typeof ScrutinSchema>
export type VotesFile = z.infer<typeof VotesFileSchema>

/** Indicateurs d'une mesure, toujours sous forme de liste. */
export const indicatorsOf = (m: Measure): IndicatorValue[] => (!m.indicator ? [] : Array.isArray(m.indicator) ? m.indicator : [m.indicator])

/** Nombre de mesures par thème et par date d'ajout, pour un candidat (calculé au build, sans charger les mesures). */
export interface CandidateSummary {
  total: number
  byTheme: Partial<Record<ThemeId, number>>
  /** Nombre de mesures par date d'ajout puis par thème. */
  added: Record<string, Partial<Record<ThemeId, number>>>
}
export type MeasureSummary = Record<string, CandidateSummary>

export function summarize(measures: Record<string, Measure[]>): MeasureSummary {
  return Object.fromEntries(
    Object.entries(measures).map(([id, list]) => {
      const s: CandidateSummary = { total: list.length, byTheme: {}, added: {} }
      for (const m of list) {
        s.byTheme[m.theme] = (s.byTheme[m.theme] ?? 0) + 1
        const day = (s.added[m.added] ??= {})
        day[m.theme] = (day[m.theme] ?? 0) + 1
      }
      return [id, s]
    }),
  )
}
