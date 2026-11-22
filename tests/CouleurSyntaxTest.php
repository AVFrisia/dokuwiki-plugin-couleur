<?php

declare(strict_types=1);

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../syntax.php';

final class CouleurSyntaxTest extends TestCase
{
    private syntax_plugin_couleur $plugin;
    private Doku_Handler $handler;
    private Doku_Renderer $renderer;

    protected function setUp(): void
    {
        $this->plugin = new syntax_plugin_couleur();
        $this->plugin->Lang = ['en'];
        $this->plugin->langStrings = $this->loadLangStrings('de');
        $this->handler = new Doku_Handler();
        $this->renderer = new Doku_Renderer();
    }

    /**
     * @return array<string, string>
     */
    private function loadLangStrings(string $code): array
    {
        $lang = [];
        require __DIR__ . "/../lang/{$code}/lang.php";
        return $lang;
    }

    /**
     * @return array<string, mixed>
     */
    private function handle(string $match): array
    {
        return $this->plugin->handle($match, 1, 0, $this->handler);
    }

    private function render(string $match): string
    {
        $this->renderer->doc = '';
        $data = $this->handle($match);
        $this->plugin->render('xhtml', $this->renderer, $data);
        return $this->renderer->doc;
    }

    public function testSyntaxMetadataIsUnchanged(): void
    {
        $this->assertSame('substition', $this->plugin->getType());
        $this->assertSame('block', $this->plugin->getPType());
        $this->assertSame(35, $this->plugin->getSort());
    }

    public function testConnectToRegistersBandPattern(): void
    {
        $this->plugin->connectTo('base');
        $this->assertCount(1, $this->plugin->Lexer->patterns);
        [$pattern, $mode, $plugin] = $this->plugin->Lexer->patterns[0];
        $this->assertSame('base', $mode);
        $this->assertSame('plugin_couleur', $plugin);
        $this->assertStringStartsWith('<band', $pattern);
    }

    /**
     * @return array<string, array{string}>
     */
    public static function matchingTags(): array
    {
        return [
            'with percussion' => ['<band:silver white #6B841A black white>'],
            'without percussion' => ['<band red blue>'],
            'single color' => ['<band red>'],
            'three colors' => ['<band gold red black>'],
            'extra whitespace' => ['<band:red   white  blue>'],
            'trailing space' => ['<band red blue >'],
        ];
    }

    #[DataProvider('matchingTags')]
    public function testPatternMatchesValidTags(string $tag): void
    {
        $this->plugin->connectTo('base');
        [$pattern] = $this->plugin->Lexer->patterns[0];
        $this->assertSame(1, preg_match('/' . $pattern . '/', $tag), "Pattern should match: {$tag}");
    }

    /**
     * @return array<string, array{string}>
     */
    public static function nonMatchingTags(): array
    {
        return [
            'bandana' => ['<bandana>'],
            'bandwidth' => ['<bandwidth foo bar>'],
            'no closing bracket' => ['<band red blue'],
            'other tag' => ['<foo red blue>'],
        ];
    }

    #[DataProvider('nonMatchingTags')]
    public function testPatternRejectsLookalikes(string $tag): void
    {
        $this->plugin->connectTo('base');
        [$pattern] = $this->plugin->Lexer->patterns[0];
        $this->assertSame(0, preg_match('/' . $pattern . '/', $tag), "Pattern should not match: {$tag}");
    }

    public function testHandleParsesColorsWithoutPercussion(): void
    {
        $data = $this->handle('<band red blue>');
        $this->assertNull($data['perkussion']);
        $this->assertSame(['red', 'blue'], $data['colors']);
    }

    public function testHandleParsesPercussion(): void
    {
        $data = $this->handle('<band:silver white #6B841A black white>');
        $this->assertSame('silver', $data['perkussion']);
        $this->assertSame(['white', '#6B841A', 'black', 'white'], $data['colors']);
    }

    public function testHandleCollapsesMultipleSpaces(): void
    {
        $data = $this->handle('<band:red    white   blue>');
        $this->assertSame('red', $data['perkussion']);
        $this->assertSame(['white', 'blue'], $data['colors']);
    }

    public function testHandleRejectsEmptyTag(): void
    {
        $data = $this->handle('<band>');
        $this->assertArrayHasKey('error', $data);
    }

    public function testHandleRejectsEmptyPercussionWithNoColors(): void
    {
        $data = $this->handle('<band:>');
        $this->assertArrayHasKey('error', $data);
    }

    public function testHandleRejectsSingleColor(): void
    {
        $data = $this->handle('<band:red white>');
        $this->assertArrayHasKey('error', $data);
    }

    public function testHandleRejectsTooManyColors(): void
    {
        $colors = implode(' ', array_fill(0, 21, 'red'));
        $data = $this->handle("<band {$colors}>");
        $this->assertArrayHasKey('error', $data);
    }

    public function testHandleRejectsOverlongToken(): void
    {
        $long = str_repeat('a', 33);
        $data = $this->handle("<band {$long} red>");
        $this->assertArrayHasKey('error', $data);
    }

    public function testRenderReturnsFalseForNonXhtml(): void
    {
        $this->renderer->doc = 'unchanged';
        $result = $this->plugin->render('odt', $this->renderer, ['perkussion' => null, 'colors' => ['red', 'blue']]);
        $this->assertFalse($result);
        $this->assertSame('unchanged', $this->renderer->doc);
    }

    public function testRenderProducesSvgWithRectPerColor(): void
    {
        $svg = $this->render('<band red blue>');
        $this->assertStringContainsString("<svg xmlns='http://www.w3.org/2000/svg'", $svg);
        $this->assertStringContainsString("viewBox='0 0 300 200'", $svg);
        $this->assertSame(2, substr_count($svg, '<rect'));
        $this->assertStringNotContainsString('<line', $svg);
        $this->assertStringEndsWith('</svg>', $svg);
    }

    public function testRenderUsesEvenBarsForThreeColors(): void
    {
        $svg = $this->render('<band red white blue>');
        $this->assertSame(3, substr_count($svg, '<rect'));
        // 200 / 3 = 66.67
        $this->assertSame(3, substr_count($svg, "height='66.67'"));
    }

    public function testRenderCentersBarsForMoreThanThreeColors(): void
    {
        $svg = $this->render('<band:silver white #6B841A black white green>');
        $this->assertSame(5, substr_count($svg, '<rect'));
        // 200 / 4 = 50 for the inner bars; the halved outer bars are 25 each.
        $this->assertSame(2, substr_count($svg, "height='25'"));
        $this->assertSame(3, substr_count($svg, "height='50'"));
    }

    public function testRenderAddsPercussionLines(): void
    {
        $svg = $this->render('<band:silver white black>');
        $this->assertSame(2, substr_count($svg, '<line'));
        $this->assertStringContainsString("stroke='silver'", $svg);
    }

    public function testRenderEscapesAttributesAgainstInjection(): void
    {
        $svg = $this->render("<band:silver'/><script>alert(1)</script> red blue>");
        $this->assertStringNotContainsString('<script>', $svg);
        $this->assertStringNotContainsString("stroke='silver'", $svg);
    }

    public function testRenderEscapesSingleQuotesInColors(): void
    {
        $svg = $this->render("<band red'onload='x blue>");
        $this->assertStringNotContainsString("fill='red'onload", $svg);
        $this->assertStringContainsString('&#039;', $svg);
    }

    public function testRenderErrorForInvalidTag(): void
    {
        $svg = $this->render('<band>');
        $this->assertStringContainsString('plugin_couleur_error', $svg);
        $this->assertStringNotContainsString('<svg', $svg);
    }

    public function testRenderErrorIsGerman(): void
    {
        $svg = $this->render('<band>');
        $this->assertStringContainsString('Ungültiger', $svg);
    }

    public function testEmptyPercussionDoesNotProduceDivisionByZero(): void
    {
        $svg = $this->render('<band:>');
        $this->assertStringNotContainsString('<rect', $svg);
    }
}
