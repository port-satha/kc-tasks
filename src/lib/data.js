export const BRANDS = ['onest', 'grubby', 'kc']
export const BRAND_LABELS = { onest: 'onest', grubby: 'grubby', kc: 'Kind Collective' }
export const PRIORITIES = ['High', 'Med', 'Low']
export const STATUSES = ['To Do', 'In Progress', 'In Review', 'Done']
export const MEMBERS = {
  P: { label: 'Port', initials: 'P', color: 'bg-purple-100 text-purple-800' },
  N: { label: 'Noon', initials: 'N', color: 'bg-blue-100 text-blue-800' },
  Pi: { label: 'Pim', initials: 'Pi', color: 'bg-green-100 text-green-800' },
  J: { label: 'Jomjam', initials: 'J', color: 'bg-teal-100 text-teal-800' },
  S: { label: 'Sek', initials: 'S', color: 'bg-amber-100 text-amber-800' },
}

export const BRAND_COLORS = {
  onest: 'bg-green-100 text-green-800',
  grubby: 'bg-teal-100 text-teal-800',
  kc: 'bg-purple-100 text-purple-800',
}
export const PRIORITY_COLORS = {
  High: 'bg-red-100 text-red-800',
  Med: 'bg-amber-100 text-amber-800',
  Low: 'bg-gray-100 text-gray-600',
}
export const STATUS_COLORS = {
  'To Do': 'bg-gray-200',
  'In Progress': 'bg-blue-400',
  'In Review': 'bg-amber-400',
  'Done': 'bg-green-500',
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export const DEFAULT_TASKS = [
  { id: uid(), title: 'Finalize True/Dtac co-promotion mechanics', brand: 'onest', priority: 'High', assignee: 'P', due: '2026-03-28', status: 'In Progress', notes: '' },
  { id: uid(), title: 'Confirm Tipopest restock ETA with supplier', brand: 'grubby', priority: 'High', assignee: 'S', due: '2026-03-25', status: 'To Do', notes: '' },
  { id: uid(), title: 'Recruit replacement for Atom (accounting)', brand: 'kc', priority: 'High', assignee: 'N', due: '2026-04-05', status: 'In Progress', notes: '' },
  { id: uid(), title: 'Plan Song Wat closure contingency (July–Aug)', brand: 'onest', priority: 'High', assignee: 'P', due: '2026-04-15', status: 'To Do', notes: '' },
  { id: uid(), title: 'Prepare grubby 7.7 campaign brief', brand: 'grubby', priority: 'Med', assignee: 'J', due: '2026-05-01', status: 'To Do', notes: '' },
  { id: uid(), title: 'Review onest shampoo/conditioner formulas', brand: 'onest', priority: 'Med', assignee: 'Pi', due: '2026-04-10', status: 'In Review', notes: '' },
  { id: uid(), title: 'Onboard new accounting staff to KC office', brand: 'kc', priority: 'Med', assignee: 'N', due: '2026-04-20', status: 'To Do', notes: '' },
  { id: uid(), title: 'Draft Ampack OEM-to-hybrid pitch deck', brand: 'kc', priority: 'Low', assignee: 'P', due: '2026-04-30', status: 'To Do', notes: '' },
]
