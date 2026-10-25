import type { Budgets, Context } from './schema'
import contextRaw from './context.json'
import budgetsRaw from './budgets.json'
import { cachedData } from '.'

// Module à part, comme elections.ts : chargé seulement par les pages qui l'affichent.
export const context: Context = cachedData?.context ?? (contextRaw as Context)
export const budgets: Budgets = cachedData?.budgets ?? (budgetsRaw as Budgets)
