/**
 * Central site configuration.
 * Update institution details, contact information, and branding here —
 * every page (Navbar, Footer, About, Register, etc.) reads from this file.
 */
export const SITE = {
  name: 'Smart Campus Lost & Found Portal',
  shortName: 'Campus Lost & Found',
  tagline: 'with Automatic Item Matching',

  university: 'Odisha University of Technology and Research',
  universityShort: 'OUTR',
  city: 'Bhubaneswar',

  contactEmail: 'satyabusiness118@gmail.com',
  office: 'Student Services Office, OUTR, Bhubaneswar',

  logo: {
    small: '/logo-64.png',
    medium: '/logo-192.png',
    large: '/logo-512.png',
    alt: 'Smart Campus Lost & Found Portal logo',
  },

  team: [
    { name: 'Satyaprakash Naik', roll: '23110307' },
    { name: 'Shyam Sundar Soren', roll: '2311030' },
  ],
  semester: '7th Semester',
};

export const UNIVERSITY_FULL = `${SITE.university}, ${SITE.city}`;
