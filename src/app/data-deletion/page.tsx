import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/Logo'

export const metadata: Metadata = {
  title: 'User Data Deletion · AntariousAI',
  description:
    'How to request deletion of your Antarious account and associated user data.',
}

const LAST_UPDATED = '7 August 2026'
const DELETION_EMAIL = 'request@antarious.com'

const SECTIONS: { id: string; title: string; body: ReactNode }[] = [
  {
    id: 'overview',
    title: 'Overview',
    body: (
      <>
        <p>
          This page explains how to request deletion of your user data from{' '}
          <strong>Antarious</strong> and Freya at{' '}
          <a href="https://app.antarious.com">app.antarious.com</a>.
        </p>
        <p>
          We process deletion requests for account holders and, where applicable, for
          personal data that appears in a workspace you control. For how we handle data
          day to day, see our <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </>
    ),
  },
  {
    id: 'how-to-request',
    title: 'How to request deletion',
    body: (
      <>
        <p>To request deletion of your Antarious user data:</p>
        <ol>
          <li>
            Email us at{' '}
            <a href={`mailto:${DELETION_EMAIL}?subject=${encodeURIComponent('User data deletion request')}`}>
              {DELETION_EMAIL}
            </a>{' '}
            from the same email address registered on your Antarious account.
          </li>
          <li>
            Use the subject line <strong>User data deletion request</strong>.
          </li>
          <li>
            Include your full name, account email, and (if you know it) your business /
            workspace name.
          </li>
          <li>
            Tell us whether you want to delete only your user account, or the entire
            organization workspace you own (see below).
          </li>
        </ol>
        <p>
          We may ask you to confirm the request before we proceed, so we do not delete
          the wrong account.
        </p>
      </>
    ),
  },
  {
    id: 'what-we-delete',
    title: 'What we delete',
    body: (
      <>
        <p>When a deletion request is confirmed, we remove or irreversibly anonymize:</p>
        <ul>
          <li>
            <strong>Your account</strong> — profile details, login identity, and access to
            the Service
          </li>
          <li>
            <strong>Organization membership</strong> — your seat on workspaces you joined
          </li>
          <li>
            <strong>Owner-requested workspace data</strong> — if you are the owner and ask
            us to delete the whole organization: business profile, posts, messages,
            campaigns, leads, customers, money records, Freya chat history, media, and
            related workspace content we store
          </li>
        </ul>
        <p>
          If you are a teammate (not the owner), deleting your account removes your
          access and personal account data. Content you created inside a shared workspace
          may remain available to that organization unless the owner also requests
          workspace deletion.
        </p>
      </>
    ),
  },
  {
    id: 'what-we-may-retain',
    title: 'What we may retain',
    body: (
      <>
        <p>We may keep limited information when required or permitted, for example:</p>
        <ul>
          <li>Records needed for legal, tax, fraud-prevention, or dispute purposes</li>
          <li>Aggregated analytics that no longer identify you</li>
          <li>
            Backups that roll off on a normal schedule after the live deletion is
            completed
          </li>
        </ul>
        <p>
          Transactional email logs held by our email provider may also persist for a
          short period under that provider’s retention rules.
        </p>
      </>
    ),
  },
  {
    id: 'connected-platforms',
    title: 'Connected platforms',
    body: (
      <>
        <p>
          If you connected social or messaging channels (for example Meta products) to
          Antarious, deleting your Antarious data does not automatically delete content
          that already exists on those platforms. Remove or disconnect those connections
          in Antarious Settings where available, and manage data directly with each
          platform as needed.
        </p>
        <p>
          Platform partners and app reviewers can use this page as Antarious’s user data
          deletion instructions URL:{' '}
          <a href="https://app.antarious.com/data-deletion">
            https://app.antarious.com/data-deletion
          </a>
          .
        </p>
      </>
    ),
  },
  {
    id: 'timeline',
    title: 'Timeline',
    body: (
      <>
        <p>
          We aim to acknowledge deletion requests within <strong>7 days</strong> and to
          complete deletion within <strong>30 days</strong> of verifying the request,
          unless a longer period is required by law or technical constraints (for
          example backup rotation).
        </p>
      </>
    ),
  },
  {
    id: 'self-serve',
    title: 'What you can delete in the app',
    body: (
      <>
        <p>
          While signed in, owners and editors can already remove much of their workspace
          content (for example posts, leads, contacts, and other records) from the
          product itself. Account-wide deletion is handled through the email request
          process above so we can verify identity and remove backend data safely.
        </p>
      </>
    ),
  },
  {
    id: 'contact',
    title: 'Contact',
    body: (
      <>
        <p>
          Data deletion and privacy questions:{' '}
          <a href={`mailto:${DELETION_EMAIL}`}>{DELETION_EMAIL}</a>
          {' '}
          or visit{' '}
          <a href="https://app.antarious.com">app.antarious.com</a>.
        </p>
        <p>
          Related:{' '}
          <Link href="/privacy">Privacy Policy</Link>
          {' · '}
          <Link href="/terms">Terms of Service</Link>
        </p>
      </>
    ),
  },
]

export default function DataDeletionPage() {
  return (
    <div className="legal-page">
      <div className="legal-page-inner">
        <header className="legal-page-header">
          <Link href="/" className="legal-page-brand" aria-label="Antarious home">
            <Logo size={40} />
          </Link>
          <Link href="/?mode=login" className="legal-page-back">
            Back to log in
          </Link>
        </header>

        <article className="legal-page-article">
          <p className="legal-page-eyebrow">Legal</p>
          <h1 className="legal-page-title">
            User data <span className="login-accent">deletion</span>
          </h1>
          <p className="legal-page-lede">
            How to request deletion of your Antarious account and associated user data.
          </p>
          <p className="legal-page-updated">Last updated {LAST_UPDATED}</p>

          <nav className="legal-page-toc" aria-label="On this page">
            <ol>
              {SECTIONS.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`}>{section.title}</a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="legal-page-body">
            {SECTIONS.map((section) => (
              <section key={section.id} id={section.id} className="legal-page-section">
                <h2>{section.title}</h2>
                {section.body}
              </section>
            ))}
          </div>
        </article>

        <footer className="legal-page-footer">
          <p>
            © {new Date().getFullYear()} Antarious · app.antarious.com ·{' '}
            <Link href="/privacy">Privacy</Link>
            {' · '}
            <Link href="/terms">Terms</Link>
          </p>
        </footer>
      </div>
    </div>
  )
}
