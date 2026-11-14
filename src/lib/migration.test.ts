import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildZipBuffer,
  parseZipBuffer,
  sanitizeZipEntryPath,
} from './zipArchive';
import {
  rewriteDomainUrlsInValue,
  validateSafeRestoreAssetPath,
} from './backupLogic';
import {
  filterAlumniJobs,
  filterAlumniProfiles,
  validateAlumniJobInput,
  validateAlumniRegistrationInput,
} from './alumniLogic';
import { canUserAccessResource } from './cmsLogic';
import type { AlumniJob, AlumniProfile } from '../types/cms';

test('zipArchive buildZipBuffer and parseZipBuffer round-trip text and binary entries', () => {
  const binary = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xff, 0x00, 0x42]);
  const text = Buffer.from(JSON.stringify({ ok: true, portal: 'SVCOER Alumni & CMS' }), 'utf8');

  const zipBuf = buildZipBuffer([
    { name: 'migration-manifest.json', data: text },
    { name: 'media/uploads/photo.png', data: binary },
  ]);

  const parsed = parseZipBuffer(zipBuf);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].name, 'migration-manifest.json');
  assert.equal(parsed[0].data.toString('utf8'), text.toString('utf8'));
  assert.equal(parsed[1].name, 'media/uploads/photo.png');
  assert.deepEqual(parsed[1].data, binary);
});

test('zipArchive sanitizeZipEntryPath rejects path traversal and null bytes', () => {
  assert.equal(sanitizeZipEntryPath('../../etc/passwd'), null);
  assert.equal(sanitizeZipEntryPath('uploads/../secret.php'), null);
  assert.equal(sanitizeZipEntryPath('bad\0file.txt'), null);
  assert.equal(sanitizeZipEntryPath('/media/uploads/ok.jpg'), 'media/uploads/ok.jpg');
});

test('rewriteDomainUrlsInValue updates domain origins across nested HTML and JSON without corrupting relative paths', () => {
  const input = {
    heroHtml: '<p>Visit <a href="https://old.college.edu/svcoer/alumni">Alumni</a></p>',
    logoUrl: '/uploads/logo.png',
    externalMirror: 'https://old.college.edu/svcoer/uploads/prospectus.pdf',
  };
  const rewritten = rewriteDomainUrlsInValue(
    input,
    'https://old.college.edu/svcoer/',
    'https://new.sveri.ac.in',
  );
  assert.equal(
    rewritten.heroHtml,
    '<p>Visit <a href="https://new.sveri.ac.in/alumni">Alumni</a></p>',
  );
  assert.equal(rewritten.logoUrl, '/uploads/logo.png');
  assert.equal(rewritten.externalMirror, 'https://new.sveri.ac.in/uploads/prospectus.pdf');
});

test('validateSafeRestoreAssetPath blocks executable uploads and traversal', () => {
  assert.equal(validateSafeRestoreAssetPath('media/uploads/shell.php').safe, false);
  assert.equal(validateSafeRestoreAssetPath('media/uploads/shell.php.jpg').safe, false);
  assert.equal(validateSafeRestoreAssetPath('media/uploads/../etc/passwd').safe, false);
  assert.equal(validateSafeRestoreAssetPath('src/App.tsx').safe, false);

  const validImg = validateSafeRestoreAssetPath('media/uploads/campus-2026.webp');
  assert.equal(validImg.safe, true);
  assert.equal(validImg.targetSubdir, 'uploads');
  assert.equal(validImg.relativeName, 'campus-2026.webp');
});

test('alumniLogic filters approved directory profiles, jobs, and validates public forms', () => {
  const profiles: AlumniProfile[] = [
    {
      id: 1,
      fullName: 'Aarav Deshmukh',
      email: 'aarav@example.com',
      graduationYear: 2019,
      departmentCode: 'CSE',
      departmentName: 'Computer Science & Engineering',
      degree: 'B.Tech',
      currentCompany: 'TCS Research',
      designation: 'Senior Engineer',
      location: 'Pune',
      chapter: 'Pune Chapter',
      photoUrl: '/uploads/a.jpg',
      bio: 'Cloud systems architect',
      openToMentorship: true,
      isFeatured: true,
      status: 'approved',
      sortOrder: 1,
      registeredAt: '2026-01-10',
    },
    {
      id: 2,
      fullName: 'Pending User',
      email: 'pending@example.com',
      graduationYear: 2021,
      departmentCode: 'MECH',
      departmentName: 'Mechanical Engineering',
      degree: 'B.Tech',
      currentCompany: 'Bharat Forge',
      designation: 'Engineer',
      location: 'Solapur',
      chapter: 'Pandharpur Home Chapter',
      photoUrl: '/uploads/b.jpg',
      bio: 'Pending moderation',
      openToMentorship: false,
      isFeatured: false,
      status: 'pending',
      sortOrder: 2,
      registeredAt: '2026-02-01',
    },
  ];

  const publicList = filterAlumniProfiles(profiles, {});
  assert.equal(publicList.length, 1);
  assert.equal(publicList[0].fullName, 'Aarav Deshmukh');

  const adminList = filterAlumniProfiles(profiles, { includeUnapproved: true, departmentCode: 'MECH' });
  assert.equal(adminList.length, 1);
  assert.equal(adminList[0].status, 'pending');

  const jobs: AlumniJob[] = [
    {
      id: 1,
      title: 'Backend Developer Intern',
      company: 'Infosys',
      location: 'Pune',
      jobType: 'Internship',
      departmentFocus: 'CSE',
      experienceRange: '0-1 yrs',
      compensation: '25,000/mo',
      description: 'Summer internship',
      applyUrlOrEmail: 'https://careers.infosys.com',
      postedByAlumniName: 'Aarav Deshmukh',
      postedByBatch: '2019',
      deadlineDate: '2026-12-01',
      status: 'open',
      postedAt: '2026-10-01',
      sortOrder: 1,
    },
    {
      id: 2,
      title: 'Closed Role',
      company: 'ABC',
      location: 'Mumbai',
      jobType: 'Full-Time',
      departmentFocus: 'MECH',
      experienceRange: '2 yrs',
      compensation: '8 LPA',
      description: 'Closed',
      applyUrlOrEmail: 'hr@abc.com',
      postedByAlumniName: 'Aarav',
      postedByBatch: '2019',
      deadlineDate: '2026-09-01',
      status: 'closed',
      postedAt: '2026-08-01',
      sortOrder: 2,
    },
  ];
  assert.equal(filterAlumniJobs(jobs, { jobType: 'Internship' }).length, 1);
  assert.equal(filterAlumniJobs(jobs, { includeNonOpen: true }).length, 2);

  assert.equal(
    validateAlumniRegistrationInput({
      fullName: 'Sneha Kulkarni',
      email: 'sneha@example.com',
      graduationYear: 2020,
      departmentCode: 'ENTC',
      currentCompany: 'Qualcomm',
      designation: 'SoC Engineer',
    }).valid,
    true,
  );
  assert.equal(
    validateAlumniRegistrationInput({ fullName: 'X', email: 'bad', graduationYear: 1900 }).valid,
    false,
  );
  assert.equal(
    validateAlumniJobInput({
      title: 'GET Engineer',
      company: 'Atlas Copco',
      applyUrlOrEmail: 'javascript:alert(1)',
      postedByAlumniName: 'Rohit',
    }).valid,
    false,
  );

  assert.equal(canUserAccessResource({ role: 'content_editor', isActive: true }, 'alumni'), true);
  assert.equal(canUserAccessResource({ role: 'iqac_officer', isActive: true }, 'alumni'), true);
  assert.equal(canUserAccessResource({ role: 'exam_controller', isActive: true }, 'alumni'), false);
});
