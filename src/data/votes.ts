import type { VotesFile } from './schema'
import votesRaw from './votes.json'
import { cachedData } from '.'

// Module à part : les votes ne sont chargés qu'avec les pages qui les affichent (Votes, fiches candidats).
export const votes: VotesFile = cachedData?.votes ?? (votesRaw as VotesFile)
