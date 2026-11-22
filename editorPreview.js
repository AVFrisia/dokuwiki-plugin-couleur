/**
 * DokuWiki Plugin couleur: live preview inside the ProseMirror WYSIWYG editor.
 *
 * Integrates with the optional prosemirror plugin
 * (https://www.dokuwiki.org/plugin:prosemirror). When that editor is active, a
 * `<band:...>` tag is displayed as the rendered SVG band instead of the generic
 * `dwplugin_block` placeholder.
 *
 * Only the *view* is changed: the ProseMirror document model keeps the raw
 * markup, so saving remains byte-identical and cannot be corrupted by this
 * script. If the prosemirror plugin is not installed, nothing happens.
 *
 * @license GPL 2 http://www.gnu.org/licenses/gpl-2.0.html
 */

import { parseBand, renderBandSvg, PLUGIN_NAME } from './bandModel.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Build the fallback view used by all other syntax plugins.
 *
 * This mirrors prosemirror's own default: a `<pre class="dwplugin">` holding the
 * raw markup. Block plugin nodes have no NodeView by default in prosemirror, so
 * we have to provide one in order to take over only our own nodes.
 *
 * @param {object} node ProseMirror node
 * @returns {{dom: HTMLElement, contentDOM: HTMLElement, update: (node: object) => boolean}}
 */
function createDefaultView(node) {
    const pluginName = (node.attrs || {})['data-pluginname'];
    const dom = document.createElement('pre');
    dom.className = 'dwplugin';
    Object.entries(node.attrs || {}).forEach(([key, value]) => {
        dom.setAttribute(key, value);
    });

    const contentDOM = document.createElement('span');
    dom.appendChild(contentDOM);

    return {
        dom,
        contentDOM,
        update(other) {
            if (other.type !== node.type) return false;
            if ((other.attrs || {})['data-pluginname'] !== pluginName) return false;
            dom.setAttribute('class', 'dwplugin');
            return true;
        },
    };
}

/**
 * Create the NodeView for a couleur `<band:...>` block.
 *
 * @param {object} node ProseMirror node
 */
function createCouleurView(node) {
    const dom = document.createElement('div');
    dom.className = 'plugin_couleur';

    const preview = document.createElement('div');
    preview.className = 'plugin_couleur__preview';
    dom.appendChild(preview);

    const syntax = document.createElement('code');
    syntax.className = 'plugin_couleur__syntax';
    dom.appendChild(syntax);

    // ProseMirror requires a contentDOM for nodes with content. The raw markup
    // lives here; it is visually hidden via style.css.
    const contentDOM = document.createElement('span');
    contentDOM.className = 'plugin_couleur__source';
    dom.appendChild(contentDOM);

    const render = (text) => {
        preview.replaceChildren();
        syntax.textContent = text;

        const band = parseBand(text);
        if (!band) {
            const error = document.createElement('em');
            error.className = 'plugin_couleur__invalid';
            error.textContent = 'Ungültiger <band>-Befehl';
            preview.appendChild(error);
            return;
        }

        preview.appendChild(renderBandSvg(band, SVG_NS, document));
    };

    render(node.textContent);

    return {
        dom,
        contentDOM,
        update(other) {
            if (other.type !== node.type) return false;
            if ((other.attrs || {})['data-pluginname'] !== PLUGIN_NAME) return false;
            render(other.textContent);
            return true;
        },
    };
}

/**
 * Register the NodeView with the prosemirror plugin.
 */
function register() {
    const api = window.Prosemirror;
    if (!api || !api.pluginNodeViews) return;

    api.pluginNodeViews.dwplugin_block = (node) => {
        if ((node.attrs || {})['data-pluginname'] === PLUGIN_NAME) {
            return createCouleurView(node);
        }
        return createDefaultView(node);
    };
}

/**
 * Start listening for the editor.
 *
 * The prosemirror plugin recreates `window.Prosemirror` every time an editor is
 * initialised and announces that with `PROSEMIRROR_API_INITIALIZED`, so the
 * handler stays registered.
 */
export function boot() {
    if (window.Prosemirror) register();

    if (typeof window.jQuery === 'function') {
        window.jQuery(document).on('PROSEMIRROR_API_INITIALIZED', register);
    }
}
