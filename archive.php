<?php
/**
 * Category, tag, author and date archives.
 *
 * @package StephenLegal
 */

get_header();

$sl_first_page = ! is_paged();
?>
<main id="main" class="archive-page">
	<header class="wrap archive-header">
		<?php sl_breadcrumbs(); ?>
		<p class="archive-header__kicker">
			<?php
			if ( is_category() ) {
				esc_html_e( 'Topic', 'stephenlegal' );
			} elseif ( is_tag() ) {
				esc_html_e( 'Tag', 'stephenlegal' );
			} elseif ( is_author() ) {
				esc_html_e( 'Author', 'stephenlegal' );
			} else {
				esc_html_e( 'Archive', 'stephenlegal' );
			}
			?>
		</p>
		<h1 class="archive-header__title"><?php echo esc_html( wp_strip_all_tags( get_the_archive_title() ) ); ?></h1>
		<?php the_archive_description( '<div class="archive-header__desc">', '</div>' ); ?>
		<p class="archive-header__count meta">
			<?php
			global $wp_query;
			/* translators: %s: number of articles */
			echo esc_html( sprintf( _n( '%s article', '%s articles', (int) $wp_query->found_posts, 'stephenlegal' ), number_format_i18n( (int) $wp_query->found_posts ) ) );
			if ( is_paged() ) {
				/* translators: 1: current page, 2: total pages */
				echo esc_html( ' · ' . sprintf( __( 'Page %1$d of %2$d', 'stephenlegal' ), max( 1, get_query_var( 'paged' ) ), $wp_query->max_num_pages ) );
			}
			?>
		</p>
	</header>

	<?php get_template_part( 'template-parts/topic-nav' ); ?>

	<div class="wrap section">
		<?php if ( have_posts() ) : ?>
			<div class="archive-grid<?php echo $sl_first_page ? ' is-first-page' : ''; ?>">
				<?php
				$sl_i = 0;
				while ( have_posts() ) :
					the_post();
					if ( $sl_first_page && 0 === $sl_i ) {
						sl_card( null, 'feature', array( 'h' => 'h2', 'eager' => true, 'sizes' => '(min-width: 1024px) 66vw, 100vw' ) );
					} else {
						sl_card( null, 'standard', array( 'h' => 'h2', 'sizes' => '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw' ) );
					}
					++$sl_i;
				endwhile;
				?>
			</div>
			<?php sl_pagination(); ?>
		<?php else : ?>
			<p class="empty"><?php esc_html_e( 'No articles here yet.', 'stephenlegal' ); ?></p>
		<?php endif; ?>
	</div>
</main>
<?php
get_footer();
