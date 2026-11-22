import { pgTable, text, timestamp, boolean, bigint, integer, index, check } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const users = pgTable('user', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  name: text('name'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdateFn(() => new Date()),
})

export const ownerAccount = pgTable('owner_account', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const loginAttempt = pgTable('login_attempt', {
  email: text('email').primaryKey(),
  failures: integer('failures').notNull().default(0),
  windowStart: timestamp('window_start').notNull().defaultNow(),
  lockedUntil: timestamp('locked_until'),
})

export const settings = pgTable('app_settings', {
  id: text('id').primaryKey(),
  aiPaused: boolean('ai_paused').notNull().default(false),
  netWorthTargetIdr: bigint('net_worth_target_idr', { mode: 'number' }).notNull().default(500000000000),
  pausedAt: timestamp('paused_at'),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdateFn(() => new Date()),
})

export const agents = pgTable('agent', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  role: text('role').notNull(),
  mandate: text('mandate').notNull(),
  status: text('status').notNull().default('active'),
  dataSource: text('data_source').notNull().default('demo'),
  lastRunAt: timestamp('last_run_at'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const proposals = pgTable('proposal', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  agentId: text('agent_id'),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  category: text('category').notNull(),
  amountIdr: bigint('amount_idr', { mode: 'number' }),
  risk: text('risk').notNull().default('medium'),
  status: text('status').notNull().default('pending'),
  decisionNote: text('decision_note'),
  decidedAt: timestamp('decided_at'),
  dataSource: text('data_source').notNull().default('demo'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const transactions = pgTable('transaction', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  kind: text('kind').notNull(),
  category: text('category').notNull(),
  description: text('description').notNull(),
  amountIdr: bigint('amount_idr', { mode: 'number' }).notNull(),
  occurredAt: timestamp('occurred_at').notNull().defaultNow(),
  dataSource: text('data_source').notNull().default('live'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const assets = pgTable('asset', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  kind: text('kind').notNull(),
  valueIdr: bigint('value_idr', { mode: 'number' }).notNull(),
  dataSource: text('data_source').notNull().default('live'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const activity = pgTable('activity_entry', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  actor: text('actor').notNull(),
  agentName: text('agent_name'),
  action: text('action').notNull(),
  detail: text('detail').notNull(),
  dataSource: text('data_source').notNull().default('demo'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const revenueOffers = pgTable('revenue_offer', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  model: text('model').notNull(),
  market: text('market').notNull().default('both'),
  description: text('description').notNull(),
  priceIdr: bigint('price_idr', { mode: 'number' }).notNull().default(0),
  status: text('status').notNull().default('draft'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const revenueLeads = pgTable('revenue_lead', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  email: text('email').notNull(),
  market: text('market').notNull().default('Indonesia'),
  interest: text('interest').notNull(),
  // The CRM stage: new → contacted → qualified → proposal → won / lost.
  status: text('status').notNull().default('new'),
  source: text('source').notNull().default('owner-entry'),
  notes: text('notes'),
  outreachBody: text('outreach_body'),
  outreachSource: text('outreach_source'),
  lastContactedAt: timestamp('last_contacted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdateFn(() => new Date()),
})


// ── Revenue engine: digital products ──────────────────────────────────────
// A product is catalog content the owner authors; an order is an intent to buy.
// Money enters the books only through `transactions`, and only once a payment
// provider confirms it — never from a click or a page view.

export const products = pgTable('product', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  summary: text('summary').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull().default('template'),
  priceIdr: bigint('price_idr', { mode: 'number' }).notNull().default(0),
  status: text('status').notNull().default('draft'),
  deliverableNote: text('deliverable_note'),
  fileKey: text('file_key'),
  fileName: text('file_name'),
  fileSize: integer('file_size'),
  dataSource: text('data_source').notNull().default('live'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdateFn(() => new Date()),
})

export const customers = pgTable('customer', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  country: text('country').notNull().default('ID'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const orders = pgTable('order', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  code: text('code').notNull().unique(),
  accessToken: text('access_token').notNull().unique(),
  productId: text('product_id').notNull(),
  productSlug: text('product_slug').notNull(),
  productName: text('product_name').notNull(),
  customerId: text('customer_id'),
  buyerName: text('buyer_name').notNull(),
  buyerEmail: text('buyer_email').notNull(),
  amountIdr: bigint('amount_idr', { mode: 'number' }).notNull(),
  status: text('status').notNull().default('pending'),
  provider: text('provider').notNull().default('manual_transfer'),
  invoiceId: text('invoice_id'),
  invoiceUrl: text('invoice_url'),
  paidAt: timestamp('paid_at'),
  // A refund is only ever recorded after the payment provider accepts it.
  refundId: text('refund_id'),
  refundedAt: timestamp('refunded_at'),
  // Set when the buyer arrived through a tracked post or affiliate link, so a sale can
  // be attributed to the content that brought it — never guessed from a click alone.
  refCode: text('ref_code'),
  deliveryCount: integer('delivery_count').notNull().default(0),
  dataSource: text('data_source').notNull().default('live'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdateFn(() => new Date()),
})

// ── Engine 1: AI digital services ─────────────────────────────────────────
export const services = pgTable('service', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  summary: text('summary').notNull(),
  detail: text('detail').notNull(),
  category: text('category').notNull().default('website'),
  priceFromIdr: bigint('price_from_idr', { mode: 'number' }).notNull().default(0),
  deliveryDays: integer('delivery_days').notNull().default(7),
  status: text('status').notNull().default('draft'),
  dataSource: text('data_source').notNull().default('live'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const serviceRequests = pgTable('service_request', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  code: text('code').notNull().unique(),
  serviceId: text('service_id'),
  serviceName: text('service_name').notNull(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  company: text('company'),
  market: text('market').notNull().default('Indonesia'),
  brief: text('brief').notNull(),
  budgetIdr: bigint('budget_idr', { mode: 'number' }),
  status: text('status').notNull().default('new'),
  proposalBody: text('proposal_body'),
  proposalAmountIdr: bigint('proposal_amount_idr', { mode: 'number' }),
  proposalSource: text('proposal_source'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdateFn(() => new Date()),
})

// ── Engine 3: affiliate marketing ─────────────────────────────────────────
// Clicks and conversions are events this app observes itself. A commission row is
// only ever written from a figure the owner copies out of the affiliate network's
// own report — nothing here estimates what someone "should" have earned.
export const affiliatePrograms = pgTable('affiliate_program', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  network: text('network').notNull(),
  signupUrl: text('signup_url').notNull(),
  commissionNote: text('commission_note').notNull(),
  commissionRate: text('commission_rate'),
  market: text('market').notNull().default('International'),
  status: text('status').notNull().default('candidate'),
  dataSource: text('data_source').notNull().default('live'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const affiliateLinks = pgTable('affiliate_link', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  programId: text('program_id').notNull(),
  slug: text('slug').notNull().unique(),
  label: text('label').notNull(),
  destinationUrl: text('destination_url').notNull(),
  channel: text('channel').notNull().default('konten'),
  clicks: integer('clicks').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const affiliateCommissions = pgTable('affiliate_commission', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  programId: text('program_id').notNull(),
  linkId: text('link_id'),
  amountIdr: bigint('amount_idr', { mode: 'number' }).notNull(),
  periodLabel: text('period_label').notNull(),
  status: text('status').notNull().default('reported'),
  note: text('note'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ── Engine 4: SaaS subscriptions ──────────────────────────────────────────
export const plans = pgTable('plan', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  summary: text('summary').notNull(),
  features: text('features').notNull(),
  priceIdr: bigint('price_idr', { mode: 'number' }).notNull(),
  interval: text('interval').notNull().default('month'),
  // A plan can be a SaaS tier or a retainer on one of the owner's digital services.
  serviceId: text('service_id'),
  status: text('status').notNull().default('draft'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const subscriptions = pgTable('subscription', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  accessToken: text('access_token').notNull().unique(),
  planId: text('plan_id').notNull(),
  planName: text('plan_name').notNull(),
  accountEmail: text('account_email').notNull(),
  accountName: text('account_name').notNull(),
  amountIdr: bigint('amount_idr', { mode: 'number' }).notNull(),
  status: text('status').notNull().default('pending'),
  interval: text('interval').notNull().default('month'),
  invoiceId: text('invoice_id'),
  invoiceUrl: text('invoice_url'),
  paidAt: timestamp('paid_at'),
  periodEnd: timestamp('period_end'),
  // A renewal is only ever invoiced while this is true, and it is only true because
  // the subscriber ticked the consent box themselves (`autoRenewAt` is the record).
  autoRenew: boolean('auto_renew').notNull().default(false),
  autoRenewAt: timestamp('auto_renew_at'),
  cancelledAt: timestamp('cancelled_at'),
  cancelReason: text('cancel_reason'),
  label: text('label'),
  dataSource: text('data_source').notNull().default('live'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdateFn(() => new Date()),
})

// ── Recurring billing ─────────────────────────────────────────────────────
// One row per billing period. A period is `scheduled` until a reminder goes out,
// `invoiced` once the provider issued an invoice for it, and `paid` only when the
// verified webhook confirms it — the single place recurring revenue is booked.
export const billingCycles = pgTable('billing_cycle', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  subscriptionId: text('subscription_id').notNull(),
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  dueAt: timestamp('due_at').notNull(),
  amountIdr: bigint('amount_idr', { mode: 'number' }).notNull(),
  status: text('status').notNull().default('scheduled'),
  invoiceId: text('invoice_id'),
  invoiceUrl: text('invoice_url'),
  reminderStage: integer('reminder_stage').notNull().default(0),
  reminderAt: timestamp('reminder_at'),
  paidAt: timestamp('paid_at'),
  note: text('note'),
  dataSource: text('data_source').notNull().default('live'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const emailMessages = pgTable('email_message', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  toEmail: text('to_email').notNull(),
  kind: text('kind').notNull(),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  status: text('status').notNull().default('queued'),
  detail: text('detail'),
  relatedType: text('related_type'),
  relatedId: text('related_id'),
  dataSource: text('data_source').notNull().default('live'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const billingRequests = pgTable('billing_request', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  kind: text('kind').notNull(),
  subscriptionId: text('subscription_id'),
  cycleId: text('cycle_id'),
  email: text('email').notNull(),
  reason: text('reason').notNull(),
  amountIdr: bigint('amount_idr', { mode: 'number' }),
  status: text('status').notNull().default('pending'),
  proposalId: text('proposal_id'),
  decisionNote: text('decision_note'),
  decidedAt: timestamp('decided_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ── Agents, autopilot and research output ─────────────────────────────────
export const agentRuns = pgTable('agent_run', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  agentId: text('agent_id'),
  agentName: text('agent_name').notNull(),
  task: text('task').notNull(),
  trigger: text('trigger').notNull().default('owner'),
  status: text('status').notNull().default('running'),
  summary: text('summary'),
  detail: text('detail'),
  itemsCreated: integer('items_created').notNull().default(0),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  finishedAt: timestamp('finished_at'),
})

export const marketSignals = pgTable('market_signal', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  market: text('market').notNull(),
  evidence: text('evidence').notNull(),
  metric: text('metric').notNull(),
  confidence: text('confidence').notNull().default('measured'),
  dataSource: text('data_source').notNull().default('live'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ── Social content studio ─────────────────────────────────────────────────
// A post is authored here, approved by the owner, and only later published. Nothing in
// this table is ever called published without a provider confirming it, which is why
// `publishState` starts at `not_connected` and stays there until a channel API accepts
// the post and returns an id.
export const socialPosts = pgTable('social_post', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  channel: text('channel').notNull(),
  market: text('market').notNull().default('Indonesia'),
  body: text('body').notNull(),
  headline: text('headline').notNull(),
  sourceType: text('source_type').notNull().default('general'),
  sourceId: text('source_id'),
  sourceName: text('source_name'),
  source: text('source').notNull().default('template'),
  status: text('status').notNull().default('draft'),
  publishState: text('publish_state').notNull().default('not_connected'),
  publishNote: text('publish_note'),
  externalId: text('external_id'),
  externalUrl: text('external_url'),
  // Photo or video attached by the owner, stored privately; a fresh link is signed per use.
  mediaKey: text('media_key'),
  mediaType: text('media_type'),
  publishedAt: timestamp('published_at'),
  scheduledAt: timestamp('scheduled_at'),
  approvedAt: timestamp('approved_at'),
  decisionNote: text('decision_note'),
  dataSource: text('data_source').notNull().default('live'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdateFn(() => new Date()),
})

// ── Connected social accounts ─────────────────────────────────────────────
// A page token is never sent to the browser and never stored in plain text: it is
// sealed with AES-256-GCM under a key derived from the app's own session secret.
export const socialAccounts = pgTable('social_account', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  channel: text('channel').notNull(),
  externalId: text('external_id').notNull(),
  // An Instagram business account always hangs from one Facebook Page; this is that page.
  parentId: text('parent_id'),
  name: text('name').notNull(),
  tokenSealed: text('token_sealed').notNull(),
  tokenExpiresAt: timestamp('token_expires_at'),
  scopes: text('scopes'),
  status: text('status').notNull().default('connected'),
  lastCheckedAt: timestamp('last_checked_at'),
  lastError: text('last_error'),
  connectedAt: timestamp('connected_at').notNull().defaultNow(),
})

// ── Post tracking ─────────────────────────────────────────────────────────
// One link per published post. A click is a click — nothing here estimates reach.
export const postTracks = pgTable('post_track', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  postId: text('post_id').notNull(),
  code: text('code').notNull().unique(),
  destination: text('destination').notNull(),
  clicks: integer('clicks').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const campaignDrafts = pgTable('campaign_draft', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  channel: text('channel').notNull(),
  audience: text('audience').notNull(),
  body: text('body').notNull(),
  status: text('status').notNull().default('draft'),
  source: text('source').notNull().default('template'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Member wallet: balances are derived from ledger entries and paid withdrawals.
export const memberAccounts = pgTable('member_account', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  referralCode: text('referral_code').notNull().unique(),
  referredBy: text('referred_by'),
  phone: text('phone'),
  bankName: text('bank_name'),
  bankAccountName: text('bank_account_name'),
  bankAccountNumber: text('bank_account_number'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdateFn(() => new Date()),
})

export const memberCommissions = pgTable('member_commission', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  memberId: text('member_id').notNull(),
  sourceType: text('source_type').notNull(), // referral | sale | task | adjustment
  sourceRef: text('source_ref'),
  description: text('description').notNull(),
  amountIdr: bigint('amount_idr', { mode: 'number' }).notNull(),
  status: text('status').notNull().default('approved'), // pending | approved | reversed
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const memberWithdrawals = pgTable('member_withdrawal', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  memberId: text('member_id').notNull(),
  amountIdr: bigint('amount_idr', { mode: 'number' }).notNull(),
  bankName: text('bank_name').notNull(),
  bankAccountName: text('bank_account_name').notNull(),
  bankAccountNumber: text('bank_account_number').notNull(),
  status: text('status').notNull().default('pending'), // pending | approved | paid | rejected
  adminNote: text('admin_note'),
  decidedAt: timestamp('decided_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const contactMessages = pgTable('contact_message', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  email: text('email').notNull(),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  status: text('status').notNull().default('new'), // new | answered
  ownerNote: text('owner_note'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const customerAccounts = pgTable('customer_account', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  emailVerifiedAt: timestamp('email_verified_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

/** One-off links: e-mail verification and password reset. Only the hash is stored. */
export const customerTokens = pgTable('customer_token', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: text('customer_id').notNull(),
  kind: text('kind').notNull(), // verify | reset
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ── AI chat ───────────────────────────────────────────────────────────────
// One row per turn in the owner's chat with the model. A failed call keeps the
// question and stores no answer, so the transcript never shows invented replies.
export const aiChatMessages = pgTable('ai_chat_message', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  role: text('role').notNull(), // user | assistant
  content: text('content').notNull(),
  model: text('model'),
  ownerEmail: text('owner_email').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})


// ── AI cost ledger and owner money allocation ─────────────────────────────
export const aiUsageEvents = pgTable('ai_usage_event', {
  id: text('id').primaryKey(),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  agentName: text('agent_name'),
  task: text('task'),
  inputTokens: bigint('input_tokens', { mode: 'number' }).notNull().default(0),
  outputTokens: bigint('output_tokens', { mode: 'number' }).notNull().default(0),
  totalTokens: bigint('total_tokens', { mode: 'number' }).notNull().default(0),
  estimatedCostIdr: bigint('estimated_cost_idr', { mode: 'number' }),
  costCurrency: text('cost_currency').notNull().default('IDR'),
  costSource: text('cost_source').notNull().default('unpriced'),
  requestStatus: text('request_status').notNull(),
  occurredAt: timestamp('occurred_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('ai_usage_event_occurred_at_idx').on(table.occurredAt),
  index('ai_usage_event_provider_idx').on(table.provider, table.occurredAt),
])

export const aiProviderPayments = pgTable('ai_provider_payment', {
  id: text('id').primaryKey(),
  provider: text('provider').notNull(),
  paymentMethod: text('payment_method').notNull(),
  amountIdr: bigint('amount_idr', { mode: 'number' }).notNull(),
  status: text('status').notNull().default('pending'),
  externalInvoiceId: text('external_invoice_id'),
  externalPaymentId: text('external_payment_id'),
  receiptUrl: text('receipt_url'),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const moneyAllocationPolicy = pgTable('money_allocation_policy', {
  id: text('id').primaryKey(),
  ownerPercent: integer('owner_percent').notNull().default(70),
  operationsPercent: integer('operations_percent').notNull().default(20),
  reservePercent: integer('reserve_percent').notNull().default(10),
  autoPayEnabled: boolean('auto_pay_enabled').notNull().default(false),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  check('money_allocation_policy_total_100', sql`${table.ownerPercent} + ${table.operationsPercent} + ${table.reservePercent} = 100`),
  check('money_allocation_policy_nonnegative', sql`${table.ownerPercent} >= 0 AND ${table.operationsPercent} >= 0 AND ${table.reservePercent} >= 0`),
])

export const talentApplications = pgTable('talent_application', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  email: text('email').notNull(),
  role: text('role').notNull(),
  portfolio: text('portfolio'),
  experience: text('experience').notNull(),
  message: text('message').notNull(),
  status: text('status').notNull().default('new'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdateFn(() => new Date()),
})
