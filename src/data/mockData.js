import itemsData from './items.json';
import matchesData from './matches.json';
import claimsData from './claims.json';
import usersData from './users.json';

export const items = itemsData;
export const matches = matchesData;
export const claims = claimsData;
export const users = usersData;

export const categories = [
  { id: 'id-card', label: 'ID Cards' },
  { id: 'phone', label: 'Phones' },
  { id: 'book', label: 'Books' },
  { id: 'key', label: 'Keys' },
  { id: 'bag', label: 'Bags' },
  { id: 'other', label: 'Others' },
];

export const locations = [
  'Main Library',
  'Central Cafeteria',
  'Science Building',
  'Engineering Block A',
  'Engineering Block B',
  'Student Center',
  'Sports Complex',
  'Auditorium',
  'Admin Office',
  'Hostel Block 1',
  'Hostel Block 2',
  'Computer Lab',
  'Parking Area',
  'Campus Gate',
];

export const activityFeed = [
  {
    id: 'act-1',
    type: 'report',
    message: 'New lost item reported: "Compact White Wireless Earbuds Charging Case"',
    time: 'Recently',
  },
  {
    id: 'act-2',
    type: 'match',
    message: 'Ranked likely match generated for "Introduction to Algorithms Textbook (CLRS)"',
    time: 'Recently',
  },
  {
    id: 'act-3',
    type: 'claim',
    message: 'Claim submitted for "Android Phone Left on Cafeteria Table" — awaiting verification',
    time: 'Earlier today',
  },
  {
    id: 'act-4',
    type: 'verify',
    message: 'Claim verified for "Student ID Card Found Outside Library Entrance"',
    time: 'Yesterday',
  },
  {
    id: 'act-5',
    type: 'return',
    message: 'Handover recorded and marked Returned for "Grey Canvas Backpack Found in Auditorium"',
    time: '2 days ago',
  },
];

export function getCategoryLabel(categoryId) {
  return categories.find((c) => c.id === categoryId)?.label || 'Others';
}
