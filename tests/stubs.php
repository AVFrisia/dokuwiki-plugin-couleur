<?php

/*
 * Minimal DokuWiki stubs.
 *
 * These stand in for the DokuWiki core classes the plugin depends on so the
 * plugin can be unit tested and statically analysed without a full DokuWiki
 * installation. Real DokuWiki classes take precedence when present.
 */

namespace dokuwiki\Extension {
    if (!class_exists(__NAMESPACE__ . '\\SyntaxPlugin')) {
        /**
         * Minimal syntax plugin base class.
         */
        abstract class SyntaxPlugin
        {
            public \DokuLexerStub $Lexer;

            /** @var string[] */
            public array $Lang = ['en'];

            public string $localised = 'en';

            /** @var array<string, string> */
            public array $langStrings = [];

            public function __construct()
            {
                $this->Lexer = new \DokuLexerStub();
            }

            public function getLang(string $id): string
            {
                return $this->langStrings[$id] ?? "[missing lang: {$id}]";
            }
        }
    }
}

namespace {
    if (!class_exists('Doku_Handler')) {
        class Doku_Handler
        {
        }
    }

    if (!class_exists('Doku_Renderer')) {
        class Doku_Renderer
        {
            public string $doc = '';
        }
    }

    if (!class_exists('DokuLexerStub')) {
        /**
         * Records patterns added by connectTo().
         */
        class DokuLexerStub
        {
            /** @var array<int, array{0: string, 1: string, 2: string}> */
            public array $patterns = [];

            public function addSpecialPattern(string $pattern, string $mode, string $pluginName): void
            {
                $this->patterns[] = [$pattern, $mode, $pluginName];
            }
        }
    }
}
