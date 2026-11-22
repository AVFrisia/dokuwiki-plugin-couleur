<?php

declare(strict_types=1);

use dokuwiki\Extension\SyntaxPlugin;

/**
 * DokuWiki Plugin couleur (Syntax Component)
 *
 * Renders SVG ribbons/flags of European student fraternities from the
 * markup `<band:PERCUSSION COLOR1 COLOR2 ... COLORN>`.
 *
 * @license GPL 2 http://www.gnu.org/licenses/gpl-2.0.html
 * @author Johannes Arnold <johannes@rnold.online>
 */
class syntax_plugin_couleur extends SyntaxPlugin
{
    /** SVG view box dimensions. */
    private const WIDTH = 300;
    private const HEIGHT = 200;

    /** Minimum number of colors required to render a band. */
    private const MIN_COLORS = 2;

    /** Maximum length of a single color/percussion token. */
    private const MAX_TOKEN_LENGTH = 32;

    /** Maximum number of color tokens per tag. */
    private const MAX_COLORS = 20;

    /** @inheritDoc */
    public function getType(): string
    {
        return 'substition';
    }

    /** @inheritDoc */
    public function getPType(): string
    {
        return 'block';
    }

    /** @inheritDoc */
    public function getSort(): int
    {
        return 35;
    }

    /**
     * @param string $mode
     */
    public function connectTo($mode): void
    {
        $this->Lexer->addSpecialPattern('<band(?::[^ >]*)?(?:\s+[^ >]+)*\s*>', $mode, 'plugin_couleur');
    }

    /**
     * Parse the matched tag into render data.
     *
     * Returns either `['error' => string]` or
     * `['perkussion' => ?string, 'colors' => string[]]`.
     *
     * @param string $match The matched markup, e.g. `<band:red white blue>`
     * @param int $state
     * @param int $pos
     * @param Doku_Handler $handler
     * @return array{error: string}|array{perkussion: string|null, colors: string[]}
     */
    public function handle($match, $state, $pos, Doku_Handler $handler)
    {
        // Strip the leading '<band' and the trailing '>'.
        $inner = trim(substr($match, 5, -1));

        if ($inner === '') {
            return ['error' => $this->getLang('error_no_colors')];
        }

        $args = $this->splitArguments($inner);
        $perkussion = null;

        // An argument starting with ':' is the percussion color.
        if ($args !== [] && str_starts_with($args[0], ':')) {
            $first = array_shift($args);
            $perkussion = ltrim((string)$first, ':');
            $perkussion = $perkussion === '' ? null : $perkussion;
        }

        $error = $this->validateTokens($args, $perkussion);
        if ($error !== null) {
            return ['error' => $error];
        }

        return [
            'perkussion' => $perkussion,
            'colors' => array_values($args),
        ];
    }

    /**
     * Split the tag body on whitespace and drop empty tokens.
     *
     * @param string $inner Tag body without '<band' and '>'
     * @return string[]
     */
    private function splitArguments(string $inner): array
    {
        $args = preg_split('/\s+/', $inner, -1, PREG_SPLIT_NO_EMPTY);
        return $args === false ? [] : $args;
    }

    /**
     * Check that the parsed tokens can be rendered safely.
     *
     * @param string[] $colors
     * @param string|null $perkussion
     * @return string|null Localised error message, or null when valid
     */
    private function validateTokens(array $colors, ?string $perkussion): ?string
    {
        if (count($colors) < self::MIN_COLORS) {
            return $this->getLang('error_too_few_colors');
        }

        if (count($colors) > self::MAX_COLORS) {
            return $this->getLang('error_too_many_colors');
        }

        $tokens = $perkussion === null ? $colors : [...$colors, $perkussion];
        foreach ($tokens as $token) {
            if (strlen($token) > self::MAX_TOKEN_LENGTH) {
                return $this->getLang('error_invalid_color');
            }
        }

        return null;
    }

    /**
     * Escape a value for use inside a single-quoted SVG attribute.
     */
    private function escapeAttribute(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    /**
     * Render equally sized bars for two or three colors.
     *
     * @param string[] $colors
     * @return string[]
     */
    private function renderEvenBars(array $colors): array
    {
        $count = count($colors);
        $barHeight = round(self::HEIGHT / $count, 2);

        $svg = [];
        foreach ($colors as $index => $color) {
            $y = round($index * $barHeight, 2);
            $svg[] = $this->renderRect($y, $barHeight, $color);
        }

        return $svg;
    }

    /**
     * Render bars with the outermost bar halved, centering the innermost
     * colors vertically.
     *
     * @param string[] $colors
     * @return string[]
     */
    private function renderCenteredBars(array $colors): array
    {
        $count = count($colors);
        $barHeight = round(self::HEIGHT / ($count - 1), 2);

        $svg = [];
        $y = 0.0;
        foreach ($colors as $index => $color) {
            $isOutermost = $index === 0 || $index === $count - 1;
            $actualHeight = $isOutermost ? round($barHeight / 2, 2) : $barHeight;
            $svg[] = $this->renderRect($y, $actualHeight, $color);
            $y = round($y + $actualHeight, 2);
        }

        return $svg;
    }

    private function renderRect(float $y, float $height, string $color): string
    {
        return sprintf(
            "<rect x='0' y='%s' width='%d' height='%s' fill='%s' />",
            $this->formatNumber($y),
            self::WIDTH,
            $this->formatNumber($height),
            $this->escapeAttribute($color)
        );
    }

    /**
     * Format a number without unnecessary trailing zeros.
     */
    private function formatNumber(float $number): string
    {
        // Avoid "-0" for tiny negative values caused by floating point math.
        $rounded = round($number, 2);
        if ($rounded == 0.0) {
            $rounded = 0.0;
        }

        $formatted = number_format($rounded, 2, '.', '');
        return rtrim(rtrim($formatted, '0'), '.');
    }

    /**
     * Render the dashed percussion lines at top and bottom.
     */
    private function renderPerkussionLines(string $perkussion): string
    {
        $stroke = $this->escapeAttribute($perkussion);

        $lines = [];
        foreach (['2%', '98%'] as $y) {
            $lines[] = "<line x1='0' y1='{$y}' x2='100%' y2='{$y}' stroke='{$stroke}'"
                . " stroke-linecap='round' stroke-width='4' stroke-dasharray='8' stroke-dashoffset='6px'"
                . " style='filter: drop-shadow(0px 0px 1px rgba(0, 0, 0, .5));'/>";
        }

        return implode('', $lines);
    }

    /**
     * Render the complete SVG band.
     *
     * @param string[] $colors
     */
    private function renderBand(?string $perkussion, array $colors): string
    {
        $svg = [];
        $svg[] = sprintf(
            "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 %d %d'"
            . " style='height: auto; width: auto; max-width: 128px;"
            . " box-shadow: rgba(0, 0, 0, 0.25) 0px 0px 8px;"
            . " margin: 1em auto; display: block;'>",
            self::WIDTH,
            self::HEIGHT
        );

        // Center the innermost colors when there are more than three.
        $bars = count($colors) > 3
            ? $this->renderCenteredBars($colors)
            : $this->renderEvenBars($colors);
        $svg[] = implode('', $bars);

        if ($perkussion !== null) {
            $svg[] = $this->renderPerkussionLines($perkussion);
        }

        $svg[] = '</svg>';

        return implode('', $svg);
    }

    /**
     * Render an inline warning for invalid tags.
     *
     * Language strings are authored as trusted HTML (they may contain
     * entities such as &lt;band&gt;), so they are not escaped again.
     */
    private function renderError(string $message): string
    {
        return "<div class='plugin_couleur_error' style='color: #b00; font-style: italic;'>{$message}</div>";
    }

    /**
     * @param string $mode
     * @param Doku_Renderer $renderer
     * @param array{error: string}|array{perkussion: string|null, colors: string[]} $data
     * @return bool
     */
    public function render($mode, Doku_Renderer $renderer, $data)
    {
        if ($mode !== 'xhtml') {
            return false;
        }

        if (isset($data['error'])) {
            $renderer->doc .= $this->renderError($data['error']);
            return true;
        }

        $renderer->doc .= $this->renderBand($data['perkussion'], $data['colors']);
        return true;
    }
}
