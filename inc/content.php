<?php
/**
 * Article content helpers: heading anchors, table of contents, related stories.
 *
 * @package StephenLegal
 */

defined( 'ABSPATH' ) || exit;

/**
 * Render the current post's content once, add anchors to its H2/H3 headings
 * and return both the HTML and the heading outline.
 *
 * @return array{html:string,toc:array<int,array{id:string,text:string,level:int}>}
 */
function sl_prepare_article() {
	$html = apply_filters( 'the_content', get_the_content() );
	$html = str_replace( ']]>', ']]&gt;', $html );
	$toc  = array();
	$used = array();

	$html = preg_replace_callback(
		'/<h([23])([^>]*)>(.*?)<\/h\1>/is',
		function ( $m ) use ( &$toc, &$used ) {
			$text = trim( html_entity_decode( wp_strip_all_tags( $m[3] ), ENT_QUOTES, 'UTF-8' ) );
			if ( '' === $text ) {
				return $m[0];
			}
			if ( preg_match( '/\sid=["\']([^"\']+)["\']/', $m[2], $id_match ) ) {
				$id    = $id_match[1];
				$attrs = $m[2];
			} else {
				$base = sanitize_title( wp_trim_words( $text, 8, '' ) );
				$base = $base ? $base : 'section';
				$id   = $base;
				$n    = 2;
				while ( isset( $used[ $id ] ) ) {
					$id = $base . '-' . $n++;
				}
				$attrs = $m[2] . ' id="' . esc_attr( $id ) . '"';
			}
			$used[ $id ] = true;
			$toc[]       = array(
				'id'    => $id,
				'text'  => $text,
				'level' => (int) $m[1],
			);
			return '<h' . $m[1] . $attrs . '>' . $m[3] . '</h' . $m[1] . '>';
		},
		$html
	);

	return array(
		'html' => $html,
		'toc'  => $toc,
	);
}

/**
 * Whether an article is long enough to warrant a table of contents.
 *
 * @param array $toc Heading outline.
 * @return bool
 */
function sl_show_toc( $toc ) {
	return apply_filters( 'sl_show_toc', count( $toc ) >= 3 && sl_reading_minutes() >= 4, $toc );
}

/**
 * Related stories: same primary category first, then the latest stories.
 *
 * @param int $count Number of posts.
 * @return WP_Post[]
 */
function sl_related_posts( $count = 3 ) {
	$post_id = get_the_ID();
	$cat     = sl_primary_category( $post_id );
	$posts   = array();

	if ( $cat ) {
		$posts = get_posts(
			array(
				'category__in'        => array( $cat->term_id ),
				'post__not_in'        => array( $post_id ),
				'posts_per_page'      => $count,
				'ignore_sticky_posts' => true,
				'no_found_rows'       => true,
			)
		);
	}

	if ( count( $posts ) < $count ) {
		$exclude = array_merge( array( $post_id ), wp_list_pluck( $posts, 'ID' ) );
		$posts   = array_merge(
			$posts,
			get_posts(
				array(
					'post__not_in'        => $exclude,
					'posts_per_page'      => $count - count( $posts ),
					'ignore_sticky_posts' => true,
					'no_found_rows'       => true,
				)
			)
		);
	}

	return $posts;
}

/**
 * Homepage story pool, deduplicated across sections.
 */
class SL_Story_Pool {

	/**
	 * IDs already placed on the page.
	 *
	 * @var int[]
	 */
	private static $shown = array();

	/**
	 * Fetch posts that have not been shown yet and mark them as shown.
	 *
	 * @param int   $count Number of posts.
	 * @param array $args  Extra WP_Query args.
	 * @return WP_Post[]
	 */
	public static function take( $count, $args = array() ) {
		$posts = get_posts(
			array_merge(
				array(
					'posts_per_page'      => $count,
					'post__not_in'        => self::$shown,
					'ignore_sticky_posts' => true,
					'no_found_rows'       => true,
				),
				$args
			)
		);
		self::$shown = array_merge( self::$shown, wp_list_pluck( $posts, 'ID' ) );
		return $posts;
	}

	/**
	 * Sticky posts (newest first) lead the page; otherwise the newest story.
	 *
	 * @param int $count Number of posts.
	 * @return WP_Post[]
	 */
	public static function lead( $count ) {
		$sticky = array_filter( array_map( 'intval', (array) get_option( 'sticky_posts' ) ) );
		$posts  = array();
		if ( $sticky ) {
			$posts = self::take( $count, array( 'post__in' => $sticky ) );
		}
		if ( count( $posts ) < $count ) {
			$posts = array_merge( $posts, self::take( $count - count( $posts ) ) );
		}
		return $posts;
	}
}
