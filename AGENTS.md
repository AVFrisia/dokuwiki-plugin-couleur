# AGENTS.md

DokuWiki syntax plugin that renders SVG ribbons/flags of European student
fraternities. The entire plugin is `syntax.php`; it emits inline SVG for the
`<band:PERCUSSION COLOR1 ... COLORN>` markup (see README).

## Naming — do not "fix" without understanding

- The plugin **base is `couleur`** (`base` line in `plugin.info.txt`, class
  `syntax_plugin_couleur`). DokuWiki derives the class name from `base`, not
  from the directory or repo name.
- The repo is named `dokuwiki-plugin-fahne`, the dokuwiki.org page is
  `plugin:fahne`, but the base stays `couleur`. Renaming `base` or the class
  without coordinating all three breaks plugin loading.
- The markup tag is `band`, neither `couleur` nor `fahne`
  (`connectTo()` in syntax.php, with a TODO to tighten the `<band.*?>` regex).
- The GitHub remote still points at the old name
  `AVFrisia/dokuwiki-plugin-couleur`.

## Verification

- No test suite, no composer, no CI, no lint config. The only automated check:
  `php -l syntax.php` (requires PHP >= 8.0; `str_starts_with` is used).
- Output is a visual SVG; verify by rendering the tag in a real DokuWiki
  instance (e.g. the `dokuwiki/dokuwiki` Docker image with the repo mounted
  into `conf/plugins/`).

## DokuWiki conventions that look wrong but are not

- `getType()` returns `'substition'` — the typo is part of DokuWiki's
  documented type list. Do not "fix" it to `substitution`.
- `render()` must return `false` for non-`xhtml` modes; keep that guard.
- `plugin.info.txt` is `key<spaces>value` lines; update its `date` field when
  shipping changes.

## Other gotchas

- The license is GPLv2 everywhere (`LICENSE` full text, README notice, and the
  `syntax.php` `@license` docblock). Keep all three consistent when editing
  headers.
- `plugin.info.txt` `desc` is in German; the README is in English.
- syntax.php mixes tabs and 4-space indentation; keep edits locally consistent
  with the surrounding lines.
