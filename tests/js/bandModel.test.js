/**
 * Tests for the editor preview model (bandModel.js).
 *
 * Run with: npm test  (or: node --test 'tests/js/*.test.js')
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { computeBars, formatNumber, parseBand, PLUGIN_NAME } from '../../bandModel.js';

test('plugin name matches prosemirror data-pluginname', () => {
    assert.equal(PLUGIN_NAME, 'plugin_couleur');
});

test('parses a band without percussion', () => {
    assert.deepEqual(parseBand('<band red blue>'), { perkussion: null, colors: ['red', 'blue'] });
});

test('parses a band with percussion', () => {
    assert.deepEqual(
        parseBand('<band:silver white #6B841A black white>'),
        { perkussion: 'silver', colors: ['white', '#6B841A', 'black', 'white'] },
    );
});

test('collapses repeated whitespace', () => {
    assert.deepEqual(parseBand('<band:red    white   blue>'), { perkussion: 'red', colors: ['white', 'blue'] });
});

test('rejects invalid tags', () => {
    for (const input of ['<band>', '<band:>', '<band red>', '<bandana>', 'plain text', '', '<band red blue']) {
        assert.equal(parseBand(input), null, `should reject: ${JSON.stringify(input)}`);
    }
});

test('allows at most 20 colors', () => {
    assert.notEqual(parseBand(`<band ${Array(20).fill('red').join(' ')}>`), null);
    assert.equal(parseBand(`<band ${Array(21).fill('red').join(' ')}>`), null);
});

test('keeps injection payloads as literal color values', () => {
    // A payload containing spaces is simply split into ordinary color tokens;
    // rendering then sets attributes only, so nothing can become markup.
    const band = parseBand("<band x' onload='alert(1) red blue>");
    assert.notEqual(band, null);
    assert.deepEqual(band.colors, ["x'", "onload='alert(1)", 'red', 'blue']);
});

test('rejects payloads that break the tag structure', () => {
    for (const input of [
        "<band:silver'/><script>alert(1)</script> red blue>",
        '<band red>blue>',
        '<band</band>',
    ]) {
        assert.equal(parseBand(input), null, `should reject: ${input}`);
    }
});

test('rejects payloads that break the tag structure', () => {
    for (const input of [
        "<band:silver'/><script>alert(1)</script> red blue>",
        '<band red>blue>',
        '<band</band>',
    ]) {
        assert.equal(parseBand(input), null, `should reject: ${input}`);
    }
});

test('even bars for two and three colors', () => {
    assert.deepEqual(computeBars(['a', 'b']), [
        { y: 0, height: 100, color: 'a' },
        { y: 100, height: 100, color: 'b' },
    ]);
    assert.deepEqual(computeBars(['a', 'b', 'c']), [
        { y: 0, height: 66.67, color: 'a' },
        { y: 66.67, height: 66.67, color: 'b' },
        { y: 133.34, height: 66.67, color: 'c' },
    ]);
});

test('centered bars for more than three colors', () => {
    assert.deepEqual(computeBars(['a', 'b', 'c', 'd', 'e']), [
        { y: 0, height: 25, color: 'a' },
        { y: 25, height: 50, color: 'b' },
        { y: 75, height: 50, color: 'c' },
        { y: 125, height: 50, color: 'd' },
        { y: 175, height: 25, color: 'e' },
    ]);
});

test('bars fill the full height within rounding tolerance', () => {
    // syntax.php rounds each bar height to two decimals, so the sum can be off
    // by a fraction of a pixel for some color counts (e.g. 3 x 66.67 = 200.01).
    // The preview must reproduce exactly the same values.
    for (let count = 2; count <= 20; count++) {
        const bars = computeBars(Array.from({ length: count }, (_, i) => `c${i}`));
        const last = bars[bars.length - 1];
        const bottom = Math.round((last.y + last.height) * 100) / 100;
        assert.ok(Math.abs(bottom - 200) <= 0.1, `${count} colors: bottom edge at ${bottom}`);
    }
});

test('bar geometry matches syntax.php', () => {
    // Values captured from the PHP implementation.
    assert.deepEqual(
        computeBars(['red', 'white', 'blue']).map((b) => [b.y, b.height]),
        [[0, 66.67], [66.67, 66.67], [133.34, 66.67]],
    );
    assert.deepEqual(
        computeBars(['white', '#6B841A', 'black', 'white']).map((b) => [b.y, b.height]),
        [[0, 33.34], [33.34, 66.67], [100.01, 66.67], [166.68, 33.34]],
    );
});

test('formatNumber avoids trailing zeros and negative zero', () => {
    assert.equal(formatNumber(100), '100');
    assert.equal(formatNumber(66.67), '66.67');
    assert.equal(formatNumber(-0), '0');
    assert.equal(formatNumber(0), '0');
});
