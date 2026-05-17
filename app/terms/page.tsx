import Link from 'next/link'

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border-subtle pt-6 pb-2">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-fg-muted mb-3">{heading}</h2>
      <div className="space-y-2 text-sm text-fg-secondary leading-relaxed">{children}</div>
    </section>
  )
}

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p className="text-fg-muted text-sm">Last updated: May 2026</p>
      </div>

      <div className="space-y-6">

        <Section heading="About the service">
          <p>
            FIFA World Cup 2026 Predictions is a free, non-commercial prediction game. It is not
            affiliated with, endorsed by, or connected to FIFA or any official World Cup
            organisation in any way.
          </p>
        </Section>

        <Section heading="Eligibility">
          <p>
            You must be at least 13 years old to use this service. By creating an account you
            confirm you meet this requirement.
          </p>
        </Section>

        <Section heading="Your account">
          <p>
            You are responsible for keeping your account secure and for all activity that takes
            place under your account.
          </p>
        </Section>

        <Section heading="Acceptable use">
          <p>You agree not to:</p>
          <ul className="space-y-1.5 pl-1 mt-2">
            {[
              'attempt to manipulate the scoring or prediction system',
              'access other users\' data without permission',
              'use automated tools to submit predictions',
              'take any action that disrupts the service for others',
            ].map(item => (
              <li key={item} className="flex gap-2">
                <span className="text-accent shrink-0 mt-0.5">—</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section heading="Predictions and scoring">
          <ul className="space-y-1.5 pl-1">
            {[
              'Predictions must be submitted before the deadline shown in the app.',
              'Predictions cannot be changed after the deadline.',
              'Scoring is calculated automatically based on official match results and is administered by the app operator.',
              'Scoring decisions are final.',
            ].map(item => (
              <li key={item} className="flex gap-2">
                <span className="text-accent shrink-0 mt-0.5">—</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section heading="No warranty">
          <p>
            This service is provided as-is without any guarantee of uptime, accuracy, or
            continued availability. It is a personal project offered free of charge.
          </p>
        </Section>

        <Section heading="Limitation of liability">
          <p>
            To the fullest extent permitted by Finnish law, the operator is not liable for any
            indirect or consequential damages arising from use of this service.
          </p>
        </Section>

        <Section heading="FIFA trademarks">
          <p>
            &quot;FIFA&quot;, &quot;FIFA World Cup&quot;, and related marks are registered
            trademarks of FIFA. This app makes no claim to any FIFA intellectual property.
          </p>
        </Section>

        <Section heading="Termination">
          <p>
            We reserve the right to suspend or terminate accounts that violate these terms.
          </p>
        </Section>

        <Section heading="Governing law">
          <p>These terms are governed by the laws of Finland.</p>
        </Section>

        <Section heading="Contact">
          <p>
            <a href="mailto:alexkekkonen67@gmail.com" className="text-accent hover:underline">
              alexkekkonen67@gmail.com
            </a>
          </p>
        </Section>

      </div>
    </div>
  )
}
