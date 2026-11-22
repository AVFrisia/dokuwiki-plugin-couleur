/**
 * DokuWiki Plugin couleur: live preview inside the ProseMirror WYSIWYG editor.
 *
 * DokuWiki loads plugin `script.js` as a classic script, so the ES-module
 * implementation is imported dynamically (matching how the prosemirror plugin
 * itself loads its modules).
 *
 * @license GPL 2 http://www.gnu.org/licenses/gpl-2.0.html
 */
(function () {
    'use strict';

    // Only relevant on pages where the editor plugin is present.
    if (!document.querySelector('[name=prosemirror_json]')) return;

    var base = (window.DOKU_BASE || '/') + 'lib/plugins/couleur/';
    import(base + 'editorPreview.js').then(function (module) {
        module.boot();
    }).catch(function (error) {
        // A preview must never break editing.
        if (window.console) console.error('[couleur] editor preview failed to load', error);
    });
})();
