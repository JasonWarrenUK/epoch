import { describe, it, expect } from 'vitest';
import {
	cleanCitations,
	isSectionLeak,
	isDateOnly,
	hasMalformedMarkup,
	isMostlyNumeric,
	isTooFewWords,
	isTooShort,
	filterEventText,
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
