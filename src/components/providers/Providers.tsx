'use client'

import { Suspense, useEffect, useState, type ReactNode } from 'react'
import { AppProvider } from '@/context/AppContext'
import { CampaignsProvider } from '@/context/CampaignsContext'
import { LeadsProvider } from '@/context/LeadsContext'
import { CrmProvider } from '@/context/CrmContext'
import { InboxProvider } from '@/context/InboxContext'
import { MoneyProvider } from '@/context/MoneyContext'
import { DiscoverProvider } from '@/context/DiscoverContext'
import { TemplatesProvider } from '@/context/TemplatesContext'
import { ContentProvider } from '@/context/ContentContext'
import { FreyaActivityProvider } from '@/context/FreyaActivityContext'
import { BackendModeProvider } from '@/lib/backend/BackendModeContext'
import { RouteFade } from '@/components/RouteFade'

function Tree({ children }: { children: ReactNode }) {
  return (
    <BackendModeProvider>
      <AppProvider>
        <CampaignsProvider>
          <LeadsProvider>
            <CrmProvider>
              <InboxProvider>
                <MoneyProvider>
                  <DiscoverProvider>
                    <TemplatesProvider>
                      <ContentProvider>
                        <FreyaActivityProvider>
                          <Suspense fallback={null}>
                            <RouteFade>{children}</RouteFade>
                          </Suspense>
                        </FreyaActivityProvider>
                      </ContentProvider>
                    </TemplatesProvider>
                  </DiscoverProvider>
                </MoneyProvider>
              </InboxProvider>
            </CrmProvider>
          </LeadsProvider>
        </CampaignsProvider>
      </AppProvider>
    </BackendModeProvider>
  )
}

/** Mount domain providers only on the client (demo localStorage or live APIs). */
export function Providers({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])
  if (!ready) {
    return <div className="min-h-screen bg-page" aria-busy="true" />
  }
  return <Tree>{children}</Tree>
}
