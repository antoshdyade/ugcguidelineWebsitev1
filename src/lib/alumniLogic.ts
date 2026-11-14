import type { AlumniJob, AlumniJobType, AlumniProfile } from '../types/cms';

export interface AlumniProfileFilter {
  query?: string;
  departmentCode?: string;
  batchYear?: string;
  chapter?: string;
  mentorshipOnly?: boolean;
  includeUnapproved?: boolean;
}

export function filterAlumniProfiles(
  profiles: AlumniProfile[],
  filter: AlumniProfileFilter,
): AlumniProfile[] {
  const q = (filter.query || '').trim().toLowerCase();
  const dept = (filter.departmentCode || '').trim();
  const batch = (filter.batchYear || '').trim();
  const chapter = (filter.chapter || '').trim();

  return [...profiles]
    .filter((p) => {
      if (!filter.includeUnapproved && p.status !== 'approved') return false;
      if (dept && dept !== 'All' && p.departmentCode !== dept) return false;
      if (batch && batch !== 'All' && String(p.graduationYear) !== batch) return false;
      if (chapter && chapter !== 'All' && p.chapter !== chapter) return false;
      if (filter.mentorshipOnly && !p.openToMentorship) return false;
      if (!q) return true;
      return (
        p.fullName.toLowerCase().includes(q) ||
        p.currentCompany.toLowerCase().includes(q) ||
        p.designation.toLowerCase().includes(q) ||
        p.departmentName.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        p.chapter.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      const ao = a.sortOrder ?? a.id;
      const bo = b.sortOrder ?? b.id;
      if (ao !== bo) return ao - bo;
      return a.id - b.id;
    });
}

export interface AlumniJobFilter {
  query?: string;
  jobType?: AlumniJobType | 'All' | '';
  departmentFocus?: string;
  includeNonOpen?: boolean;
}

export function filterAlumniJobs(
  jobs: AlumniJob[],
  filter: AlumniJobFilter,
): AlumniJob[] {
  const q = (filter.query || '').trim().toLowerCase();
  const jType = (filter.jobType || '').trim();
  const dept = (filter.departmentFocus || '').trim();

  return [...jobs]
    .filter((j) => {
      if (!filter.includeNonOpen && j.status !== 'open') return false;
      if (jType && jType !== 'All' && j.jobType !== jType) return false;
      if (dept && dept !== 'All' && j.departmentFocus !== 'All Branches' && j.departmentFocus !== dept) {
        return false;
      }
      if (!q) return true;
      return (
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        j.location.toLowerCase().includes(q) ||
        j.description.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const ao = a.sortOrder ?? a.id;
      const bo = b.sortOrder ?? b.id;
      if (ao !== bo) return ao - bo;
      return b.id - a.id;
    });
}

export function validateAlumniRegistrationInput(input: {
  fullName?: string;
  email?: string;
  graduationYear?: number;
  departmentCode?: string;
  currentCompany?: string;
  designation?: string;
}): { valid: boolean; reason?: string } {
  const name = (input.fullName || '').trim();
  const email = (input.email || '').trim();
  const dept = (input.departmentCode || '').trim();
  const year = Number(input.graduationYear);

  if (name.length < 2) {
    return { valid: false, reason: 'Full name is required.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { valid: false, reason: 'Please enter a valid email address.' };
  }
  if (!Number.isInteger(year) || year < 1998 || year > new Date().getFullYear() + 2) {
    return { valid: false, reason: 'Please enter a valid graduation year (1998–present).' };
  }
  if (!dept) {
    return { valid: false, reason: 'Please select your graduation department.' };
  }
  if (!(input.currentCompany || '').trim() || !(input.designation || '').trim()) {
    return { valid: false, reason: 'Current company / organization and designation are required.' };
  }
  return { valid: true };
}

export function validateAlumniJobInput(input: {
  title?: string;
  company?: string;
  applyUrlOrEmail?: string;
  postedByAlumniName?: string;
}): { valid: boolean; reason?: string } {
  if ((input.title || '').trim().length < 3) {
    return { valid: false, reason: 'Job title must be at least 3 characters.' };
  }
  if (!(input.company || '').trim()) {
    return { valid: false, reason: 'Company / organization name is required.' };
  }
  if (!(input.applyUrlOrEmail || '').trim()) {
    return { valid: false, reason: 'Application URL or contact email is required.' };
  }
  const apply = (input.applyUrlOrEmail || '').trim().toLowerCase();
  if (apply.startsWith('javascript:') || apply.startsWith('data:') || apply.startsWith('vbscript:')) {
    return { valid: false, reason: 'Unsafe application link rejected.' };
  }
  if (!(input.postedByAlumniName || '').trim()) {
    return { valid: false, reason: 'Alumni poster name is required.' };
  }
  return { valid: true };
}
