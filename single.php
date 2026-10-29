<?php
/**
 * Single article.
 *
 * @package StephenLegal
 */

get_header();

while ( have_posts() ) :
	the_post();
	$sl_article = sl_prepare_article();
	$sl_has_toc = sl_show_toc( $sl_article['toc'] );
	$sl_url     = rawurlencode( get_permalink() );
	$sl_title   = rawurlencode( wp_strip_all_tags( get_the_title() ) );
	$sl_updated = get_the_modified_time( 'U' ) - get_the_time( 'U' ) > DAY_IN_SECONDS;
	?>
<main id="main" class="article-page">
	<article <?php post_class( 'article' ); ?>>
		<header class="wrap article-header">
			<?php sl_breadcrumbs(); ?>
			<?php sl_category_label(); ?>
			<h1 class="article-header__title"><?php echo esc_html( wp_strip_all_tags( get_the_title() ) ); ?></h1>
			<?php if ( has_excerpt() ) : ?>
				<p class="article-header__dek"><?php echo esc_html( get_the_excerpt() ); ?></p>
			<?php endif; ?>
			<div class="byline">
				<p class="byline__author">
					<?php esc_html_e( 'By', 'stephenlegal' ); ?>
					<a href="<?php echo esc_url( get_author_posts_url( get_the_author_meta( 'ID' ) ) ); ?>" rel="author"><?php the_author(); ?></a>
				</p>
				<p class="byline__meta meta">
					<?php sl_posted_on( null, 'j F Y' ); ?>
					<?php if ( $sl_updated ) : ?>
						<span class="meta__sep" aria-hidden="true">·</span>
						<span><?php esc_html_e( 'Updated', 'stephenlegal' ); ?> <time datetime="<?php echo esc_attr( get_the_modified_date( DATE_W3C ) ); ?>"><?php echo esc_html( get_the_modified_date( 'j F Y' ) ); ?></time></span>
					<?php endif; ?>
					<span class="meta__sep" aria-hidden="true">·</span>
					<span>
					<?php
					/* translators: %d: minutes */
					echo esc_html( sprintf( __( '%d min read', 'stephenlegal' ), sl_reading_minutes() ) );
					?>
					</span>
				</p>
			</div>
		</header>

		<?php if ( has_post_thumbnail() ) : ?>
			<?php $sl_caption = get_the_post_thumbnail_caption(); ?>
			<figure class="wrap article-hero">
				<div class="media media--hero">
					<?php
					the_post_thumbnail(
						'sl-lead',
						array(
							'sizes'         => '(min-width: 1360px) 1264px, 100vw',
							'loading'       => 'eager',
							'fetchpriority' => 'high',
							'alt'           => trim( wp_strip_all_tags( get_post_meta( get_post_thumbnail_id(), '_wp_attachment_image_alt', true ) ) ),
						)
					);
					?>
				</div>
				<?php if ( $sl_caption ) : ?>
					<figcaption><?php echo wp_kses_post( $sl_caption ); ?></figcaption>
				<?php endif; ?>
			</figure>
		<?php endif; ?>

		<div class="wrap article-layout<?php echo $sl_has_toc ? ' has-toc' : ''; ?>">
			<?php if ( $sl_has_toc ) : ?>
				<aside class="toc" aria-labelledby="toc-title">
					<details open>
						<summary id="toc-title"><?php esc_html_e( 'In this article', 'stephenlegal' ); ?></summary>
						<ol>
							<?php foreach ( $sl_article['toc'] as $sl_h ) : ?>
								<li class="toc__l<?php echo (int) $sl_h['level']; ?>"><a href="#<?php echo esc_attr( $sl_h['id'] ); ?>"><?php echo esc_html( $sl_h['text'] ); ?></a></li>
							<?php endforeach; ?>
						</ol>
					</details>
				</aside>
			<?php endif; ?>

			<div class="article-main">
				<div class="entry-content">
					<?php echo $sl_article['html']; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- the_content output. ?>
				</div>

				<?php
				wp_link_pages(
					array(
						'before' => '<nav class="page-links" aria-label="' . esc_attr__( 'Article pages', 'stephenlegal' ) . '">',
						'after'  => '</nav>',
					)
				);
				?>

				<aside class="disclaimer" aria-label="<?php esc_attr_e( 'Disclaimer', 'stephenlegal' ); ?>">
					<p><strong><?php esc_html_e( 'Not legal advice.', 'stephenlegal' ); ?></strong> <?php echo esc_html( get_theme_mod( 'sl_disclaimer', sl_default_disclaimer() ) ); ?></p>
				</aside>

				<div class="article-foot">
					<?php
					$sl_tags = get_the_tags();
					if ( $sl_tags ) :
						?>
						<ul class="tags" aria-label="<?php esc_attr_e( 'Tags', 'stephenlegal' ); ?>">
							<?php foreach ( $sl_tags as $sl_tag ) : ?>
								<li><a href="<?php echo esc_url( get_tag_link( $sl_tag ) ); ?>"><?php echo esc_html( $sl_tag->name ); ?></a></li>
							<?php endforeach; ?>
						</ul>
					<?php endif; ?>

					<div class="share">
						<p class="share__label"><?php esc_html_e( 'Share', 'stephenlegal' ); ?></p>
						<ul class="share__list">
							<li><a href="https://twitter.com/intent/tweet?url=<?php echo esc_attr( $sl_url ); ?>&amp;text=<?php echo esc_attr( $sl_title ); ?>" target="_blank" rel="noopener">X<span class="screen-reader-text"> <?php esc_html_e( '(opens in a new tab)', 'stephenlegal' ); ?></span></a></li>
							<li><a href="https://www.facebook.com/sharer/sharer.php?u=<?php echo esc_attr( $sl_url ); ?>" target="_blank" rel="noopener">Facebook<span class="screen-reader-text"> <?php esc_html_e( '(opens in a new tab)', 'stephenlegal' ); ?></span></a></li>
							<li><a href="https://www.linkedin.com/sharing/share-offsite/?url=<?php echo esc_attr( $sl_url ); ?>" target="_blank" rel="noopener">LinkedIn<span class="screen-reader-text"> <?php esc_html_e( '(opens in a new tab)', 'stephenlegal' ); ?></span></a></li>
							<li><a href="https://wa.me/?text=<?php echo esc_attr( $sl_title . '%20' . $sl_url ); ?>" target="_blank" rel="noopener">WhatsApp<span class="screen-reader-text"> <?php esc_html_e( '(opens in a new tab)', 'stephenlegal' ); ?></span></a></li>
							<li><button type="button" class="share__copy" data-copy="<?php echo esc_url( get_permalink() ); ?>" hidden><?php esc_html_e( 'Copy link', 'stephenlegal' ); ?></button><span class="share__status" role="status"></span></li>
						</ul>
					</div>

					<?php if ( get_the_author_meta( 'description' ) ) : ?>
						<section class="author-box" aria-label="<?php esc_attr_e( 'About the author', 'stephenlegal' ); ?>">
							<?php echo get_avatar( get_the_author_meta( 'ID' ), 72, '', '' ); ?>
							<div>
								<p class="author-box__name"><a href="<?php echo esc_url( get_author_posts_url( get_the_author_meta( 'ID' ) ) ); ?>"><?php the_author(); ?></a></p>
								<p><?php echo esc_html( get_the_author_meta( 'description' ) ); ?></p>
							</div>
						</section>
					<?php endif; ?>
				</div>
			</div>
		</div>
	</article>

	<?php
	$sl_prev = get_previous_post();
	$sl_next = get_next_post();
	if ( $sl_prev || $sl_next ) :
		?>
		<nav class="wrap post-nav" aria-label="<?php esc_attr_e( 'More articles', 'stephenlegal' ); ?>">
			<?php if ( $sl_prev ) : ?>
				<a class="post-nav__link" href="<?php echo esc_url( get_permalink( $sl_prev ) ); ?>" rel="prev"><span class="post-nav__dir"><span aria-hidden="true">←</span> <?php esc_html_e( 'Previous', 'stephenlegal' ); ?></span><span class="post-nav__title"><?php echo esc_html( wp_strip_all_tags( get_the_title( $sl_prev ) ) ); ?></span></a>
			<?php endif; ?>
			<?php if ( $sl_next ) : ?>
				<a class="post-nav__link post-nav__link--next" href="<?php echo esc_url( get_permalink( $sl_next ) ); ?>" rel="next"><span class="post-nav__dir"><?php esc_html_e( 'Next', 'stephenlegal' ); ?> <span aria-hidden="true">→</span></span><span class="post-nav__title"><?php echo esc_html( wp_strip_all_tags( get_the_title( $sl_next ) ) ); ?></span></a>
			<?php endif; ?>
		</nav>
	<?php endif; ?>

	<?php $sl_related = sl_related_posts( 3 ); ?>
	<?php if ( $sl_related ) : ?>
		<?php $sl_cat = sl_primary_category(); ?>
		<section class="wrap section related" aria-labelledby="related-title">
			<?php sl_section_head( __( 'Related reading', 'stephenlegal' ), $sl_cat ? get_category_link( $sl_cat ) : '', $sl_cat ? sprintf( /* translators: %s: category */ __( 'More in %s', 'stephenlegal' ), $sl_cat->name ) : '', 'related-title' ); ?>
			<div class="grid-3">
				<?php
				foreach ( $sl_related as $sl_post ) {
					sl_card( $sl_post, 'standard', array( 'sizes' => '(min-width: 1024px) 33vw, 100vw' ) );
				}
				?>
			</div>
		</section>
	<?php endif; ?>

	<?php if ( comments_open() || get_comments_number() ) : ?>
		<div class="wrap comments-wrap">
			<?php comments_template(); ?>
		</div>
	<?php endif; ?>
</main>
	<?php
endwhile;

get_footer();
