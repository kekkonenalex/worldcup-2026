import Link from 'next/link'

const FAQS = [
  {
    q: "I forgot my password or can't log in",
    a: 'On the login page, enter your email address under "First time here, or forgot password?" and click Send Sign-In Link. The link arrives by email and logs you in automatically — you can then update your password from your profile page.',
  },
  {
    q: "I didn't receive the sign-in email",
    a: "Check your spam or junk folder first. If it's not there, wait a minute and try requesting another one. Make sure you're using the same email address you originally registered with.",
  },
  {
    q: "Why can't I see my friends' predictions?",
    a: 'Predictions are hidden from everyone until the submission deadline passes. Once the deadline has gone, you can view the predictions of anyone in your league.',
  },
  {
    q: 'How do I join a league?',
    a: 'Ask the league creator to share their invite code. Go to the Leagues page, enter the invite code, and you\'re in.',
  },
  {
    q: 'I made a mistake in my predictions — can I change them?',
    a: 'Yes. You can update your predictions as many times as you like before the deadline. Once the deadline passes, all predictions are locked permanently and cannot be changed.',
  },
  {
    q: "My points haven't updated after a match",
    a: "Scores are updated after each matchday once match results have been entered. There may be a short delay. If you believe there is a genuine error in your score, get in touch.",
  },
  {
    q: 'How does the scoring work?',
    a: null,
  },
]

export default function SupportPage() {
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
          Support
        </h1>
        <p className="text-sm text-fg-secondary leading-relaxed max-w-prose">
          Have a question or running into a problem? Here are answers to the most common
          questions. If you don&apos;t find what you&apos;re looking for, send an email and
          we&apos;ll get back to you.
        </p>
      </div>

      {/* FAQ */}
      <section className="mb-10">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-fg-muted mb-4">
          Frequently asked questions
        </h2>
        <div className="space-y-0">
          {FAQS.map(({ q, a }) => (
            <div key={q} className="border-t border-border-subtle py-5">
              <p className="text-sm font-semibold text-fg-primary mb-2">{q}</p>
              {a === null ? (
                <p className="text-sm text-fg-secondary leading-relaxed">
                  See the{' '}
                  <Link href="/rules" className="text-accent hover:underline">
                    Rules page
                  </Link>{' '}
                  for a full explanation of how group stage, knockout, and awards predictions
                  are scored.
                </p>
              ) : (
                <p className="text-sm text-fg-secondary leading-relaxed">{a}</p>
              )}
            </div>
          ))}
          <div className="border-t border-border-subtle" />
        </div>
      </section>

      {/* Contact */}
      <section className="border-t border-border-subtle pt-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-fg-muted mb-3">
          Contact
        </h2>
        <p className="text-sm text-fg-secondary leading-relaxed mb-2">
          Email:{' '}
          <a href="mailto:alexkekkonen67@gmail.com" className="text-accent hover:underline">
            alexkekkonen67@gmail.com
          </a>
        </p>
        <p className="text-sm text-fg-muted leading-relaxed">
          This app is run by one person in their spare time — please allow a day or two for
          a response.
        </p>
      </section>
    </div>
  )
}
