import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { RouteFade } from './components/RouteFade'
import { CampaignsProvider } from './context/CampaignsContext'
import { LeadsProvider } from './context/LeadsContext'
import { CrmProvider } from './context/CrmContext'
import { InboxProvider } from './context/InboxContext'
import { MoneyProvider } from './context/MoneyContext'
import { DiscoverProvider } from './context/DiscoverContext'
import { TemplatesProvider } from './context/TemplatesContext'
import { ContentProvider } from './context/ContentContext'
import { FreyaActivityProvider } from './context/FreyaActivityContext'
import { AppLayout } from './components/AppLayout'
import { TierGate } from './components/TierGate'
import { LoginPage } from './pages/LoginPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { CommandCentrePage } from './pages/CommandCentrePage'
import { ContentPage } from './pages/ContentPage'
import { CampaignsPage } from './pages/CampaignsPage'
import { CampaignDetailPage } from './pages/CampaignDetailPage'
import { LeadsPage } from './pages/LeadsPage'
import { PipelinePage } from './pages/PipelinePage'
import { InboxPage } from './pages/InboxPage'
import { MoneyPage } from './pages/MoneyPage'
import { DiscoverPage } from './pages/DiscoverPage'
import { TemplatesPage } from './pages/TemplatesPage'
import { TeamPage } from './pages/TeamPage'
import { ProfilePage } from './pages/ProfilePage'
import { SettingsPage } from './pages/SettingsPage'
import type { ReactNode } from 'react'

function RequireAuth({ children, needOnboarded }: { children: ReactNode; needOnboarded?: boolean }) {
  const { profile, onboarded } = useApp()
  if (!profile) return <Navigate to="/" replace />
  if (needOnboarded && !onboarded) return <Navigate to="/onboarding" replace />
  return children
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { profile, onboarded } = useApp()
  if (profile && onboarded) return <Navigate to="/app" replace />
  if (profile && !onboarded) return <Navigate to="/onboarding" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        }
      />
      <Route
        path="/onboarding"
        element={
          <RequireAuth>
            <OnboardingPage />
          </RequireAuth>
        }
      />
      <Route
        path="/app"
        element={
          <RequireAuth needOnboarded>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<TierGate><CommandCentrePage /></TierGate>} />
        <Route path="content" element={<TierGate><ContentPage /></TierGate>} />
        <Route path="campaigns" element={<TierGate><CampaignsPage /></TierGate>} />
        <Route path="campaigns/:id" element={<TierGate><CampaignDetailPage /></TierGate>} />
        <Route path="leads" element={<TierGate><LeadsPage /></TierGate>} />
        <Route path="pipeline" element={<TierGate><PipelinePage /></TierGate>} />
        <Route path="inbox" element={<TierGate><InboxPage /></TierGate>} />
        <Route path="money" element={<TierGate><MoneyPage /></TierGate>} />
        <Route path="discover" element={<TierGate><DiscoverPage /></TierGate>} />
        <Route path="templates" element={<TierGate><TemplatesPage /></TierGate>} />
        <Route path="team" element={<TierGate><TeamPage /></TierGate>} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
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
                        <BrowserRouter>
                          <RouteFade>
                            <AppRoutes />
                          </RouteFade>
                        </BrowserRouter>
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
  )
}
