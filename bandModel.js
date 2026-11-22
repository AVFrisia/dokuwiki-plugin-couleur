/**
 * Pure helper functions for the couleur plugin's editor preview.
 *
 * Written as a classic script so DokuWiki can inline it into lib/exe/js.php via
 * the bandModel.js include in script.js. It also exposes its API on globalThis
 * for the Node test runner.
 * No DOM or DokuWiki globals are touched, so the geometry can be compared with
 * `syntax.php` directly.
 *
 * @license GPL 2 http://www.gnu.org/licenses/gpl-2.0.html
 */
(function (exports) {
    'use strict';

    /** Matches prosemirror's `data-pluginname` for this plugin. */
    const PLUGIN_NAME = 'plugin_couleur';

    const WIDTH = 300;
    const HEIGHT = 200;
    const MIN_COLORS = 2;
    const MAX_COLORS = 20;

    /**
     * Same matcher as `connectTo()` in syntax.php.
     */
    const BAND_RE = /^<band(?::[^ >]*)?(?:\s+[^ >]+)*\s*>$/;

    /**
     * Parse `<band:PERCUSSION COLOR1 ... COLORN>`.
     *
     * @param {string} text raw markup as stored in the editor
     * @returns {{perkussion: string|null, colors: string[]}|null} null when invalid
     */
    function parseBand(text) {
        if (typeof text !== 'string') return null;

        const inner = text.trim();
        if (!BAND_RE.test(inner)) return null;

        const args = inner.slice(5, -1).trim().split(/\s+/).filter((arg) => arg !== '');
        if (args.length === 0) return null;

        let perkussion = null;
        if (args[0].startsWith(':')) {
            perkussion = args.shift().replace(/^:+/, '') || null;
        }

        if (args.length < MIN_COLORS || args.length > MAX_COLORS) return null;

        return { perkussion, colors: args };
    }

    /**
     * Round to two decimals like PHP's round() in syntax.php.
     *
     * @param {number} value
     * @returns {number}
     */
    function round2(value) {
        return Math.round(value * 100) / 100;
    }

    /**
     * Format a number without trailing zeros, matching `formatNumber()`.
     *
     * @param {number} value
     * @returns {string}
     */
    function formatNumber(value) {
        let rounded = round2(value);
        if (Object.is(rounded, -0)) rounded = 0;
        return String(rounded);
    }

    /**
     * Compute bar rectangles.
     *
     * @param {string[]} colors
     * @returns {Array<{y: number, height: number, color: string}>}
     */
    function computeBars(colors) {
        const count = colors.length;
        const bars = [];

        if (count > 3) {
            const barHeight = round2(HEIGHT / (count - 1));
            let y = 0;
            colors.forEach((color, index) => {
                const isOutermost = index === 0 || index === count - 1;
                const height = isOutermost ? round2(barHeight / 2) : barHeight;
                bars.push({ y, height, color });
                y = round2(y + height);
            });
            return bars;
        }

        const barHeight = round2(HEIGHT / count);
        colors.forEach((color, index) => {
            bars.push({ y: round2(index * barHeight), height: barHeight, color });
        });
        return bars;
    }

    /**
     * Render the band as an SVG element.
     *
     * All values are set via `setAttribute()`, never via HTML strings, so no
     * value can inject markup regardless of its content.
     *
     * @param {{perkussion: string|null, colors: string[]}} band
     * @param {string} svgNamespace
     * @param {Document} doc
     * @returns {SVGElement}
     */
    function renderBandSvg(band, svgNamespace, doc) {
        const svg = doc.createElementNS(svgNamespace, 'svg');
        svg.setAttribute('xmlns', svgNamespace);
        svg.setAttribute('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);
        svg.setAttribute('style', 'height: auto; width: auto; max-width: 128px;'
            + ' box-shadow: rgba(0, 0, 0, 0.25) 0px 0px 8px;'
            + ' margin: 1em auto; display: block;');

        computeBars(band.colors).forEach((bar) => {
            const rect = doc.createElementNS(svgNamespace, 'rect');
            rect.setAttribute('x', '0');
            rect.setAttribute('y', formatNumber(bar.y));
            rect.setAttribute('width', String(WIDTH));
            rect.setAttribute('height', formatNumber(bar.height));
            rect.setAttribute('fill', bar.color);
            svg.appendChild(rect);
        });

        if (band.perkussion !== null) {
            ['2%', '98%'].forEach((y) => {
                const line = doc.createElementNS(svgNamespace, 'line');
                line.setAttribute('x1', '0');
                line.setAttribute('y1', y);
                line.setAttribute('x2', '100%');
                line.setAttribute('y2', y);
                line.setAttribute('stroke', band.perkussion);
                line.setAttribute('stroke-linecap', 'round');
                line.setAttribute('stroke-width', '4');
                line.setAttribute('stroke-dasharray', '8');
                line.setAttribute('stroke-dashoffset', '6px');
                line.setAttribute('style', 'filter: drop-shadow(0px 0px 1px rgba(0, 0, 0, .5));');
                svg.appendChild(line);
            });
        }

        return svg;
    }

    exports.PLUGIN_NAME = PLUGIN_NAME;
    exports.WIDTH = WIDTH;
    exports.HEIGHT = HEIGHT;
    exports.MIN_COLORS = MIN_COLORS;
    exports.MAX_COLORS = MAX_COLORS;
    exports.parseBand = parseBand;
    exports.formatNumber = formatNumber;
    exports.computeBars = computeBars;
    exports.renderBandSvg = renderBandSvg;
}(typeof globalThis !== 'undefined' ? globalThis : this));
