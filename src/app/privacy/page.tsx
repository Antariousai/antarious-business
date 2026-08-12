import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/Logo'

export const metadata: Metadata = {
  title: 'Privacy Policy · AntariousAI',
  description:
    'How Antarious and Freya collect, use, and protect information for small businesses.',
}

const LAST_UPDATED = '7 August 2026'

const SECTIONS: { id: string; title: string; body: ReactNode }[] = [
  {
    id: 'who',
    title: 'Who we are',
    body: (
      <>
        <p>
          This Privacy Policy explains how <strong>Antarious</strong> (“we”, “us”, “our”)
          handles information when you use Freya and the Antarious workspace at{' '}
          <a href="https://app.antarious.com">app.antarious.com</a> (the “Service”).
        </p>
        <p>
          Freya is an AI teammate inside Antarious that helps small businesses with posts,
          messages, campaigns, interested people, customers, and money. Freya drafts; you
          approve when something leaves your business.
        </p>
      </>
    ),
  },
  {
    id: 'collect',
    title: 'Information we collect',
    body: (
      <>
        <p>Depending on how you use the Service, we may process:</p>
        <ul>
          <li>
            <strong>Account details</strong> — name, email address, and password (stored
            securely by our auth provider).
          </li>
          <li>
            <strong>Business profile</strong> — business name, industry, customers you
            serve, goals, connected channels, and preferences you set in Settings.
          </li>
          <li>
            <strong>Workspace content</strong> — information you or your team add about
            posts, messages, campaigns, leads, customers, deals, invoices, bills, and
            related notes or media.
          </li>
          <li>
            <strong>Freya conversations</strong> — prompts and replies in Freya chat so she
            can help inside your workspace.
          </li>
          <li>
            <strong>Team invites</strong> — email addresses you invite to join your
            organization.
          </li>
          <li>
            <strong>Technical data</strong> — session cookies needed to keep you signed in,
            and basic device/browser information used to operate and secure the Service.
          </li>
          <li>
            <strong>On-device preferences</strong> — some settings (for example a remembered
            name or email on the login screen, or local demo data) may be stored in your
            browser’s local storage.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'use',
    title: 'How we use information',
    body: (
      <>
        <p>We use this information to:</p>
        <ul>
          <li>Provide, maintain, and improve the Service</li>
          <li>Authenticate you and protect accounts</li>
          <li>
            Power Freya’s assistance (drafting, summarizing, and organizing workspace
            tasks you request)
          </li>
          <li>Send transactional email such as team invites and password reset links</li>
          <li>Monitor reliability, prevent abuse, and meet legal obligations</li>
        </ul>
        <p>
          We do not sell your personal information. We do not use your workspace content to
          train public AI models for unrelated products.
        </p>
      </>
    ),
  },
  {
    id: 'ai',
    title: 'AI processing',
    body: (
      <>
        <p>
          When you chat with Freya or ask her to draft content, relevant parts of your
          request and workspace context may be sent to our AI providers so Freya can
          respond. That processing is necessary to deliver the Freya features you use.
        </p>
        <p>
          You remain responsible for what you choose to share with Freya and for reviewing
          drafts before they are published or sent on behalf of your business.
        </p>
      </>
    ),
  },
  {
    id: 'processors',
    title: 'Service providers',
    body: (
      <>
        <p>
          We use trusted processors to run the Service. They only process information as
          needed to provide their services to us, including:
        </p>
        <ul>
          <li>
            <strong>Supabase</strong> — authentication, database, and file storage
          </li>
          <li>
            <strong>OpenAI</strong> (and related AI routing) — Freya’s language and
            embedding features
          </li>
          <li>
            <strong>Resend</strong> (or your configured Auth SMTP) — transactional
            email such as signup confirmation, password reset, and team invites
          </li>
          <li>
            <strong>Hosting infrastructure</strong> — to serve the app securely
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies and local storage',
    body: (
      <>
        <p>
          We use essential cookies and similar technologies to keep you signed in and to
          operate the Service. We also store limited preferences in your browser (such as
          a remembered login name or email) to make returning easier. You can clear these
          in your browser settings; clearing them may sign you out or reset local-only
          preferences.
        </p>
      </>
    ),
  },
  {
    id: 'sharing',
    title: 'When we share information',
    body: (
      <>
        <p>We may share information:</p>
        <ul>
          <li>With the processors listed above, under appropriate safeguards</li>
          <li>With team members you invite into your organization</li>
          <li>
            If required by law, regulation, or a valid legal process, or to protect the
            rights, safety, and security of Antarious, our users, or the public
          </li>
          <li>
            In connection with a merger, acquisition, or reorganization, with notice where
            required
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'retention',
    title: 'Retention',
    body: (
      <>
        <p>
          We keep account and workspace data while your organization uses the Service and
          for a reasonable period afterward if needed for backups, dispute resolution,
          security, or legal requirements. You may ask us to delete your account; some
          records may remain where we must retain them by law.
        </p>
      </>
    ),
  },
  {
    id: 'rights',
    title: 'Your choices and rights',
    body: (
      <>
        <p>Depending on where you live, you may have rights to:</p>
        <ul>
          <li>Access or correct personal information we hold about you</li>
          <li>Request deletion of your account or certain data</li>
          <li>Object to or restrict certain processing</li>
          <li>Export information you provided to the Service</li>
        </ul>
        <p>
          You can update much of your profile and workspace content directly in the app.
          To request deletion of your account or user data, follow the steps on our{' '}
          <Link href="/data-deletion">User Data Deletion</Link> page. For other requests,
          contact us using the details below. We may need to verify your identity before
          fulfilling a request.
        </p>
      </>
    ),
  },
  {
    id: 'security',
    title: 'Security',
    body: (
      <>
        <p>
          We use industry-standard measures such as encrypted connections (HTTPS), access
          controls, and provider security practices to protect information. No method of
          transmission or storage is perfectly secure; please use a strong password and
          keep your login details private.
        </p>
      </>
    ),
  },
  {
    id: 'children',
    title: 'Children',
    body: (
      <>
        <p>
          The Service is built for business use and is not directed to children under 16.
          We do not knowingly collect personal information from children.
        </p>
      </>
    ),
  },
  {
    id: 'international',
    title: 'International processing',
    body: (
      <>
        <p>
          Antarious serves businesses in Bangladesh and elsewhere. Your information may be
          processed in countries where our providers operate. Where required, we rely on
          appropriate safeguards for cross-border transfers.
        </p>
      </>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: (
      <>
        <p>
          We may update this Privacy Policy from time to time. We will post the revised
          version on this page and update the “Last updated” date. Continued use of the
          Service after changes means you accept the updated policy.
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
          Questions about privacy or this policy:{' '}
          <a href="mailto:request@antarious.com">request@antarious.com</a>
          {' '}
          or visit{' '}
          <a href="https://app.antarious.com">app.antarious.com</a>.
        </p>
      </>
    ),
  },
]

export default function PrivacyPage() {
  return (
    <div className="legal-page">
      <div className="legal-page-inner">
        <header className="legal-page-header">
          <Link href="/" className="legal-page-brand" aria-label="Antarious home">
            <Logo size={40} />
          </Link>
          <Link href="/login" className="legal-page-back">
            Back to log in
          </Link>
        </header>

        <article className="legal-page-article">
          <p className="legal-page-eyebrow">Legal</p>
          <h1 className="legal-page-title">
            Privacy <span className="login-accent">policy</span>
          </h1>
          <p className="legal-page-lede">
            How Antarious and Freya collect, use, and protect information when you run
            your business with us.
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
            <Link href="/terms">Terms</Link>
            {' · '}
            <Link href="/data-deletion">Data deletion</Link>
          </p>
        </footer>
      </div>
    </div>
  )
}
