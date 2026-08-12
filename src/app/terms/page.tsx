import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/Logo'

export const metadata: Metadata = {
  title: 'Terms of Service · AntariousAI',
  description:
    'Terms for using Antarious and Freya — your AI teammate for posts, messages, and money.',
}

const LAST_UPDATED = '7 August 2026'

const SECTIONS: { id: string; title: string; body: ReactNode }[] = [
  {
    id: 'agreement',
    title: 'Agreement',
    body: (
      <>
        <p>
          These Terms of Service (“Terms”) govern your access to and use of{' '}
          <strong>Antarious</strong> and Freya at{' '}
          <a href="https://app.antarious.com">app.antarious.com</a> (the “Service”),
          operated by Antarious (“we”, “us”, “our”).
        </p>
        <p>
          By creating an account, inviting teammates, or using the Service, you agree to
          these Terms. If you are using the Service on behalf of a business, you confirm
          you have authority to bind that business to these Terms.
        </p>
      </>
    ),
  },
  {
    id: 'service',
    title: 'The Service',
    body: (
      <>
        <p>
          Antarious is a workspace for small businesses. Freya is an AI teammate inside
          Antarious that helps with posts, messages, campaigns, interested people,
          customers, and money. Freya drafts; you approve when something leaves your
          business.
        </p>
        <p>
          We may update, improve, or discontinue features over time. We will try to avoid
          disrupting your workspace, but we do not guarantee that any particular feature
          will remain available forever.
        </p>
      </>
    ),
  },
  {
    id: 'accounts',
    title: 'Accounts and teams',
    body: (
      <>
        <p>You are responsible for:</p>
        <ul>
          <li>Providing accurate account and business information</li>
          <li>Keeping login credentials secure and confidential</li>
          <li>Activity that occurs under your account or organization</li>
          <li>
            Ensuring teammates you invite use the Service in line with these Terms
          </li>
        </ul>
        <p>
          Notify us promptly if you suspect unauthorized access. We may suspend accounts
          that appear compromised or that abuse the Service.
        </p>
      </>
    ),
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable use',
    body: (
      <>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service for unlawful, harmful, or deceptive purposes</li>
          <li>
            Upload or generate content that infringes others’ rights, or that is
            fraudulent, abusive, or malicious
          </li>
          <li>
            Attempt to probe, disrupt, or reverse engineer the Service except as allowed
            by law
          </li>
          <li>
            Resell, scrape, or misuse Freya or the Service in ways that harm Antarious,
            our providers, or other users
          </li>
          <li>Bypass usage limits, billing, or access controls</li>
        </ul>
      </>
    ),
  },
  {
    id: 'content',
    title: 'Your content',
    body: (
      <>
        <p>
          You retain ownership of the business data and content you put into Antarious
          (posts, messages, leads, invoices, Freya prompts, and similar “Customer
          Content”).
        </p>
        <p>
          You grant us a limited license to host, process, and display Customer Content
          solely to provide and improve the Service for you — including sending relevant
          context to AI providers so Freya can respond.
        </p>
        <p>
          You represent that you have the rights needed to use Customer Content in the
          Service, and that publishing or sending it (after your approval) complies with
          platform rules and applicable law.
        </p>
      </>
    ),
  },
  {
    id: 'freya',
    title: 'Freya and AI outputs',
    body: (
      <>
        <p>
          Freya can draft text, suggestions, and other outputs. AI results may be
          incomplete, incorrect, or unsuitable for your situation. You must review
          Freya’s drafts before publishing, sending, or relying on them for business
          decisions.
        </p>
        <p>
          Freya is not a lawyer, accountant, or regulated advisor. Outputs are not legal,
          tax, or financial advice. You remain responsible for final content and actions
          taken in your business.
        </p>
      </>
    ),
  },
  {
    id: 'plans',
    title: 'Plans, credits, and payment',
    body: (
      <>
        <p>
          Some features may require a paid plan, seats, or AI credits. Fees, allowances,
          and limits are described in the product (for example in Settings). Unless we
          say otherwise, fees are non-refundable once a billing period has started.
        </p>
        <p>
          We may change pricing or plan terms with notice where required. Continued use
          after a change takes effect means you accept the new terms for future periods.
        </p>
      </>
    ),
  },
  {
    id: 'third-parties',
    title: 'Third-party services',
    body: (
      <>
        <p>
          The Service relies on providers such as hosting, authentication/database
          (Supabase), AI (OpenAI or related routing), and email delivery. If you connect
          social or messaging channels, those platforms’ terms also apply.
        </p>
        <p>
          We are not responsible for outages, policy changes, or actions by third-party
          platforms outside our reasonable control.
        </p>
      </>
    ),
  },
  {
    id: 'privacy',
    title: 'Privacy',
    body: (
      <>
        <p>
          How we handle personal and business information is described in our{' '}
          <Link href="/privacy">Privacy Policy</Link>. By using the Service, you also
          acknowledge that policy.
        </p>
      </>
    ),
  },
  {
    id: 'availability',
    title: 'Availability and support',
    body: (
      <>
        <p>
          We aim to keep Antarious reliable, but the Service is provided “as is” and “as
          available.” We do not warrant uninterrupted or error-free operation, or that
          Freya will meet every expectation.
        </p>
      </>
    ),
  },
  {
    id: 'liability',
    title: 'Limitation of liability',
    body: (
      <>
        <p>
          To the fullest extent permitted by law, Antarious and its suppliers are not
          liable for indirect, incidental, special, consequential, or lost-profit damages,
          or for loss of data, goodwill, or business opportunity, arising from your use of
          the Service or Freya outputs.
        </p>
        <p>
          Our total liability for claims relating to the Service is limited to the amounts
          you paid us for the Service in the three months before the claim (or, if you
          use a free plan, zero).
        </p>
      </>
    ),
  },
  {
    id: 'indemnity',
    title: 'Indemnity',
    body: (
      <>
        <p>
          You agree to defend and indemnify Antarious against claims arising from your
          Customer Content, your use of the Service, or your breach of these Terms,
          except to the extent caused by our willful misconduct.
        </p>
      </>
    ),
  },
  {
    id: 'termination',
    title: 'Suspension and termination',
    body: (
      <>
        <p>
          You may stop using the Service at any time. We may suspend or terminate access
          if you violate these Terms, if required by law, or if we discontinue the
          Service. Upon termination, your right to use the Service ends; provisions that
          should survive (including ownership, liability limits, and indemnity) will
          survive.
        </p>
      </>
    ),
  },
  {
    id: 'law',
    title: 'Governing law',
    body: (
      <>
        <p>
          These Terms are governed by the laws of Bangladesh, without regard to conflict
          of law rules. Courts in Bangladesh have exclusive jurisdiction, unless
          mandatory consumer protections in your country say otherwise.
        </p>
      </>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to these Terms',
    body: (
      <>
        <p>
          We may update these Terms from time to time. We will post the revised version
          on this page and update the “Last updated” date. Continued use of the Service
          after changes means you accept the updated Terms.
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
          Questions about these Terms:{' '}
          <a href="mailto:request@antarious.com">request@antarious.com</a>
          {' '}
          or visit{' '}
          <a href="https://app.antarious.com">app.antarious.com</a>.
        </p>
      </>
    ),
  },
]

export default function TermsPage() {
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
            Terms of <span className="login-accent">service</span>
          </h1>
          <p className="legal-page-lede">
            The rules for using Antarious and Freya when you run your business with us.
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
            <Link href="/data-deletion">Data deletion</Link>
          </p>
        </footer>
      </div>
    </div>
  )
}
