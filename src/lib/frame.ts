import type { NextPage } from 'next'
import type { ReactElement, ReactNode } from 'react'

export type PageWithFrame<Props = object> = NextPage<Props> & {
  getLayout?: (page: ReactElement, props: Props) => ReactNode
}
