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
            label="Correct result (correct winner or draw) + correct goal difference"
            points="5 pts"
            sub="e.g. you predicted 2–0, actual was 3–1"
          />
          <ScoreRow
            label="Correct result (correct winner or draw), wrong goal difference"
            points="3 pts"
            sub="e.g. you predicted 2–0, actual was 2–1"
          />
          <ScoreRow label="Wrong result" points="0 pts" />
        </div>
        <div className="bg-bg-card border border-border-subtle rounded-card px-5 pt-3 pb-4 mb-8 space-y-3">
          <div className="flex items-start justify-between gap-4 pb-2.5 border-b border-border-subtle">
            <span className="text-sm text-fg-secondary">Score bonus</span>
            <span className="font-mono font-bold text-accent tabular-nums shrink-0 text-sm">+1 pt</span>
          </div>
          <p className="text-xs text-fg-muted leading-relaxed">
            You earn a +1 bonus on any match where you correctly predicted at least one
            team&apos;s exact goal count — even when that count is zero. The cap per match
            is still 6 points (no bonus on exact scores).
          </p>
          <p className="text-xs text-fg-muted leading-relaxed">
            <span className="text-fg-secondary font-semibold">Example:</span>{' '}
            you predicted 1–0 and the match ended 0–0. You got the away team&apos;s goal
            count (0) exactly right, so you earn 0 + 1 = <span className="text-fg-secondary font-semibold">1 point</span>.
          </p>
          <p className="text-xs text-fg-muted leading-relaxed">
            <span className="text-fg-secondary font-semibold">Example:</span>{' '}
            you predicted 2–1 and the match ended 3–1. You got the outcome right (3 pts)
            and the away count exactly right (1 = 1), so you earn 3 + 1 = <span className="text-fg-secondary font-semibold">4 points</span>.
          </p>
        </div>

        {/* Knockout */}
        <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted mb-2">
          Knockout — per team
        </h3>
        <p className="text-sm text-fg-secondary mb-3">
          Knockout points{' '}
          <span className="text-fg-primary font-semibold">stack</span>. For each team in
          your bracket, you earn points for every round they correctly advance to — not just
          the furthest round.
        </p>
        <div className="bg-bg-card border border-border-subtle rounded-card px-5 py-1 mb-3">
          <ScoreRow
            label="Team advances to R32"
            points="+6 pts"
            sub="Cumulative so far: 6 pts"
          />
          <ScoreRow
            label="Team advances to R16"
            points="+8 pts"
            sub="Cumulative so far: 14 pts"
          />
          <ScoreRow
            label="Team advances to QF"
            points="+10 pts"
            sub="Cumulative so far: 24 pts"
          />
          <ScoreRow
            label="Team advances to SF"
            points="+15 pts"
            sub="Cumulative so far: 39 pts"
          />
          <ScoreRow
            label="Team advances to Final"
            points="+20 pts"
            sub="Cumulative so far: 59 pts"
          />
        </div>
        <div className="bg-bg-card border border-border-subtle rounded-card px-5 pt-3 pb-4 mb-3 space-y-2">
          <p className="text-xs text-fg-muted leading-relaxed">
            <span className="text-fg-secondary font-semibold">Example:</span>{' '}
            you predict Portugal to reach the QF. Portugal reaches the QF and loses there.
            You earn 6 + 8 + 10 = <span className="text-fg-secondary font-semibold">24 points</span> for Portugal.
          </p>
          <p className="text-xs text-fg-muted leading-relaxed">
            <span className="text-fg-secondary font-semibold">Example:</span>{' '}
            you predict Argentina to win the World Cup. Argentina wins. You earn
            6 + 8 + 10 + 15 + 20 = <span className="text-fg-secondary font-semibold">59 points</span> across
            Argentina&apos;s bracket path, plus a separate top-4 bonus for predicting Argentina as
            champion (see below).
          </p>
          <p className="text-xs text-fg-muted leading-relaxed">
            <span className="text-fg-secondary font-semibold">Example:</span>{' '}
            you predict Brazil to make the Round of 16. Brazil reaches the Semi-finals, but
            you only placed Brazil in your R16 slot — not in your QF, SF, or Final slots.
            You earn 6 + 8 = <span className="text-fg-secondary font-semibold">14 points</span> for Brazil.
          </p>
        </div>
        <div className="bg-bg-card border border-border-subtle rounded-card px-5 pt-3 pb-4 mb-8 space-y-3">
          <div className="flex items-start justify-between gap-4 pb-2.5 border-b border-border-subtle">
            <span className="text-sm text-fg-secondary">Top-4 placement bonus</span>
            <span className="font-mono font-bold text-accent tabular-nums shrink-0 text-sm">+25 pts each</span>
          </div>
          <p className="text-xs text-fg-muted leading-relaxed">
            You also predict the final standings of the top 4 teams: World Cup winner (1st),
            runner-up (2nd), third place, and fourth place. For each position you predict
            exactly right, you earn +25 bonus points. Maximum 100 bonus points if you nail
            all four positions.
          </p>
          <p className="text-xs text-fg-muted leading-relaxed">
            The position must be exact. If you predict a team to finish 4th and they finish
            3rd, that does not count.
          </p>
          <p className="text-xs text-fg-muted leading-relaxed">
            <span className="text-fg-secondary font-semibold">Example:</span>{' '}
            you predicted Argentina 1st, Brazil 2nd, France 3rd, Spain 4th. Actual finish:
            Argentina 1st, France 2nd, Brazil 3rd, Spain 4th. You earn +25 for Argentina
            (correct 1st) and +25 for Spain (correct 4th). Nothing for Brazil (predicted
            2nd, finished 3rd) or France (predicted 3rd, finished 2nd).
            Total: <span className="text-fg-secondary font-semibold">+50 bonus points</span>.
          </p>
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
