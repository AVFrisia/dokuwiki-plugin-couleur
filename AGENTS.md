# AGENTS.md

DokuWiki syntax plugin that renders SVG ribbons/flags of European student
fraternities. The entire plugin is `syntax.php`; it emits inline SVG for the
`<band:PERCUSSION COLOR1 ... COLORN>` markup (see README). Error messages come
from `lang/`.

## Naming — do not "fix" without understanding

- The plugin **base is `couleur`** (`base` line in `plugin.info.txt`, class
  `syntax_plugin_couleur`). DokuWiki derives the class name from `base`, not
  from the directory or repo name.
- The repo is named `dokuwiki-plugin-fahne`, the dokuwiki.org page is
  `plugin:fahne`, but the base stays `couleur`. Renaming `base` or the class
  without coordinating all three breaks plugin loading.
- The markup tag is `band`, neither `couleur` nor `fahne`
  (`connectTo()` in syntax.php; the pattern matches `<band…>` only and
  deliberately does not match lookalikes such as `<bandana>`).
- The GitHub remote still points at the old name
  `AVFrisia/dokuwiki-plugin-couleur`.

## Verification

- `composer check` runs lint (`php -l syntax.php`), PHPUnit and PHPStan
  (level max). Needs PHP >= 8.2.
- Tests use minimal DokuWiki stubs in `tests/stubs.php`; no DokuWiki
  install is required. CI runs lint, tests and PHPStan on PHP 8.2–8.4, see
  `.github/workflows/ci.yml`.
- Output is a visual SVG; for visual checks render the tag in a real
  DokuWiki instance (e.g. the `dokuwiki/dokuwiki` Docker image with the repo
  mounted into `conf/plugins/`).

## Coding conventions

- 4-space indentation throughout `syntax.php`.
- User-facing error messages use the language files in `lang/`; German
  (`lang/de`) is the primary language, English (`lang/en`) is the fallback.
- Never interpolate colors/percussion into the SVG without
  `escapeAttribute()` — the markup is user-supplied.

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
- `plugin.info.txt` `desc` is in German; the README is in German too (with
  English error-message fallback in `lang/en`).
