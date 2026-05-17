import Link from 'next/link'

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border-subtle pt-6 pb-2">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-fg-muted mb-3">{heading}</h2>
      <div className="space-y-2 text-sm text-fg-secondary leading-relaxed">{children}</div>
    </section>
  )
}

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto pb-16 pt-4">
      <Link
        href="/"
        className="text-xs font-semibold uppercase tracking-wider text-fg-muted hover:text-fg-primary transition-colors"
      >
        ← Home
      </Link>

      <div className="mt-6 mb-8">
        <h1 className="text-5xl font-display tracking-wide uppercase text-accent mb-2">
          Privacy Policy
        </h1>
        <p className="text-fg-muted text-sm">Last updated: May 2026</p>
      </div>

      <div className="space-y-6">

        <Section heading="About this app">
          <p>
            FIFA World Cup 2026 Predictions is a free, non-commercial prediction game made for
            personal entertainment. This app is not affiliated with or endorsed by FIFA.
          </p>
        </Section>

        <Section heading="Who is responsible for your data">
          <p>
            This app is operated by Alex Kekkonen. For any privacy questions, contact:{' '}
            <a
              href="mailto:alexkekkonen67@gmail.com"
              className="text-accent hover:underline"
            >
              alexkekkonen67@gmail.com
            </a>
          </p>
        </Section>

        <Section heading="What data we collect">
          <ul className="space-y-1.5 pl-1">
            {[
              ['Your email address', 'required to create an account and receive sign-in links'],
              ['Your username', 'chosen by you during account setup'],
              ['Your predictions', 'group stage scores, knockout bracket picks, and award picks you submit'],
              ['League memberships', 'which leagues you belong to'],
              ['Session data', 'authentication tokens stored in cookies to keep you logged in'],
            ].map(([label, desc]) => (
              <li key={label} className="flex gap-2">
                <span className="text-accent shrink-0 mt-0.5">—</span>
                <span>
                  <span className="text-fg-primary font-medium">{label}</span>
                  {' — '}{desc}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-fg-muted text-xs">
            We do not collect payment information, location data, or any sensitive personal data.
          </p>
        </Section>

        <Section heading="Why we collect it">
          <p>
            We process your data to provide the prediction game service you signed up for. The
            legal basis under GDPR is the performance of a contract (providing the service) and
            your consent at the point of registration.
          </p>
        </Section>

        <Section heading="Third-party services">
          <p>Your data is processed by the following sub-processors:</p>
          <ul className="space-y-1.5 pl-1 mt-2">
            {[
              ['Supabase Inc.', 'database and authentication hosting', 'https://supabase.com/privacy'],
              ['Vercel Inc.', 'application hosting and infrastructure', 'https://vercel.com/legal/privacy-policy'],
              ['Resend Inc.', 'email delivery for sign-in links', 'https://resend.com/legal/privacy-policy'],
            ].map(([name, role, url]) => (
              <li key={name} className="flex gap-2">
                <span className="text-accent shrink-0 mt-0.5">—</span>
                <span>
                  <a href={url} className="text-fg-primary font-medium hover:text-accent transition-colors" target="_blank" rel="noopener noreferrer">
                    {name}
                  </a>
                  {' — '}{role}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3">
            These services may process your data in the United States. Where required, appropriate
            safeguards such as standard contractual clauses apply.
          </p>
        </Section>

        <Section heading="Data retention">
          <p>
            Your data is stored for as long as your account is active. You can request account
            and data deletion at any time by contacting{' '}
            <a href="mailto:alexkekkonen67@gmail.com" className="text-accent hover:underline">
              alexkekkonen67@gmail.com
            </a>
            .
          </p>
        </Section>

        <Section heading="Your rights under GDPR">
          <p>
            As a resident of the EU or EEA, you have the right to access, correct, or delete
            your personal data, to object to processing, and to data portability. To exercise
            any of these rights, contact{' '}
            <a href="mailto:alexkekkonen67@gmail.com" className="text-accent hover:underline">
              alexkekkonen67@gmail.com
            </a>
            .
          </p>
        </Section>

        <Section heading="Cookies">
          <p>
            We use cookies only for authentication and session management. We do not use
            advertising, tracking, or analytics cookies.
          </p>
        </Section>

        <Section heading="Changes to this policy">
          <p>
            We may update this policy occasionally. Continued use of the app after an update
            means you accept the revised policy.
          </p>
        </Section>

      </div>
    </div>
  )
}
