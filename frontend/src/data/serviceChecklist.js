// Service checklist items grouped by category
// Minor Service = basic items; Major Service = all items

const CHECKLIST_GROUPS = [
  {
    category: 'Engine & Filters',
    items: [
      { item: 'Engine oil change', minor: true },
      { item: 'Oil filter replacement', minor: true },
      { item: 'Air filter inspection', minor: true },
      { item: 'Fuel filter replacement', minor: false },
      { item: 'Spark plug inspection', minor: false },
      { item: 'Drive belt inspection', minor: false },
    ],
  },
  {
    category: 'Fluids',
    items: [
      { item: 'Coolant level check', minor: true },
      { item: 'Brake fluid check', minor: true },
      { item: 'Power steering fluid check', minor: false },
      { item: 'Transmission fluid check', minor: false },
    ],
  },
  {
    category: 'Brakes & Suspension',
    items: [
      { item: 'Brake pad inspection', minor: true },
      { item: 'Brake disc inspection', minor: false },
      { item: 'Suspension check', minor: false },
    ],
  },
  {
    category: 'Electrical & General',
    items: [
      { item: 'Battery test', minor: true },
      { item: 'Lights & indicators check', minor: true },
      { item: 'Wiper blades inspection', minor: false },
      { item: 'AC system check', minor: false },
      { item: 'Diagnostic scan', minor: false },
    ],
  },
  {
    category: 'Steering & Tyres',
    items: [
      { item: 'Tyre pressure & condition', minor: true },
      { item: 'Wheel alignment check', minor: false },
      { item: 'Steering linkage inspection', minor: false },
    ],
  },
];

export function getChecklistForType(serviceType) {
  if (!serviceType || (!serviceType.toLowerCase().includes('minor') && !serviceType.toLowerCase().includes('major'))) {
    return [];
  }
  const isMajor = serviceType.toLowerCase().includes('major');
  const checklist = [];
  for (const group of CHECKLIST_GROUPS) {
    for (const entry of group.items) {
      if (isMajor || entry.minor) {
        checklist.push({ item: entry.item, category: group.category, checked: false });
      }
    }
  }
  return checklist;
}

export function getChecklistGroups(checklist) {
  const groups = {};
  for (const entry of checklist) {
    const cat = entry.category || 'General';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(entry);
  }
  return groups;
}

export default CHECKLIST_GROUPS;
