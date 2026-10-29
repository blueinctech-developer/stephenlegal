<?php
/**
 * Template helpers shared by every view.
 *
 * @package StephenLegal
 */

defined( 'ABSPATH' ) || exit;

/**
 * Categories that describe placement rather than subject. They are never used
 * as a story's display label when a subject category is also assigned.
 *
 * @return string[]
 */
function sl_placement_categories() {
	return apply_filters( 'sl_placement_categories', array( 'trending', 'most-viewed', 'editors-choice', 'uncategorized', 'sponsored' ) );
}

/**
 * The single category shown on a card: Yoast's primary category when set,
 * otherwise the first subject category.
 *
 * @param int|WP_Post|null $post Post.
 * @return WP_Term|null
 */
function sl_primary_category( $post = null ) {
	$post = get_post( $post );
	if ( ! $post ) {
		return null;
	}

	$primary_id = (int) get_post_meta( $post->ID, '_yoast_wpseo_primary_category', true );
	if ( $primary_id ) {
		$term = get_term( $primary_id, 'category' );
		if ( $term instanceof WP_Term ) {
			return $term;
		}
	}

	$cats = get_the_category( $post->ID );
	if ( ! $cats ) {
		return null;
	}
	foreach ( $cats as $cat ) {
		if ( ! in_array( $cat->slug, sl_placement_categories(), true ) ) {
			return $cat;
		}
	}
	return $cats[0];
}

/**
 * Category label: text plus a square marker, so category is never conveyed by colour alone.
 *
 * @param int|WP_Post|null $post Post.
 * @param bool             $link Whether to link to the category archive.
 */
function sl_category_label( $post = null, $link = true ) {
	$cat = sl_primary_category( $post );
	if ( ! $cat ) {
		return;
	}
	if ( $link ) {
		printf( '<a class="kicker" href="%s">%s</a>', esc_url( get_category_link( $cat ) ), esc_html( $cat->name ) );
	} else {
		printf( '<span class="kicker">%s</span>', esc_html( $cat->name ) );
	}
}

/**
 * Publication date as a <time> element.
 *
 * @param int|WP_Post|null $post   Post.
 * @param string           $format Optional date format.
 */
function sl_posted_on( $post = null, $format = '' ) {
	$post   = get_post( $post );
	$format = $format ? $format : 'j M Y';
	printf(
		'<time datetime="%s">%s</time>',
		esc_attr( get_the_date( DATE_W3C, $post ) ),
		esc_html( get_the_date( $format, $post ) )
	);
}

/**
 * Estimated reading time in minutes (about 220 words per minute).
 *
 * @param int|WP_Post|null $post Post.
 * @return int
 */
function sl_reading_minutes( $post = null ) {
	$post  = get_post( $post );
	$words = str_word_count( wp_strip_all_tags( strip_shortcodes( $post->post_content ) ) );
	return max( 1, (int) round( $words / 220 ) );
}

/**
 * Compact metadata line: author · date.
 *
 * @param int|WP_Post|null $post        Post.
 * @param bool             $show_author Whether to include the author.
 */
function sl_meta( $post = null, $show_author = false ) {
	$post = get_post( $post );
	echo '<p class="meta">';
	if ( $show_author ) {
		printf( '<span class="meta__author">%s</span><span class="meta__sep" aria-hidden="true">·</span>', esc_html( get_the_author_meta( 'display_name', $post->post_author ) ) );
	}
	sl_posted_on( $post );
	echo '</p>';
}

/**
 * Featured image with a fixed 16:9 frame (no layout shift) or a neutral placeholder.
 *
 * @param int|WP_Post|null $post    Post.
 * @param string           $size    Registered image size.
 * @param string           $sizes   The sizes attribute.
 * @param bool             $eager   Load eagerly (above-the-fold lead images).
 */
function sl_media( $post = null, $size = 'sl-card', $sizes = '(min-width: 1024px) 33vw, 100vw', $eager = false ) {
	$post = get_post( $post );
	echo '<div class="media">';
	if ( has_post_thumbnail( $post ) ) {
		$attrs = array(
			'sizes'   => $sizes,
			'loading' => $eager ? 'eager' : 'lazy',
			// The headline beside the image already names the story; the image is decorative in a card.
			'alt'     => '',
		);
		if ( $eager ) {
			$attrs['fetchpriority'] = 'high';
		}
		echo get_the_post_thumbnail( $post, $size, $attrs ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	} else {
		echo '<span class="media__placeholder" aria-hidden="true"></span>';
	}
	echo '</div>';
}

/**
 * Story card. Variants: lead, rail, feature, standard, compact, row, headline.
 *
 * @param int|WP_Post|null $post    Post.
 * @param string           $variant Card variant.
 * @param array            $args    Extra args: heading level (h), image sizes, eager.
 */
function sl_card( $post = null, $variant = 'standard', $args = array() ) {
	$post = get_post( $post );
	if ( ! $post ) {
		return;
	}
	$args = wp_parse_args(
		$args,
		array(
			'h'       => 'h3',
			'image'   => ! in_array( $variant, array( 'headline', 'row' ), true ),
			'excerpt' => in_array( $variant, array( 'lead', 'feature' ), true ),
			'size'    => 'lead' === $variant ? 'sl-lead' : ( 'compact' === $variant ? 'sl-thumb' : 'sl-card' ),
			'sizes'   => '(min-width: 1024px) 33vw, 100vw',
			'eager'   => false,
			'author'  => 'lead' === $variant,
		)
	);
	$tag = in_array( $args['h'], array( 'h2', 'h3', 'h4' ), true ) ? $args['h'] : 'h3';

	setup_postdata( $post );
	?>
	<article class="card card--<?php echo esc_attr( $variant ); ?>">
		<?php
		if ( $args['image'] ) {
			sl_media( $post, $args['size'], $args['sizes'], $args['eager'] );
		}
		?>
		<div class="card__body">
			<?php sl_category_label( $post ); ?>
			<<?php echo $tag; // phpcs:ignore ?> class="card__title">
				<a href="<?php echo esc_url( get_permalink( $post ) ); ?>"><?php echo esc_html( wp_strip_all_tags( get_the_title( $post ) ) ); ?></a>
			</<?php echo $tag; // phpcs:ignore ?>>
			<?php if ( $args['excerpt'] ) : ?>
				<p class="card__dek"><?php echo esc_html( wp_strip_all_tags( get_the_excerpt( $post ) ) ); ?></p>
			<?php endif; ?>
			<?php sl_meta( $post, $args['author'] ); ?>
		</div>
	</article>
	<?php
	wp_reset_postdata();
}

/**
 * Section heading used across the homepage and archives.
 *
 * @param string $title Heading text.
 * @param string $link  Optional "see all" URL.
 * @param string $label Optional link label.
 * @param string $id    Heading id for aria-labelledby.
 */
function sl_section_head( $title, $link = '', $label = '', $id = '' ) {
	?>
	<div class="section-head">
		<h2 class="section-head__title"<?php echo $id ? ' id="' . esc_attr( $id ) . '"' : ''; ?>><?php echo esc_html( $title ); ?></h2>
		<?php if ( $link ) : ?>
			<a class="section-head__link" href="<?php echo esc_url( $link ); ?>"><?php echo esc_html( $label ? $label : __( 'See all', 'stephenlegal' ) ); ?><span aria-hidden="true"> →</span></a>
		<?php endif; ?>
	</div>
	<?php
}

/**
 * Categories with enough articles to be worth navigating to, largest first.
 *
 * @param int $limit Maximum number of categories.
 * @param int $min   Minimum article count.
 * @return WP_Term[]
 */
function sl_topics( $limit = 12, $min = 3 ) {
	$cats = get_categories(
		array(
			'orderby'    => 'count',
			'order'      => 'DESC',
			'hide_empty' => true,
			'exclude'    => array_filter( array_map( 'sl_category_id_by_slug', array( 'uncategorized', 'sponsored', 'most-viewed', 'editors-choice' ) ) ),
		)
	);
	$cats = array_filter(
		$cats,
		function ( $cat ) use ( $min ) {
			return $cat->count >= $min;
		}
	);
	return array_slice( $cats, 0, $limit );
}

/**
 * @param string $slug Category slug.
 * @return int
 */
function sl_category_id_by_slug( $slug ) {
	$term = get_category_by_slug( $slug );
	return $term ? (int) $term->term_id : 0;
}

/**
 * The "all stories" URL: the posts page if one is set, otherwise page 2 of the blog index.
 *
 * @return string
 */
function sl_all_stories_url() {
	$page_for_posts = (int) get_option( 'page_for_posts' );
	if ( $page_for_posts ) {
		return get_permalink( $page_for_posts );
	}
	return 'page' === get_option( 'show_on_front' ) ? home_url( '/' ) : get_pagenum_link( 2 );
}

/**
 * Header navigation fallback when no menu is assigned to "primary":
 * the largest subject categories.
 */
function sl_fallback_menu() {
	echo '<ul class="nav__list">';
	foreach ( sl_topics( 7, 3 ) as $cat ) {
		if ( in_array( $cat->slug, sl_placement_categories(), true ) && 'trending' !== $cat->slug ) {
			continue;
		}
		$current = is_category( $cat->term_id ) ? ' aria-current="page"' : '';
		printf( '<li class="menu-item"><a href="%s"%s>%s</a></li>', esc_url( get_category_link( $cat ) ), $current, esc_html( $cat->name ) ); // phpcs:ignore
	}
	echo '</ul>';
}

/**
 * Mark the current item of wp_nav_menu with aria-current (WordPress only adds a class).
 *
 * @param array    $atts Link attributes.
 * @param WP_Post  $item Menu item.
 * @return array
 */
function sl_nav_aria_current( $atts, $item ) {
	if ( ! empty( $item->current ) ) {
		$atts['aria-current'] = 'page';
	}
	return $atts;
}
add_filter( 'nav_menu_link_attributes', 'sl_nav_aria_current', 10, 2 );

/**
 * Publication links: the "footer" menu when assigned, otherwise the site's
 * existing Contact, Become a Contributor and Privacy Policy pages (only those that exist).
 */
function sl_publication_links() {
	if ( has_nav_menu( 'footer' ) ) {
		wp_nav_menu(
			array(
				'theme_location' => 'footer',
				'container'      => false,
				'menu_class'     => 'link-list',
				'depth'          => 1,
			)
		);
		return;
	}
	echo '<ul class="link-list">';
	foreach ( array( 'contact', 'become-a-contributor', 'privacy-policy' ) as $path ) {
		$page = get_page_by_path( $path );
		if ( $page && 'publish' === $page->post_status ) {
			printf( '<li><a href="%s">%s</a></li>', esc_url( get_permalink( $page ) ), esc_html( get_the_title( $page ) ) );
		}
	}
	printf( '<li><a href="%s">%s</a></li>', esc_url( get_feed_link() ), esc_html__( 'RSS feed', 'stephenlegal' ) );
	echo '</ul>';
}

/**
 * Numbered pagination with accessible labels.
 */
function sl_pagination() {
	the_posts_pagination(
		array(
			'mid_size'           => 1,
			'prev_text'          => '<span aria-hidden="true">←</span> ' . __( 'Newer', 'stephenlegal' ),
			'next_text'          => __( 'Older', 'stephenlegal' ) . ' <span aria-hidden="true">→</span>',
			'before_page_number' => '<span class="screen-reader-text">' . __( 'Page', 'stephenlegal' ) . ' </span>',
			'aria_label'         => __( 'Pagination', 'stephenlegal' ),
			'class'              => 'pager',
		)
	);
}

/**
 * Breadcrumbs: Home / Category. Yoast still outputs the BreadcrumbList schema via wp_head.
 */
function sl_breadcrumbs() {
	echo '<nav class="crumbs" aria-label="' . esc_attr__( 'Breadcrumb', 'stephenlegal' ) . '"><ol>';
	printf( '<li><a href="%s">%s</a></li>', esc_url( home_url( '/' ) ), esc_html__( 'Home', 'stephenlegal' ) );
	if ( is_singular( 'post' ) ) {
		$cat = sl_primary_category();
		if ( $cat ) {
			printf( '<li><a href="%s">%s</a></li>', esc_url( get_category_link( $cat ) ), esc_html( $cat->name ) );
		}
	} elseif ( is_category() ) {
		printf( '<li aria-current="page">%s</li>', esc_html( single_cat_title( '', false ) ) );
	}
	echo '</ol></nav>';
}
