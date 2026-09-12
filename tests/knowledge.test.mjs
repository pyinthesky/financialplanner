import assert from 'node:assert/strict';
import test from 'node:test';
import { findGuides, KNOWLEDGE_GUIDES, KNOWLEDGE_CATEGORIES, KNOWLEDGE_REVIEWED } from '../lib/knowledge.ts';

test('knowledge search supports ordinary words, source names and whitespace without changing the library', () => {
  const before = JSON.stringify(KNOWLEDGE_GUIDES);
  assert.deepEqual(findGuides('  IAPD  ').map(g => g.id), ['advisor-fees']);
  assert.deepEqual(findGuides('SNOWBALL\n escrow').map(g => g.id), ['debt-cascade']);
  assert.deepEqual(findGuides('madeup-nonexistent-topic'), []);
  assert.deepEqual(findGuides('  '), KNOWLEDGE_GUIDES);
  assert.equal(JSON.stringify(KNOWLEDGE_GUIDES), before);
});

test('topic filtering intersects the search and clearing restores the full library', () => {
  assert.deepEqual(findGuides('IAPD', 'Health & Benefits'), []);
  assert.deepEqual(findGuides('IAPD', 'Investing').map(g => g.id), ['advisor-fees']);
  const health = findGuides('', 'Health & Benefits');
  assert.ok(health.length > 0);
  assert.ok(health.every(g => g.category === 'Health & Benefits'));
  assert.equal(findGuides('').length, KNOWLEDGE_GUIDES.length);
});

test('every guide has a stable identity, practical next step and dated official sources', () => {
  assert.equal(new Set(KNOWLEDGE_GUIDES.map(g => g.id)).size, KNOWLEDGE_GUIDES.length);
  assert.match(KNOWLEDGE_REVIEWED, /^\d{4}-\d{2}-\d{2}$/);
  const hosts = new Set(['www.consumerfinance.gov', 'adviserinfo.sec.gov', 'www.investor.gov', 'www.healthcare.gov', 'www.cms.gov', 'www.irs.gov', 'www.ssa.gov', 'www.nia.nih.gov', 'www.cdc.gov']);
  for (const guide of KNOWLEDGE_GUIDES) {
    assert.ok(KNOWLEDGE_CATEGORIES.includes(guide.category));
    assert.ok(guide.title && guide.summary && guide.next && guide.inPlanner);
    assert.ok(guide.points.length && guide.sources.length);
    for (const source of guide.sources) {
      const url = new URL(source.url);
      assert.equal(url.protocol, 'https:');
      assert.ok(hosts.has(url.hostname), source.url);
      assert.equal(url.search, '', 'Public source links cannot carry search or plan data');
      assert.equal(url.username + url.password, '');
      assert.ok(source.label && source.edition);
    }
  }
});
