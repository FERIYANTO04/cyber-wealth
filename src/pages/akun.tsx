import type { GetServerSideProps } from 'next'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { AccountFrame } from '@/components/AccountFrame'
import { AccountDesk, type AccountOrder, type AccountService, type AccountSubscription } from '@/components/AccountDesk'
import { db, sqlClient } from '@/lib/db'
import { customerAccounts, orders, products, subscriptions } from '@/lib/db/schema'
import { requireCustomerPage } from '@/lib/customer-auth'
import { fileUrl } from '@/lib/storage'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const access = await requireCustomerPage(ctx)
  if ('redirectTo' in access) {
    return { redirect: { destination: access.redirectTo ?? '/masuk', permanent: false } }
  }

  const [account] = await db
    .select()
    .from(customerAccounts)
    .where(eq(customerAccounts.id, access.session.id))
    .limit(1)

  if (!account) return { redirect: { destination: '/masuk', permanent: false } }

  const email = account.email.toLowerCase()

  const orderRows = await db
    .select()
    .from(orders)
    .where(sql`lower(${orders.buyerEmail}) = ${email}`)
    .orderBy(desc(orders.createdAt))
    .limit(50)

  const productRows = orderRows.length
    ? await db
        .select()
        .from(products)
        .where(inArray(products.id, Array.from(new Set(orderRows.map((row) => row.productId)))))
    : []
  const productById = new Map(productRows.map((product) => [product.id, product]))

  const accountOrders: AccountOrder[] = []
  for (const row of orderRows) {
    const product = productById.get(row.productId)
    let downloadUrl: string | null = null
    if (row.status === 'paid') {
      if (product?.fileKey) {
        downloadUrl = await fileUrl(product.fileKey, { download: product.fileName ?? undefined }).catch(() => null)
      } else if (product?.slug === 'panduan-konten-media-sosial') {
        downloadUrl = `/api/orders/download?token=${row.accessToken}`
      }
    }
    accountOrders.push({
      code: row.code,
      productName: row.productName,
      amountIdr: Number(row.amountIdr),
      status: row.status,
      paidAt: row.paidAt ? row.paidAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      invoiceUrl: row.invoiceUrl,
      statusUrl: `/pesanan/${row.accessToken}`,
      downloadUrl,
      deliverableNote: product?.deliverableNote ?? null,
    })
  }

  const subRows = await db
    .select()
    .from(subscriptions)
    .where(and(sql`lower(${subscriptions.accountEmail}) = ${email}`, eq(subscriptions.dataSource, 'live')))
    .orderBy(desc(subscriptions.createdAt))
    .limit(20)

  const serviceRows = await sqlClient`
    SELECT sr.id, sr.code, sr.service_name, sr.status AS request_status,
      sr.created_at, sr.proposal_amount_idr,
      sp.status AS payment_status, sp.invoice_url,
      cp.project_code, cp.status AS project_status, cp.due_at, cp.deliverable_url
    FROM service_request sr
    LEFT JOIN LATERAL (
      SELECT status, invoice_url FROM service_payment
      WHERE service_request_id=sr.id ORDER BY created_at DESC LIMIT 1
    ) sp ON true
    LEFT JOIN creative_project cp ON cp.service_request_id=sr.id
    WHERE lower(sr.email)=${email} AND sr.status <> 'lost'
    ORDER BY sr.created_at DESC LIMIT 50
  `
  const accountServices: AccountService[] = serviceRows.map((row) => ({
    id: row.id,
    code: row.code,
    serviceName: row.service_name,
    requestStatus: row.request_status,
    amountIdr: Number(row.proposal_amount_idr ?? 0),
    paymentStatus: row.payment_status ?? null,
    invoiceUrl: row.invoice_url ?? null,
    projectCode: row.project_code ?? null,
    projectStatus: row.project_status ?? null,
    dueAt: row.due_at ? new Date(row.due_at).toISOString() : null,
    deliverableUrl: row.project_status === 'delivered' ? row.deliverable_url ?? null : null,
    createdAt: new Date(row.created_at).toISOString(),
  }))

  const accountSubscriptions: AccountSubscription[] = subRows.map((row) => ({
    planName: row.planName,
    amountIdr: Number(row.amountIdr),
    interval: row.interval,
    status: row.status,
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
    periodEnd: row.periodEnd ? row.periodEnd.toISOString() : null,
    statusUrl: `/langganan/status/${row.accessToken}`,
  }))

  return {
    props: {
      name: account.name,
      email: account.email,
      orders: accountOrders,
      services: accountServices,
      subscriptions: accountSubscriptions,
    },
  }
}

function AkunPage(props: {
  name: string
  email: string
  orders: AccountOrder[]
  services: AccountService[]
  subscriptions: AccountSubscription[]
}) {
  return <AccountDesk {...props} />
}

const Page = AkunPage as PageWithFrame<{
  name: string
  email: string
  orders: AccountOrder[]
  services: AccountService[]
  subscriptions: AccountSubscription[]
}>
Page.getLayout = (page) => (
  <AccountFrame
    eyebrow="Akun pembeli"
    title="Pesanan dan unduhan Anda"
    intent="Semua pembelian, tautan unduhan, dan langganan Anda dalam satu halaman."
    active="/akun"
  >
    {page}
  </AccountFrame>
)
export default Page
