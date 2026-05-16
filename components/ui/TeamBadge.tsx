import { getFlagUrl } from '@/lib/team-flags'

export type TeamBadgeProps = {
  teamId?: string
  name: string
  abbreviation: string
  flag?: string
  size?: 'sm' | 'md' | 'lg'
}

const avatarSize = { sm: 'w-6 h-6 text-xs', md: 'w-8 h-8 text-sm', lg: 'w-10 h-10 text-base' }
const textSize   = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' }
const gapSize    = { sm: 'gap-1.5', md: 'gap-2', lg: 'gap-2.5' }

export function TeamBadge({ name, abbreviation, flag, size = 'md' }: TeamBadgeProps) {
  const flagUrl = getFlagUrl(abbreviation)
  if (!flagUrl && !flag) {
    console.warn(`TeamBadge: no flag mapped for abbreviation "${abbreviation}"`)
  }

  return (
    <div className={`inline-flex items-center ${gapSize[size]}`}>
      <div
        className={`${avatarSize[size]} rounded-full bg-bg-elevated border border-border-subtle flex items-center justify-center shrink-0 leading-none overflow-hidden`}
      >
        {flagUrl ? (
          <img src={flagUrl} alt={name} className="w-full h-full object-cover" />
        ) : flag ? (
          <span>{flag}</span>
        ) : (
          // Gray placeholder — keeps layout stable when flag is unmapped
          <span className="w-full h-full block bg-bg-card" />
        )}
      </div>
      <span className={`${textSize[size]} font-semibold tracking-wider uppercase text-fg-primary`}>
        {abbreviation}
      </span>
    </div>
  )
}
