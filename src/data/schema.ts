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
  indicator: z
    .object({ key: z.string(), value: z.union([z.string(), z.number()]) })
    .nullable()
    .optional(),
  last_verified: isoDate,
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

/** Paquet de données publié en ligne (public-data/data.json) et téléchargé par l'application. */
export const DataBundleSchema = z.object({
  version: z.literal(1),
  generated_at: z.string(),
  meta: MetaSchema,
  themes: z.array(ThemeSchema),
  candidates: z.array(CandidateSchema),
  measures: z.record(z.string(), MeasureFileSchema),
  link_status: LinkStatusSchema,
  changelog: ChangelogSchema,
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
