'use client'
import { useEffect, useState } from 'react'

interface Props {
  iso: string | null
  className?: string
}

export function MatchTime({ iso, className }: Props) {
  const [formatted, setFormatted] = useState<string>('')

  useEffect(() => {
    if (!iso) return
    const date = new Date(iso)
    const formatter = new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
    setFormatted(formatter.format(date))
  }, [iso])

  if (!iso || !formatted) return null
  return <time dateTime={iso} className={className}>{formatted}</time>
}
