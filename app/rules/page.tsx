import Link from 'next/link'
import { PREDICTION_DEADLINE } from '@/lib/config'

function SectionNum({ n }: { n: string }) {
  return (
    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full border-2 border-accent text-accent font-display text-xl mb-4">
      {n}
    </div>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="shrink-0 w-6 h-6 rounded-full bg-accent/20 text-accent text-xs font-bold flex items-center justify-center mt-0.5">
        {n}
      </span>
      <p className="text-sm text-fg-secondary leading-relaxed">{children}</p>
    </div>
  )
}

function ScoreRow({
  label,
  points,
  sub,
}: {
  label: string
  points: string
  sub?: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-border-subtle last:border-0">
      <div>
        <span className="text-sm text-fg-secondary">{label}</span>
        {sub && <div className="text-xs text-fg-muted mt-0.5">{sub}</div>}
      </div>
      <span className="font-mono font-bold text-accent tabular-nums shrink-0 text-sm">{points}</span>
    </div>
  )
}

export default function RulesPage() {
  const deadlineStr = PREDICTION_DEADLINE.toLocaleString('en-GB', {
    timeZone: 'Europe/Helsinki',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="max-w-2xl mx-auto pb-16 pt-4">
      <Link
        href="/"
        className="text-xs font-semibold uppercase tracking-wider text-fg-muted hover:text-fg-primary transition-colors"
      >
        ← Home
      </Link>

      <div className="mt-6 mb-10">
        <h1 className="text-5xl font-display uppercase tracking-wide text-fg-primary mb-2">
          How it works
        </h1>
        <p className="text-fg-muted text-sm">
          Everything you need to know about making predictions and earning points.
        </p>
      </div>

      {/* ── Section 1 — Making predictions ─────────────────────────────── */}
      <section className="mb-14">
        <SectionNum n="1" />
        <h2 className="text-3xl font-display uppercase tracking-wide text-fg-primary mb-6">
          Making predictions
        </h2>

        <div className="space-y-4">
          <div className="bg-bg-card border border-border-subtle rounded-card p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-accent mb-4">
              Group Stage
            </h3>
            <div className="space-y-3">
              <Step n={1}>
                Predict the score of all 72 group stage matches across 12 groups — every
                team plays three matches in their group.
              </Step>
              <Step n={2}>
                Scores auto-save as you type. You can change them as many times as you want
                before the deadline.
              </Step>
              <Step n={3}>
                Group standings are calculated live from your predictions so you can see
                which teams advance and prepare your knockout bracket.
              </Step>
            </div>
          </div>

          <div className="bg-bg-card border border-border-subtle rounded-card p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-accent mb-4">
              Knockout Bracket
            </h3>
            <div className="space-y-3">
              <Step n={1}>
                Pick which teams advance through every round: Round of 32 → Round of 16 →
                Quarter-finals → Semi-finals → Final.
              </Step>
              <Step n={2}>
                Third-placed teams are seeded into the Round of 32 automatically using
                FIFA&apos;s rules based on your group predictions — you don&apos;t place them manually.
              </Step>
              <Step n={3}>
                Earlier picks cascade forward. A team can only appear in a later round if
                you advanced them through the earlier one.
              </Step>
            </div>
          </div>

          <div className="bg-bg-card border border-border-subtle rounded-card p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-accent mb-4">
              Awards
            </h3>
            <div className="space-y-3">
              <Step n={1}>
                Pick the Golden Boot winner — the tournament&apos;s top scorer — and predict
                their exact goal count.
              </Step>
              <Step n={2}>
                Pick the Golden Ball (best player), Golden Glove (best goalkeeper), and
                Best Young Player.
              </Step>
            </div>
          </div>

          <div className="bg-accent/10 border border-accent/30 rounded-card p-4">
            <p className="text-sm text-fg-secondary">
              <span className="font-semibold text-accent">Deadline — </span>
              All predictions lock on{' '}
              <span className="font-semibold text-fg-primary">{deadlineStr} Helsinki time</span>.
              After that, no more changes and everyone in your leagues can see each
              other&apos;s picks.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 2 — Scoring ─────────────────────────────────────────── */}
      <section className="mb-14">
        <SectionNum n="2" />
        <h2 className="text-3xl font-display uppercase tracking-wide text-fg-primary mb-6">
          How scoring works
        </h2>

        {/* Group */}
        <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted mb-2">
          Group Stage — per match
        </h3>
        <div className="bg-bg-card border border-border-subtle rounded-card px-5 py-1 mb-2">
          <ScoreRow label="Exact score" points="6 pts" />
          <ScoreRow
            label="Correct result + correct goal difference"
            points="5 pts"
            sub="e.g. you predicted 2–0, actual was 3–1"
          />
          <ScoreRow
            label="Correct result, wrong goal difference"
            points="3 pts"
            sub="e.g. you predicted 2–0, actual was 2–1"
          />
          <ScoreRow label="Wrong result" points="0 pts" />
        </div>
        <div className="bg-bg-card border border-border-subtle rounded-card px-5 py-1 mb-8">
          <ScoreRow
            label="Score bonus"
            points="+1 pt"
            sub="Added to a 0- or 3-point result if you correctly predicted at least one team's non-zero goal count. Does not apply to exact scores or draws that end 0–0."
          />
        </div>

        {/* Knockout */}
        <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted mb-2">
          Knockout — per team
        </h3>
        <p className="text-sm text-fg-secondary mb-3">
          You earn points for each team based on the{' '}
          <span className="text-fg-primary font-semibold">furthest round</span> that you
          predicted them to reach AND they actually reached — whichever comes first. Rounds
          are not stacked: one score per team.
        </p>
        <div className="bg-bg-card border border-border-subtle rounded-card px-5 py-1 mb-2">
          <ScoreRow
            label="Correct Round of 32 pick"
            points="6 pts"
            sub="Team advances from R32 to R16"
          />
          <ScoreRow
            label="Correct Round of 16 pick"
            points="8 pts"
            sub="Team advances to Quarter-finals"
          />
          <ScoreRow
            label="Correct Quarter-final pick"
            points="10 pts"
            sub="Team advances to Semi-finals"
          />
          <ScoreRow
            label="Correct Semi-final pick"
            points="15 pts"
            sub="Team reaches the Final"
          />
          <ScoreRow label="Correct champion" points="20 pts" />
        </div>
        <div className="bg-bg-card border border-border-subtle rounded-card px-5 py-1 mb-8">
          <ScoreRow
            label="Top-4 placement bonus"
            points="+25 pts each"
            sub="For every team you predicted to reach the semi-finals or further that actually does. Maximum +100 pts (all four semi-finalists correct)."
          />
        </div>

        {/* Awards */}
        <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted mb-2">
          Awards
        </h3>
        <div className="bg-bg-card border border-border-subtle rounded-card px-5 py-1">
          <ScoreRow label="Golden Boot — player name" points="20 pts" />
          <ScoreRow
            label="Golden Boot — goal tally"
            points="10 pts"
            sub="Exact number required, scored separately from the player name"
          />
          <ScoreRow label="Golden Ball" points="20 pts" />
          <ScoreRow label="Golden Glove" points="20 pts" />
          <ScoreRow label="Best Young Player" points="15 pts" />
        </div>
      </section>

      {/* ── Section 3 — Leagues ─────────────────────────────────────────── */}
      <section className="mb-14">
        <SectionNum n="3" />
        <h2 className="text-3xl font-display uppercase tracking-wide text-fg-primary mb-6">
          Leagues
        </h2>
        <div className="bg-bg-card border border-border-subtle rounded-card p-5">
          <div className="space-y-3">
            <Step n={1}>
              Go to the{' '}
              <Link href="/leagues" className="text-accent hover:underline">
                Leagues page
              </Link>{' '}
              and create a league — just pick a name.
            </Step>
            <Step n={2}>Share the invite code with your friends.</Step>
            <Step n={3}>
              They enter the code on the Leagues page to join.
            </Step>
            <Step n={4}>
              After the prediction deadline passes, browse everyone&apos;s picks
              side-by-side in your league.
            </Step>
            <Step n={5}>
              The league leaderboard ranks all members by total points, updated in
              real time as matches are played.
            </Step>
          </div>
        </div>
      </section>

      {/* ── Section 4 — Tiebreakers ─────────────────────────────────────── */}
      <section className="mb-14">
        <SectionNum n="4" />
        <h2 className="text-3xl font-display uppercase tracking-wide text-fg-primary mb-6">
          Tiebreakers
        </h2>
        <p className="text-sm text-fg-secondary mb-4">
          When two players have the same total points, the leaderboard uses this sequence
          to separate them. The first criterion that differs decides it.
        </p>
        <div className="bg-bg-card border border-border-subtle rounded-card px-5 py-1 mb-4">
          <ScoreRow label="1. Correct champion" points="wins" />
          <ScoreRow label="2. Correct runner-up" points="wins" />
          <ScoreRow label="3. Correct third place" points="wins" />
          <ScoreRow label="4. Correct Golden Boot player" points="wins" />
          <ScoreRow label="5. Higher group stage points total" points="wins" />
          <ScoreRow label="6. More correct Round of 32 picks" points="wins" />
        </div>
        <p className="text-xs text-fg-muted">
          Tiebreakers are calculated automatically. Players still equal after all six
          criteria share the same rank.
        </p>
      </section>

      <div className="text-center">
        <Link
          href="/predictions"
          className="inline-flex items-center justify-center bg-accent text-accent-fg hover:bg-accent-hover font-semibold uppercase tracking-wider rounded-lg transition-colors px-6 py-3 text-sm"
        >
          Start predicting →
        </Link>
      </div>
    </div>
  )
}
