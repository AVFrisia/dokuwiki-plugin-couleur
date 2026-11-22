/**
 * DokuWiki Plugin couleur: live preview inside the ProseMirror WYSIWYG editor.
 *
 * Integrates with the optional prosemirror plugin
 * (https://www.dokuwiki.org/plugin:prosemirror). When that editor is active, a
 * `<band:...>` tag is displayed as the rendered SVG band instead of the generic
 * `dwplugin_block` / `dwplugin_inline` placeholder.
 *
 * Only the *view* is changed: the ProseMirror document model keeps the raw
 * markup, so saving remains byte-identical and cannot be corrupted by this
 * script. If the prosemirror plugin is not installed, nothing happens.
 *
 * DokuWiki concatenates this file into lib/exe/js.php and loads it in the
 * <head>, so it must not touch the DOM at load time and must not rely on the
 * plugin's directory name (that is why bandModel.js is inlined below).
 *
 * @license GPL 2 http://www.gnu.org/licenses/gpl-2.0.html
 */

/* DOKUWIKI:include bandModel.js */

(function () {
    'use strict';

    var model = globalThis;
    if (!model || typeof model.parseBand !== 'function') return;

    var PLUGIN_NAME = model.PLUGIN_NAME;
    var SVG_NS = 'http://www.w3.org/2000/svg';

    /**
     * A `<band:...>` block or inline placeholder.
     *
     * @param {object} node ProseMirror node
     * @param {boolean} inline
     */
    function createCouleurView(node, inline) {
        var dom = document.createElement(inline ? 'span' : 'div');
        dom.className = 'plugin_couleur';

        var preview = document.createElement('span');
        preview.className = 'plugin_couleur__preview';
        dom.appendChild(preview);

        var syntax = document.createElement('code');
        syntax.className = 'plugin_couleur__syntax';
        dom.appendChild(syntax);

        // ProseMirror requires a contentDOM for nodes with content. The raw
        // markup lives here; it is hidden via style.css.
        var contentDOM = document.createElement('span');
        contentDOM.className = 'plugin_couleur__source';
        dom.appendChild(contentDOM);

        function render(text) {
            while (preview.firstChild) preview.removeChild(preview.firstChild);
            syntax.textContent = text;

            var band = model.parseBand(text);
            if (!band) {
                var error = document.createElement('em');
                error.className = 'plugin_couleur__invalid';
                error.textContent = 'Ungültiger <band>-Befehl';
                preview.appendChild(error);
                return;
            }

            preview.appendChild(model.renderBandSvg(band, SVG_NS, document));
        }

        render(node.textContent);

        return {
            dom: dom,
            contentDOM: contentDOM,
            update: function (other) {
                var attrs = other.attrs || {};
                if (other.type !== node.type) return false;
                if (attrs['data-pluginname'] !== PLUGIN_NAME) return false;
                render(other.textContent);
                return true;
            },
        };
    }

    /**
     * Default view for all other syntax plugins, mirroring prosemirror's own
     * rendering so that we do not change their appearance.
     *
     * @param {object} node ProseMirror node
     * @param {boolean} inline
     */
    function createDefaultView(node, inline) {
        var attrs = node.attrs || {};
        // prosemirror uses <pre class="dwplugin"> for blocks and a <code>
        // element for inline plugin markup.
        var dom = document.createElement(inline ? 'code' : 'pre');
        dom.className = inline ? '' : 'dwplugin';
        Object.keys(attrs).forEach(function (key) {
            if (!inline || key === 'class' || key === 'data-pluginname') {
                dom.setAttribute(key, attrs[key]);
            }
        });

        var contentDOM = document.createElement('span');
        dom.appendChild(contentDOM);

        return {
            dom: dom,
            contentDOM: contentDOM,
            update: function (other) {
                var otherAttrs = other.attrs || {};
                if (other.type !== node.type) return false;
                return otherAttrs['data-pluginname'] === attrs['data-pluginname'];
            },
        };
    }

    /**
     * Register our NodeViews with the prosemirror plugin.
     */
    function register() {
        var api = window.Prosemirror;
        if (!api || !api.pluginNodeViews) return;

        api.pluginNodeViews.dwplugin_block = function (node) {
            if ((node.attrs || {})['data-pluginname'] === PLUGIN_NAME) {
                return createCouleurView(node, false);
            }
            return createDefaultView(node, false);
        };

        api.pluginNodeViews.dwplugin_inline = function (node) {
            if ((node.attrs || {})['data-pluginname'] === PLUGIN_NAME) {
                return createCouleurView(node, true);
            }
            // Leave other plugins to prosemirror's built-in PluginInlineView.
            return null;
        };
    }

    // The prosemirror plugin recreates window.Prosemirror for every editor it
    // starts and announces that with PROSEMIRROR_API_INITIALIZED.
    if (window.Prosemirror) register();
    if (window.jQuery) {
        window.jQuery(document).on('PROSEMIRROR_API_INITIALIZED', register);
    }
}());
