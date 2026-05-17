import Link from 'next/link'

interface ProfileButtonProps {
  userId: string
  initial: string
}

export function ProfileButton({ userId, initial }: ProfileButtonProps) {
  return (
    <Link
      href={`/users/${userId}`}
      className="w-8 h-8 rounded-full bg-bg-card border border-border-strong flex items-center justify-center text-fg-secondary hover:text-fg-primary hover:border-accent transition-colors text-sm font-semibold"
      aria-label="My Profile"
      title="My Profile"
    >
      {initial}
    </Link>
  )
}
