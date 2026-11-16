import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCustomSliderHtml,
  buildPhotoProfileCardHtml,
  buildStyledTableHtml,
  EDITOR_COMPONENT_BLOCKS,
  swapTableThemeInHtml,
  TABLE_THEMES,
} from './editorBlocks';

test('buildStyledTableHtml builds valid HTML tables with requested dimensions and theme classes', () => {
  const html = buildStyledTableHtml(4, 3, 'amber', true);
  assert.ok(html.includes('class="cms-table cms-table-amber"'));
  assert.equal((html.match(/<th>/g) || []).length, 3);
  // 4 total rows with header = 1 header row + 3 body rows = 9 <td> cells
  assert.equal((html.match(/<td>/g) || []).length, 9);

  const noHeaderHtml = buildStyledTableHtml(2, 2, 'teal', false);
  assert.equal(noHeaderHtml.includes('<thead>'), false);
  assert.equal((noHeaderHtml.match(/<td>/g) || []).length, 4);
});

test('buildStyledTableHtml clamps out-of-range dimensions safely', () => {
  const clamped = buildStyledTableHtml(99, 0, 'navy', true);
  assert.equal((clamped.match(/<th>/g) || []).length, 1);
  assert.equal((clamped.match(/<tr>/g) || []).length, 20);
});

test('swapTableThemeInHtml swaps table color theme cleanly without stripping rows', () => {
  const original = buildStyledTableHtml(3, 2, 'navy', true);
  const updated = swapTableThemeInHtml(original, 'emerald');
  assert.ok(updated.includes('cms-table-emerald'));
  assert.equal(updated.includes('cms-table-navy'), false);

  const plainTable = '<table><thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>';
  const styledPlain = swapTableThemeInHtml(plainTable, 'slate');
  assert.ok(styledPlain.includes('class="cms-table cms-table-slate"'));
});

test('EDITOR_COMPONENT_BLOCKS exposes distinct graphical HTML components across categories', () => {
  assert.ok(EDITOR_COMPONENT_BLOCKS.length >= 10);
  assert.ok(TABLE_THEMES.length >= 6);
  const ids = new Set(EDITOR_COMPONENT_BLOCKS.map((b) => b.id));
  assert.equal(ids.size, EDITOR_COMPONENT_BLOCKS.length);
  for (const block of EDITOR_COMPONENT_BLOCKS) {
    assert.ok(block.html.includes('data-block='), `Missing data-block attribute on ${block.id}`);
    assert.ok(block.title.length > 3);
  }
  assert.ok(ids.has('custom-slider'));
  assert.ok(ids.has('photo-profile-card'));
});

test('buildCustomSliderHtml generates interactive slider markup, sanitizes unsafe URLs, and clamps options', () => {
  const html = buildCustomSliderHtml(
    [
      {
        id: '1',
        imageUrl: 'javascript:alert(1)',
        title: 'AI & Robotics Symposium',
        caption: 'Keynote & Technical Sessions',
        ctaLabel: 'Register',
        ctaLink: 'javascript:evil()',
      },
      {
        id: '2',
        imageUrl: '/uploads/campus.jpg',
        title: 'IEEE Conference Track',
        caption: 'Accepted papers archived in Scopus',
        ctaLabel: 'Submit Paper',
        ctaLink: '/conferences',
      },
    ],
    { heightPx: 999, autoplaySec: 7 },
  );
  assert.ok(html.includes('data-block="custom-slider"'));
  assert.ok(html.includes('data-autoplay="7"'));
  assert.ok(html.includes('height:620px;'));
  assert.equal(html.includes('javascript:'), false);
  assert.equal((html.match(/data-slide-to="/g) || []).length, 2);
  assert.ok(html.includes('href="/conferences"'));
});

test('buildPhotoProfileCardHtml renders portrait card HTML safely in 1 and 2 column layouts', () => {
  const single = buildPhotoProfileCardHtml({
    roleBadge: 'Statutory Officer',
    name: 'Dr. Test <Faculty>',
    designation: 'Professor',
    email: 'test@coe.sveri.ac.in',
    phone: '+91-99999',
    photoUrl: 'javascript:alert(1)',
    columns: 1,
  });
  assert.ok(single.includes('data-block="photo-profile-card"'));
  assert.ok(single.includes('Dr. Test &lt;Faculty&gt;'));
  assert.equal(single.includes('javascript:'), false);

  const dual = buildPhotoProfileCardHtml({
    roleBadge: 'Committee',
    name: 'Dr. Member',
    designation: 'Member',
    columns: 2,
  });
  assert.ok(dual.includes('cms-grid-2'));
  assert.equal((dual.match(/class="cms-photo-profile-card"/g) || []).length, 2);
});

