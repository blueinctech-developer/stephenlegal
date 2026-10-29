<?php
/**
 * Search results.
 *
 * @package StephenLegal
 */

get_header();
global $wp_query;
?>
<main id="main" class="search-page">
	<header class="wrap archive-header">
		<p class="archive-header__kicker"><?php esc_html_e( 'Search', 'stephenlegal' ); ?></p>
		<h1 class="archive-header__title">
			<?php
			if ( get_search_query() ) {
				/* translators: %s: search terms */
				printf( esc_html__( 'Results for “%s”', 'stephenlegal' ), esc_html( get_search_query() ) );
			} else {
				esc_html_e( 'Search the archive', 'stephenlegal' );
			}
			?>
		</h1>
		<p class="archive-header__count meta" role="status">
			<?php
			/* translators: %s: number of results */
			echo esc_html( sprintf( _n( '%s result', '%s results', (int) $wp_query->found_posts, 'stephenlegal' ), number_format_i18n( (int) $wp_query->found_posts ) ) );
			?>
		</p>
		<div class="search-page__form"><?php get_search_form(); ?></div>
	</header>

	<div class="wrap section">
		<?php if ( have_posts() && get_search_query() ) : ?>
			<div class="results">
				<?php
				while ( have_posts() ) :
					the_post();
					?>
					<article class="result">
						<?php sl_media( null, 'sl-thumb', '(min-width: 640px) 200px, 100vw' ); ?>
						<div class="result__body">
							<?php sl_category_label(); ?>
							<h2 class="result__title"><a href="<?php the_permalink(); ?>"><?php echo esc_html( wp_strip_all_tags( get_the_title() ) ); ?></a></h2>
							<p class="result__excerpt"><?php echo esc_html( wp_strip_all_tags( get_the_excerpt() ) ); ?></p>
							<?php sl_meta( null, true ); ?>
						</div>
					</article>
				<?php endwhile; ?>
			</div>
			<?php sl_pagination(); ?>
		<?php else : ?>
			<div class="empty">
				<p><?php esc_html_e( 'No articles matched. Try a case name, a court, or one of these topics:', 'stephenlegal' ); ?></p>
			</div>
			<?php get_template_part( 'template-parts/topic-nav' ); ?>
		<?php endif; ?>
	</div>
</main>
<?php
get_footer();
