const absoluteFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'long',
  timeStyle: 'short',
})

const relativeFormatter = new Intl.RelativeTimeFormat(undefined, {
  numeric: 'auto',
})

const RELATIVE_UNITS = [
  ['year', 60 * 60 * 24 * 365],
  ['month', 60 * 60 * 24 * 30],
  ['week', 60 * 60 * 24 * 7],
  ['day', 60 * 60 * 24],
  ['hour', 60 * 60],
  ['minute', 60],
  ['second', 1],
]

function toDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatAbsoluteDate(isoString) {
  const date = toDate(isoString)
  if (!date) return '—'
  return absoluteFormatter.format(date)
}

export function formatRelativeDate(isoString) {
  const date = toDate(isoString)
  if (!date) return ''

  const diffSeconds = (date.getTime() - Date.now()) / 1000
  for (const [unit, secondsInUnit] of RELATIVE_UNITS) {
    if (Math.abs(diffSeconds) >= secondsInUnit || unit === 'second') {
      return relativeFormatter.format(Math.round(diffSeconds / secondsInUnit), unit)
    }
  }

  return ''
}

export function formatDateWithRelative(isoString) {
  const absolute = formatAbsoluteDate(isoString)
  const relative = formatRelativeDate(isoString)
  if (!relative) return absolute
  return `${absolute} (${relative})`
}
