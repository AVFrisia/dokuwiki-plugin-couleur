<?php

use dokuwiki\Extension\SyntaxPlugin;

/**
 * DokuWiki Plugin couleur (Syntax Component)
 *
 * @license GPL 2 http://www.gnu.org/licenses/gpl-2.0.html
 * @author Johannes Arnold <johannes@rnold.online>
 */
class syntax_plugin_couleur extends SyntaxPlugin
{
    /** @inheritDoc */
    public function getType()
    {
        return 'substition';
    }

    /** @inheritDoc */
    public function getPType()
    {
        return 'block';
    }

    /** @inheritDoc */
    public function getSort()
    {
        return 35;
    }

    /** @inheritDoc */
    public function connectTo($mode)
    {
	    // TODO: This regex must be more specific.
	    $this->Lexer->addSpecialPattern('<band.*?>', $mode, 'plugin_couleur');
    }


    /** @inheritDoc */
    public function handle($match, $state, $pos, Doku_Handler $handler)
    {
        // Remove '<band' and trailing '>'
        $inner = trim(substr($match, 5, -1));
        //$inner = trim($inner);

        // Seperate arguments
	$args = array_map('trim', explode(' ', $inner));

	// Argument with ':' is the Perkussion
	if (str_starts_with($args[0], ':')) {
		return array(
			substr($args[0], 1),
			array_slice($args, 1)
		);
	}

	// Otherwise, return everything as a color
        return array(NULL, $args);
    }

    function renderNcolor($width, $height, $colors) {
	$count = count($colors);
	$barHeight = ($height / $count);

	$svg = "";

	// Loop through colors
        for($i = 0; $i < $count; $i++) {
            $y = $i * $barHeight;
            $color = htmlspecialchars($colors[$i]);
	    $svg .= "<rect x='0' y='{$y}' width='{$width}' height='{$barHeight}' fill='{$color}' />";
        }

	return $svg;
    }

    function renderCentered($width, $height, $colors) {
	$count = count($colors);
	$barHeight = ($height / ($count - 1));

	$svg = "";

	// Loop through colors,
	// shifting each bar down
	$y = 0;
        for($i = 0; $i < $count; $i++) {
	    if ($i == 0 || $i == $count-1) {
		$actualHeight = $barHeight / 2;
	    } else {
		$actualHeight = $barHeight;
	    }
	    $color = htmlspecialchars($colors[$i]);
	    $svg .= "<rect x='0' y='{$y}' width='{$width}' height='{$actualHeight}' fill='{$color}' />";
	    $y += $actualHeight;
	}

	return $svg;
    }

    function renderBand($width, $height, $perkussion, $colors) {
        $svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 {$width} {$height}' style='height: auto; width: auto; max-width: 128px; box-shadow: rgba(0, 0, 0, 0.25) 0px 0px 8px; margin: 1em auto; display: block;'>";

	// Center the innermost colors
	if (count($colors) > 3) {
	    $svg .= $this->renderCentered($width, $height, $colors);
	} else {
	    $svg .= $this->renderNcolor($width, $height, $colors);
	}

	if (isset($perkussion)) {
		$svg .= "<line x1='0' y1='2%' x2='100%' y2='2%' stroke='{$perkussion}' stroke-linecap='round' stroke-width='4' stroke-dasharray='8' stroke-dashoffset='6px' style='filter: drop-shadow(0px 0px 1px rgba(0, 0, 0, .5));'/>";
    		$svg .= "<line x1='0' y1='98%' x2='100%' y2='98%' stroke='{$perkussion}' stroke-linecap='round' stroke-width='4' stroke-dasharray='8'  stroke-dashoffset='6px' style='filter: drop-shadow(0px 0px 1px rgba(0, 0, 0, .5));'/>";
	}

        $svg .= "</svg>";

	return $svg;
    }


    /** @inheritDoc */
    public function render($mode, Doku_Renderer $renderer, $data)
    {
        if ($mode !== 'xhtml') {
            return false;
        }

	list($perkussion, $colors) = $data;
	
	$renderer->doc .= $this->renderBand(300, 200, $perkussion, $colors);
        return true;
    }
}
