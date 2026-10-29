<?php
/**
 * Fallback listing (the posts page, e.g. /blog/).
 *
 * @package StephenLegal
 */

get_header();
?>
<main id="main" class="archive-page">
	<header class="wrap archive-header">
		<p class="archive-header__kicker"><?php esc_html_e( 'Archive', 'stephenlegal' ); ?></p>
		<h1 class="archive-header__title"><?php echo is_home() && get_option( 'page_for_posts' ) ? esc_html( get_the_title( get_option( 'page_for_posts' ) ) ) : esc_html__( 'All stories', 'stephenlegal' ); ?></h1>
		<p class="archive-header__count meta">
			<?php
			global $wp_query;
			/* translators: %s: number of articles */
			echo esc_html( sprintf( _n( '%s article', '%s articles', (int) $wp_query->found_posts, 'stephenlegal' ), number_format_i18n( (int) $wp_query->found_posts ) ) );
			?>
		</p>
	</header>

	<?php get_template_part( 'template-parts/topic-nav' ); ?>

	<div class="wrap section">
		<?php if ( have_posts() ) : ?>
			<div class="archive-grid">
				<?php
				while ( have_posts() ) :
					the_post();
					sl_card( null, 'standard', array( 'h' => 'h2', 'sizes' => '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw' ) );
				endwhile;
				?>
			</div>
			<?php sl_pagination(); ?>
		<?php else : ?>
			<p class="empty"><?php esc_html_e( 'Nothing found.', 'stephenlegal' ); ?></p>
		<?php endif; ?>
	</div>
</main>
<?php
get_footer();
