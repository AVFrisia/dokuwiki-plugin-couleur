/**
 * Guards the DokuWiki integration contract for script.js.
 *
 * DokuWiki concatenates plugin scripts into lib/exe/js.php and expands
 * `DOKUWIKI:include` directives relative to the plugin's real directory, so the
 * script must not reference its own path and must work without the DOM being
 * parsed yet. This is what broke the first version of the editor preview.
 *
 * Run with: npm test
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const scriptPath = resolve(root, 'script.js');

/** Replicates js_load() from DokuWiki's lib/exe/js.php. */
function expandIncludes(file, seen = new Set()) {
    let data = readFileSync(file, 'utf8');
    const pattern = /\/\*\s*DOKUWIKI:include(_once)?\s+([\w.\-_/]+)\s*\*\//;
    let match;
    while ((match = pattern.exec(data))) {
        let include = match[2];
        if (include[0] !== '/') include = `${dirname(file)}/${include}`;
        include = resolve(include);
        const content = seen.has(include) ? '' : readFileSync(include, 'utf8');
        seen.add(include);
        data = data.replace(match[0], () => content);
    }
    return data;
}

/** Minimal DOM good enough for the NodeViews. */
function fakeDocument() {
    const element = (tag) => ({
        tag,
        attrs: {},
        children: [],
        className: '',
        textContent: '',
        setAttribute(key, value) {
            this.attrs[key] = String(value);
        },
        appendChild(child) {
            this.children.push(child);
            return child;
        },
        get firstChild() {
            return this.children[0];
        },
        removeChild(child) {
            this.children.splice(this.children.indexOf(child), 1);
        },
    });
    return {
        createElement: element,
        createElementNS: (_ns, tag) => element(tag),
    };
}

/** Build a sandbox the way a browser would see the concatenated script. */
function runBundle() {
    const handlers = {};
    const jQuery = () => ({ on: (event, handler) => { (handlers[event] ??= []).push(handler); } });
    const document = fakeDocument();
    const window = { jQuery, location: { href: 'http://example.test/doku.php' } };
    window.window = window;
    const sandbox = { window, document, jQuery, console };
    sandbox.globalThis = window;

    // eslint-disable-next-line no-new-func
    new Function('window', 'document', 'jQuery', 'console', 'globalThis', expandIncludes(scriptPath))(
        sandbox.window, sandbox.document, sandbox.jQuery, sandbox.console, sandbox.globalThis,
    );

    const init = () => {
        const api = { pluginNodeViews: {} };
        window.Prosemirror = api;
        (handlers.PROSEMIRROR_API_INITIALIZED || []).forEach((handler) => handler());
        return api;
    };

    return { window, init };
}

test('include directives resolve relative to the plugin directory', () => {
    const bundle = expandIncludes(scriptPath);
    assert.doesNotMatch(bundle, /DOKUWIKI:include/);
    assert.match(bundle, /function parseBand/);
});

test('the concatenated script is valid and never touches the DOM on load', () => {
    // runBundle() would throw if the script queried elements at load time.
    assert.doesNotThrow(() => runBundle());
});

test('registers NodeViews when the editor announces its API', () => {
    const { init } = runBundle();
    const api = init();
    assert.equal(typeof api.pluginNodeViews.dwplugin_block, 'function');
    assert.equal(typeof api.pluginNodeViews.dwplugin_inline, 'function');
});

test('renders a couleur block as SVG and keeps the raw markup as content', () => {
    const { init } = runBundle();
    const api = init();
    const node = {
        type: 'dwplugin_block',
        attrs: { class: 'dwplugin', 'data-pluginname': 'plugin_couleur' },
        textContent: '<band:silver white #6B841A black white>',
    };

    const view = api.pluginNodeViews.dwplugin_block(node);
    const svg = view.dom.children[0].children[0];
    assert.equal(svg.tag, 'svg');
    assert.equal(svg.children.filter((child) => child.tag === 'rect').length, 4);
    assert.equal(svg.children.filter((child) => child.tag === 'line').length, 2);
    assert.equal(view.dom.children[1].textContent, node.textContent);
    assert.ok(view.contentDOM, 'ProseMirror needs a contentDOM');
});

test('leaves other plugins untouched', () => {
    const { init } = runBundle();
    const api = init();
    const other = { type: 'dwplugin_block', attrs: { 'data-pluginname': 'plugin_other' }, textContent: 'x' };

    const block = api.pluginNodeViews.dwplugin_block(other);
    assert.equal(block.dom.tag, 'pre');
    assert.equal(block.dom.className, 'dwplugin');

    // null tells prosemirror to use its own inline NodeView.
    assert.equal(api.pluginNodeViews.dwplugin_inline(other), null);
});

test('shows a hint for invalid bands instead of throwing', () => {
    const { init } = runBundle();
    const api = init();
    const node = { type: 'dwplugin_block', attrs: { 'data-pluginname': 'plugin_couleur' }, textContent: '<band>' };

    const view = api.pluginNodeViews.dwplugin_block(node);
    assert.equal(view.dom.children[0].children[0].tag, 'em');
});
