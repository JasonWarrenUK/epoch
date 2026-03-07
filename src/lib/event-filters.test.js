import { describe, it, expect } from 'vitest';
import {
	cleanCitations,
	isSectionLeak,
	isDateOnly,
	hasMalformedMarkup,
	isMostlyNumeric,
	isTooFewWords,
	isTooShort,
	isSportsEvent,
	filterEventText,
	scoreSignificance,
	hasNamedEventPrefix,
	detectCategory,
} from './event-filters.js';

// ── cleanCitations ───────────────────────────────────────────────

describe('cleanCitations', () => {
	it('strips numeric references', () => {
		expect(cleanCitations('The battle began[1] at dawn[2]')).toBe('The battle began at dawn');
	});

	it('strips single-letter references', () => {
		expect(cleanCitations('Treaty signed[a] in Paris')).toBe('Treaty signed in Paris');
	});

	it('strips [citation needed]', () => {
		expect(cleanCitations('Event happened[citation needed] here')).toBe('Event happened here');
	});

	it('strips [note N]', () => {
		expect(cleanCitations('Event[note 3] occurred')).toBe('Event occurred');
	});

	it('normalises whitespace after stripping', () => {
		expect(cleanCitations('A [1]  [2] B')).toBe('A B');
	});

	it('returns unchanged text when no citations', () => {
		expect(cleanCitations('Normal event text')).toBe('Normal event text');
	});
});

// ── isSectionLeak ────────────────────────────────────────────────

describe('isSectionLeak', () => {
	it.each([
		'Born: John Smith',
		'Deaths – various people',
		'Died: Jane Doe, age 80',
		'Birth: Edward I',
		'References: see below',
		'See also: related events',
		'Notes: additional info',
		'Sources: primary',
		'Bibliography: main works',
		'Obituaries – notable',
	])('rejects "%s"', (text) => {
		expect(isSectionLeak(text)).toBe(true);
	});

	it('passes event text that mentions birth naturally', () => {
		expect(isSectionLeak('The king was born in London')).toBe(false);
	});

	it('passes normal event text', () => {
		expect(isSectionLeak('Parliament passes the Reform Act')).toBe(false);
	});
});

// ── isDateOnly ───────────────────────────────────────────────────

describe('isDateOnly', () => {
	it.each([
		'January 15 –',
		'March 3 -',
		'July 22 —',
		'December 1',
		'February 28 – ',
	])('rejects "%s"', (text) => {
		expect(isDateOnly(text)).toBe(true);
	});

	it('passes date with event content', () => {
		expect(isDateOnly('January 15 – The Battle of Hastings begins')).toBe(false);
	});
});

// ── hasMalformedMarkup ───────────────────────────────────────────

describe('hasMalformedMarkup', () => {
	it('rejects text with curly braces', () => {
		expect(hasMalformedMarkup('Event {template} leftover')).toBe(true);
	});

	it('rejects text with multiple pipes (table remnant)', () => {
		expect(hasMalformedMarkup('Score 3|2|1')).toBe(true);
	});

	it('rejects text with many brackets', () => {
		expect(hasMalformedMarkup('Text [a] [b] [c]')).toBe(true);
	});

	it('passes normal text', () => {
		expect(hasMalformedMarkup('The English Parliament passes the Reform Act')).toBe(false);
	});

	it('passes text with one pipe', () => {
		expect(hasMalformedMarkup('Either this | or that happened')).toBe(false);
	});
});

// ── isMostlyNumeric ──────────────────────────────────────────────

describe('isMostlyNumeric', () => {
	it('rejects numeric strings', () => {
		expect(isMostlyNumeric('3-2, 5-1, 4-0')).toBe(true);
	});

	it('rejects empty string', () => {
		expect(isMostlyNumeric('')).toBe(true);
	});

	it('passes normal event with a year', () => {
		expect(isMostlyNumeric('1066 Battle of Hastings')).toBe(false);
	});
});

// ── isTooFewWords ────────────────────────────────────────────────

describe('isTooFewWords', () => {
	it('rejects short fragments', () => {
		expect(isTooFewWords('John Smith dies')).toBe(true);
	});

	it('rejects date-prefixed short entries', () => {
		expect(isTooFewWords('January 15 – Big fire')).toBe(true);
	});

	it('passes entries with enough words', () => {
		expect(isTooFewWords('The treaty was signed in Paris')).toBe(false);
	});

	it('passes date-prefixed entries with enough content', () => {
		expect(isTooFewWords('January 15 – The king signs the treaty')).toBe(false);
	});
});

// ── isTooShort ───────────────────────────────────────────────────

describe('isTooShort', () => {
	it('rejects text under 20 chars', () => {
		expect(isTooShort('Short text here')).toBe(true);
	});

	it('passes text at 20+ chars', () => {
		expect(isTooShort('This is exactly twenty!')).toBe(false);
	});
});

// ── isSportsEvent ────────────────────────────────────────────────

describe('isSportsEvent', () => {
	it.each([
		'England wins the cricket match against Australia',
		'The first football game is played at Wembley',
		'Annual horse racing event at Ascot begins',
		'The Grand Prix takes place in Silverstone',
		'Olympic Games open in London with great fanfare',
		'FA Cup final between two London clubs at the stadium',
		'The rugby tournament concludes in Edinburgh today',
		'Tennis championship held at Wimbledon this summer',
	])('rejects "%s"', (text) => {
		expect(isSportsEvent(text)).toBe(true);
	});

	it('passes non-sports events', () => {
		expect(isSportsEvent('The English Parliament passes the Reform Act')).toBe(false);
	});

	it('passes events mentioning sport-adjacent words in non-sport context', () => {
		expect(isSportsEvent('The king held a grand tournament for the knights')).toBe(false);
	});
});

// ── hasNamedEventPrefix ─────────────────────────────────────────

describe('hasNamedEventPrefix', () => {
	it.each([
		'Gunpowder Plot: Five Catholic conspirators are arrested',
		'Great Fire of London: The fire begins in Pudding Lane',
		'English Civil War: King Charles raises his standard',
		"Nine Years' War: The Grand Alliance is formed",
		'Peace of Westphalia – The treaties are signed',
	])('detects named event in "%s"', (text) => {
		expect(hasNamedEventPrefix(text)).toBe(true);
	});

	it.each([
		'The king signs a treaty in Paris with great ceremony',
		'A fire breaks out in the capital city of London',
		'January 15 – A major battle takes place at dawn',
		'Parliament is dissolved by royal decree today',
	])('does not match plain sentence "%s"', (text) => {
		expect(hasNamedEventPrefix(text)).toBe(false);
	});
});

// ── detectCategory ──────────────────────────────────────────────

describe('detectCategory', () => {
	it('detects conflict category', () => {
		expect(detectCategory('The war breaks out between nations')).toBe('conflict');
	});

	it('detects upheaval category', () => {
		expect(detectCategory('A revolution overthrows the government')).toBe('upheaval');
	});

	it('detects political category', () => {
		expect(detectCategory('The coronation of King Charles takes place')).toBe('political');
	});

	it('detects disaster category', () => {
		expect(detectCategory('A great famine strikes the entire region')).toBe('disaster');
	});

	it('detects cultural category', () => {
		expect(detectCategory('A new university is founded in the city')).toBe('cultural');
	});

	it('returns highest-weight category when multiple match', () => {
		// "war" is tier-1 conflict, "treaty" is tier-2 political
		expect(detectCategory('The war ends with a treaty signed')).toBe('conflict');
	});

	it('returns null for no keyword match', () => {
		expect(detectCategory('A minor local event happens here')).toBeNull();
	});
});

// ── scoreSignificance ────────────────────────────────────────────

describe('scoreSignificance', () => {
	it('returns near-zero for no links, short text, no keywords', () => {
		// Only length score: (24/200) * 0.15 ≈ 0.018
		const score = scoreSignificance('A minor local event here', 0);
		expect(score).toBeCloseTo(0.018, 2);
	});

	it('scores higher with more links', () => {
		const text = 'A treaty is signed between two nations in the capital';
		const low = scoreSignificance(text, 1);
		const high = scoreSignificance(text, 6);
		expect(high).toBeGreaterThan(low);
	});

	it('scores higher with significant keywords', () => {
		const noKeyword = scoreSignificance('The new bridge is opened across the river', 2);
		const withKeyword = scoreSignificance('A revolution breaks out in the capital city', 2);
		expect(withKeyword).toBeGreaterThan(noKeyword);
	});

	it('accumulates keyword scores across tiers', () => {
		const oneTier = scoreSignificance('The battle raged on across the land and hills', 2);
		const twoTiers = scoreSignificance('The battle ended with a treaty signed at dawn', 2);
		expect(twoTiers).toBeGreaterThan(oneTier);
	});

	it('caps link score at maxLinks (default 10)', () => {
		const at10 = scoreSignificance('Some event text for testing', 10);
		const at20 = scoreSignificance('Some event text for testing', 20);
		expect(at10).toBeCloseTo(at20, 5);
	});

	it('supports dynamic link cap via opts.maxLinks', () => {
		// With maxLinks=4, 4 links saturates; with default (10), it does not
		const withDynamic = scoreSignificance('Some event text for testing', 4, { maxLinks: 4 });
		const withDefault = scoreSignificance('Some event text for testing', 4);
		expect(withDynamic).toBeGreaterThan(withDefault);
	});

	it('returns a value between 0 and 1', () => {
		const score = scoreSignificance('The war begins with a massive invasion of the territory', 8);
		expect(score).toBeGreaterThanOrEqual(0);
		expect(score).toBeLessThanOrEqual(1);
	});

	it('named events score higher than unnamed events', () => {
		const named = scoreSignificance('English Civil War: The king raises his standard at Nottingham', 4);
		const unnamed = scoreSignificance('The king raises his standard at Nottingham during the conflict', 4);
		expect(named).toBeGreaterThan(unnamed);
	});

	it('parent events score higher than child events', () => {
		const parent = scoreSignificance(
			'Second Anglo-Dutch War: Major conflict between England and Netherlands',
			3,
			{ isParent: true, childCount: 4 },
		);
		const child = scoreSignificance(
			'Admiral Crijnssen arrives at Surinam with a fleet',
			2,
			{ isChild: true },
		);
		expect(parent).toBeGreaterThan(child);
	});

	it('child events receive 0.5x penalty', () => {
		const text = 'A significant battle takes place in the northern territory';
		const normal = scoreSignificance(text, 3);
		const asChild = scoreSignificance(text, 3, { isChild: true });
		expect(asChild).toBeCloseTo(normal * 0.5, 5);
	});

	it('parent structure score scales with child count', () => {
		const text = 'A major war breaks out across the continent and beyond';
		const fewChildren = scoreSignificance(text, 3, { isParent: true, childCount: 1 });
		const manyChildren = scoreSignificance(text, 3, { isParent: true, childCount: 5 });
		expect(manyChildren).toBeGreaterThan(fewChildren);
	});
});

// ── filterEventText (pipeline) ───────────────────────────────────

describe('filterEventText', () => {
	it('returns null for section leaks', () => {
		expect(filterEventText('Born: Edward I of England')).toBeNull();
	});

	it('returns null for date-only entries', () => {
		expect(filterEventText('January 15 –')).toBeNull();
	});

	it('returns null for malformed markup', () => {
		expect(filterEventText('Event with {template} leftover text here')).toBeNull();
	});

	it('returns null for mostly numeric entries', () => {
		expect(filterEventText('3-2, 5-1, 4-0, 2-1, 6-3')).toBeNull();
	});

	it('returns null for too-few-word entries', () => {
		expect(filterEventText('John Smith dies')).toBeNull();
	});

	it('returns null for very short entries', () => {
		expect(filterEventText('Fire in London')).toBeNull();
	});

	it('returns null for sports events', () => {
		expect(filterEventText('England wins the cricket match against Australia at Lords')).toBeNull();
	});

	it('returns null when text is only citations', () => {
		expect(filterEventText('[1][2][3]')).toBeNull();
	});

	it('cleans citations and returns text for good entries', () => {
		expect(filterEventText('The Battle of Hastings[1] begins in southern England'))
			.toBe('The Battle of Hastings begins in southern England');
	});

	it('passes well-formed historical events unchanged', () => {
		const text = 'The English Parliament passes the Reform Act';
		expect(filterEventText(text)).toBe(text);
	});

	it('passes events with a date prefix and sufficient content', () => {
		const text = 'January 15 – The king signs the peace treaty in Westminster';
		expect(filterEventText(text)).toBe(text);
	});
});
