export const formatDate = (
  value: string,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' },
) => new Date(`${value}T12:00:00`).toLocaleDateString('en-US', options)

export const formatLongDate = (value: string) =>
  formatDate(value, { weekday: 'long', month: 'long', day: 'numeric' })

export const daysBetween = (from: string, to: string) => {
  const milliseconds =
    new Date(`${to}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime()
  return Math.max(0, Math.ceil(milliseconds / 86_400_000))
}

export const statusKey = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-')
