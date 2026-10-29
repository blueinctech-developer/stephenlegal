<?php
/**
 * StephenLegal Editorial — theme setup.
 *
 * @package StephenLegal
 */

defined( 'ABSPATH' ) || exit;

define( 'SL_VERSION', '1.0.0' );

require_once get_template_directory() . '/inc/template-tags.php';
require_once get_template_directory() . '/inc/content.php';

/**
 * Theme supports, menus and image sizes.
 */
function sl_setup() {
	load_theme_textdomain( 'stephenlegal', get_template_directory() . '/languages' );

	add_theme_support( 'title-tag' );
	add_theme_support( 'automatic-feed-links' );
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'responsive-embeds' );
	add_theme_support( 'align-wide' );
	add_theme_support( 'editor-styles' );
	add_theme_support( 'html5', array( 'search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'style', 'script', 'navigation-widgets' ) );
	add_theme_support( 'custom-logo', array( 'height' => 80, 'width' => 320, 'flex-height' => true, 'flex-width' => true ) );

	register_nav_menus(
		array(
			'primary' => __( 'Primary navigation (header, top level only)', 'stephenlegal' ),
			'footer'  => __( 'Footer — publication links', 'stephenlegal' ),
		)
	);

	// Existing uploads are almost all 16:9 (1200×675); keep cards and leads on the same ratio.
	add_image_size( 'sl-lead', 1600, 900, true );
	add_image_size( 'sl-card', 800, 450, true );
	add_image_size( 'sl-thumb', 400, 225, true );
}
add_action( 'after_setup_theme', 'sl_setup' );

/**
 * Article body measure for oEmbeds.
 */
function sl_content_width() {
	$GLOBALS['content_width'] = 720;
}
add_action( 'after_setup_theme', 'sl_content_width', 0 );

/**
 * Fonts, styles and the small progressive-enhancement script.
 */
function sl_assets() {
	wp_enqueue_style(
		'sl-fonts',
		'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap',
		array(),
		null
	);
	wp_enqueue_style( 'sl-main', get_template_directory_uri() . '/assets/css/main.css', array( 'sl-fonts' ), SL_VERSION );
	wp_enqueue_script( 'sl-site', get_template_directory_uri() . '/assets/js/site.js', array(), SL_VERSION, array( 'strategy' => 'defer', 'in_footer' => true ) );

	if ( is_singular() && comments_open() && get_option( 'thread_comments' ) ) {
		wp_enqueue_script( 'comment-reply' );
	}

	// Block library CSS is unused by this theme's templates except inside post content.
	if ( ! is_singular() ) {
		wp_dequeue_style( 'wp-block-library' );
		wp_dequeue_style( 'global-styles' );
		wp_dequeue_style( 'classic-theme-styles' );
	}
}
add_action( 'wp_enqueue_scripts', 'sl_assets', 20 );

/**
 * Preconnect to the font origins.
 *
 * @param array  $urls          URLs to print for resource hints.
 * @param string $relation_type The relation type the URLs are printed for.
 * @return array
 */
function sl_resource_hints( $urls, $relation_type ) {
	if ( 'preconnect' === $relation_type ) {
		$urls[] = 'https://fonts.googleapis.com';
		$urls[] = array( 'href' => 'https://fonts.gstatic.com', 'crossorigin' );
	}
	return $urls;
}
add_filter( 'wp_resource_hints', 'sl_resource_hints', 10, 2 );

/**
 * Customizer: the category that feeds the homepage's "Featured insight" band,
 * and the general-information disclaimer shown under every article.
 *
 * @param WP_Customize_Manager $wp_customize Customizer instance.
 */
function sl_customize_register( $wp_customize ) {
	$wp_customize->add_section( 'sl_editorial', array( 'title' => __( 'Editorial layout', 'stephenlegal' ), 'priority' => 30 ) );

	$choices = array();
	foreach ( get_categories( array( 'hide_empty' => true ) ) as $cat ) {
		$choices[ $cat->slug ] = $cat->name;
	}

	$wp_customize->add_setting( 'sl_feature_category', array( 'default' => 'legal-explainer', 'sanitize_callback' => 'sanitize_title' ) );
	$wp_customize->add_control( 'sl_feature_category', array( 'label' => __( 'Featured insight category', 'stephenlegal' ), 'section' => 'sl_editorial', 'type' => 'select', 'choices' => $choices ) );

	$wp_customize->add_setting( 'sl_desk_categories', array( 'default' => 'case-law,opinions,law-news', 'sanitize_callback' => 'sanitize_text_field' ) );
	$wp_customize->add_control( 'sl_desk_categories', array( 'label' => __( 'Homepage desk columns (three category slugs, comma separated)', 'stephenlegal' ), 'section' => 'sl_editorial', 'type' => 'text' ) );

	$wp_customize->add_setting( 'sl_disclaimer', array( 'default' => sl_default_disclaimer(), 'sanitize_callback' => 'sanitize_textarea_field' ) );
	$wp_customize->add_control( 'sl_disclaimer', array( 'label' => __( 'Article disclaimer', 'stephenlegal' ), 'section' => 'sl_editorial', 'type' => 'textarea' ) );
}
add_action( 'customize_register', 'sl_customize_register' );

/**
 * Default disclaimer copy.
 *
 * @return string
 */
function sl_default_disclaimer() {
	return __( 'Articles on Stephen Legal are for general information and public education only. They are not legal advice and do not create a lawyer–client relationship. For advice on your own situation, consult a qualified legal practitioner.', 'stephenlegal' );
}

/**
 * Archive headings show the topic name alone ("Case Law", not "Category: Case Law");
 * the kicker above the heading already says what kind of archive it is.
 *
 * @return string
 */
function sl_archive_title_prefix() {
	return '';
}
add_filter( 'get_the_archive_title_prefix', 'sl_archive_title_prefix' );

/**
 * Social profiles linked from the footer (taken from the existing site).
 *
 * @return array<string,string> Label => URL.
 */
function sl_social_links() {
	return apply_filters(
		'sl_social_links',
		array(
			'Facebook'  => 'https://www.facebook.com/stephenlegalblog',
			'Instagram' => 'https://www.instagram.com/stephenlegal',
			'X'         => 'https://twitter.com/stephen_legal',
		)
	);
}

/**
 * Show 12 posts per archive page so the 3-column grid fills cleanly
 * without changing the site-wide Reading setting.
 *
 * @param WP_Query $query Main query.
 */
function sl_archive_page_size( $query ) {
	if ( is_admin() || ! $query->is_main_query() ) {
		return;
	}
	if ( $query->is_archive() || $query->is_home() ) {
		$query->set( 'posts_per_page', 12 );
	}
	if ( $query->is_search() ) {
		$query->set( 'posts_per_page', 12 );
		$query->set( 'post_type', 'post' );
	}
}
add_action( 'pre_get_posts', 'sl_archive_page_size' );

/**
 * Shorter auto-excerpts for cards.
 *
 * @return int
 */
function sl_excerpt_length() {
	return 32;
}
add_filter( 'excerpt_length', 'sl_excerpt_length' );

/**
 * @return string
 */
function sl_excerpt_more() {
	return '…';
}
add_filter( 'excerpt_more', 'sl_excerpt_more' );

/**
 * Body classes used by the stylesheet.
 *
 * @param string[] $classes Body classes.
 * @return string[]
 */
function sl_body_classes( $classes ) {
	if ( is_singular( 'post' ) ) {
		$classes[] = 'is-article';
	}
	return $classes;
}
add_filter( 'body_class', 'sl_body_classes' );
