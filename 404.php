<?php
/**
 * Not found.
 *
 * @package StephenLegal
 */

get_header();
?>
<main id="main" class="not-found">
	<header class="wrap archive-header">
		<p class="archive-header__kicker">404</p>
		<h1 class="archive-header__title"><?php esc_html_e( 'This page could not be found', 'stephenlegal' ); ?></h1>
		<p class="archive-header__desc"><?php esc_html_e( 'The link may be broken or the article may have moved. Search the archive or start from the latest stories.', 'stephenlegal' ); ?></p>
		<div class="search-page__form"><?php get_search_form(); ?></div>
	</header>
	<section class="wrap section" aria-labelledby="nf-latest">
		<?php sl_section_head( __( 'Latest stories', 'stephenlegal' ), '', '', 'nf-latest' ); ?>
		<div class="grid-3">
			<?php
			foreach ( get_posts( array( 'posts_per_page' => 3, 'no_found_rows' => true ) ) as $sl_post ) {
				sl_card( $sl_post, 'standard', array( 'h' => 'h3' ) );
			}
			?>
		</div>
	</section>
</main>
<?php
get_footer();
