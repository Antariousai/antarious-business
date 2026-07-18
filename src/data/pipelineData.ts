/** Compatibility re-exports — CRM source of truth lives in crmData.ts */
export {
  DEAL_STAGES,
  stageMeta,
  normalizeStage,
  formatMoney,
  formatShortDate,
  forecastValue,
  isOverdue,
  SEED_DEALS,
  type DealStage,
  type DealPriority,
  type CrmDeal as Deal,
} from './crmData'
