<?php
/**
 * Homepage: lead story, latest analysis, topics, featured insight, desks, recent.
 *
 * @package StephenLegal
 */

// When the front page lists posts, page 2+ is a plain archive.
if ( is_home() && is_paged() ) {
	require get_template_directory() . '/index.php';
	return;
}

get_header();

$sl_lead     = SL_Story_Pool::lead( 3 );
$sl_latest   = SL_Story_Pool::take( 5 );
$sl_feature  = SL_Story_Pool::take( 1, array( 'category_name' => get_theme_mod( 'sl_feature_category', 'legal-explainer' ) ) );
$sl_desk_cat = array_filter( array_map( 'get_category_by_slug', array_slice( array_map( 'trim', explode( ',', get_theme_mod( 'sl_desk_categories', 'case-law,opinions,law-news' ) ) ), 0, 3 ) ) );
$sl_desks    = array();
foreach ( $sl_desk_cat as $sl_cat ) {
	$sl_desks[] = array(
		'cat'   => $sl_cat,
		'posts' => SL_Story_Pool::take( 4, array( 'cat' => $sl_cat->term_id ) ),
	);
}
$sl_recent = SL_Story_Pool::take( 10 );
?>
<main id="main" class="home">
	<h1 class="screen-reader-text"><?php bloginfo( 'name' ); ?> — <?php esc_html_e( 'latest legal news and analysis', 'stephenlegal' ); ?></h1>

	<?php if ( $sl_lead ) : ?>
	<section class="wrap lead-zone" aria-label="<?php esc_attr_e( 'Top stories', 'stephenlegal' ); ?>">
		<div class="lead-zone__lead">
			<?php sl_card( $sl_lead[0], 'lead', array( 'h' => 'h2', 'eager' => true, 'sizes' => '(min-width: 1024px) 64vw, 100vw' ) ); ?>
		</div>
		<?php if ( count( $sl_lead ) > 1 ) : ?>
			<div class="lead-zone__rail">
				<p class="rail-label"><?php esc_html_e( 'Also leading', 'stephenlegal' ); ?></p>
				<?php
				foreach ( array_slice( $sl_lead, 1 ) as $sl_post ) {
					sl_card( $sl_post, 'rail', array( 'h' => 'h2', 'sizes' => '(min-width: 1024px) 28vw, 100vw' ) );
				}
				?>
			</div>
		<?php endif; ?>
	</section>
	<?php endif; ?>

	<?php if ( $sl_latest ) : ?>
	<section class="wrap section" aria-labelledby="latest-title">
		<?php sl_section_head( __( 'Latest analysis', 'stephenlegal' ), sl_all_stories_url(), __( 'All stories', 'stephenlegal' ), 'latest-title' ); ?>
		<div class="mosaic">
			<?php
			foreach ( $sl_latest as $sl_i => $sl_post ) {
				if ( 0 === $sl_i ) {
					sl_card( $sl_post, 'feature', array( 'sizes' => '(min-width: 1024px) 50vw, 100vw' ) );
				} else {
					sl_card( $sl_post, 'standard', array( 'sizes' => '(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw' ) );
				}
			}
			?>
		</div>
	</section>
	<?php endif; ?>

	<?php $sl_topics = sl_topics( 12, 3 ); ?>
	<?php if ( $sl_topics ) : ?>
	<section class="wrap section" aria-labelledby="topics-title">
		<?php sl_section_head( __( 'Browse by topic', 'stephenlegal' ), '', '', 'topics-title' ); ?>
		<ul class="topics">
			<?php foreach ( $sl_topics as $sl_topic ) : ?>
				<li class="topics__item">
					<a href="<?php echo esc_url( get_category_link( $sl_topic ) ); ?>">
						<span class="topics__name"><?php echo esc_html( $sl_topic->name ); ?></span>
						<span class="topics__count">
							<?php
							/* translators: %s: number of articles */
							echo esc_html( sprintf( _n( '%s article', '%s articles', $sl_topic->count, 'stephenlegal' ), number_format_i18n( $sl_topic->count ) ) );
							?>
						</span>
					</a>
				</li>
			<?php endforeach; ?>
		</ul>
	</section>
	<?php endif; ?>

	<?php if ( $sl_feature ) : ?>
		<?php
		$sl_post = $sl_feature[0];
		$sl_fcat = get_category_by_slug( get_theme_mod( 'sl_feature_category', 'legal-explainer' ) );
		?>
	<section class="insight surface-dark" aria-labelledby="insight-title">
		<div class="wrap insight__grid">
			<div class="insight__text">
				<p class="insight__label"><?php esc_html_e( 'Featured insight', 'stephenlegal' ); ?><?php echo $sl_fcat ? ' · ' . esc_html( $sl_fcat->name ) : ''; ?></p>
				<h2 class="insight__title" id="insight-title"><a href="<?php echo esc_url( get_permalink( $sl_post ) ); ?>"><?php echo esc_html( wp_strip_all_tags( get_the_title( $sl_post ) ) ); ?></a></h2>
				<p class="insight__dek"><?php echo esc_html( wp_strip_all_tags( get_the_excerpt( $sl_post ) ) ); ?></p>
				<p class="meta">
					<?php echo esc_html( get_the_author_meta( 'display_name', $sl_post->post_author ) ); ?><span class="meta__sep" aria-hidden="true">·</span><?php sl_posted_on( $sl_post ); ?><span class="meta__sep" aria-hidden="true">·</span>
					<?php
					/* translators: %d: minutes */
					echo esc_html( sprintf( __( '%d min read', 'stephenlegal' ), sl_reading_minutes( $sl_post ) ) );
					?>
				</p>
				<a class="btn btn--accent" href="<?php echo esc_url( get_permalink( $sl_post ) ); ?>" aria-describedby="insight-title"><?php esc_html_e( 'Read the analysis', 'stephenlegal' ); ?> <span aria-hidden="true">→</span></a>
			</div>
			<div class="insight__media">
				<?php sl_media( $sl_post, 'sl-lead', '(min-width: 1024px) 55vw, 100vw' ); ?>
			</div>
		</div>
	</section>
	<?php endif; ?>

	<?php if ( $sl_desks ) : ?>
	<section class="wrap section" aria-labelledby="desks-title">
		<?php sl_section_head( __( 'From the desks', 'stephenlegal' ), '', '', 'desks-title' ); ?>
		<div class="desks">
			<?php foreach ( $sl_desks as $sl_desk ) : ?>
				<?php
				if ( ! $sl_desk['posts'] ) {
					continue;
				}
				?>
				<div class="desk">
					<h3 class="desk__title"><a href="<?php echo esc_url( get_category_link( $sl_desk['cat'] ) ); ?>"><?php echo esc_html( $sl_desk['cat']->name ); ?> <span aria-hidden="true">→</span></a></h3>
					<?php
					foreach ( $sl_desk['posts'] as $sl_i => $sl_post ) {
						sl_card( $sl_post, 0 === $sl_i ? 'standard' : 'headline', array( 'h' => 'h4', 'sizes' => '(min-width: 1024px) 30vw, 100vw' ) );
					}
					?>
				</div>
			<?php endforeach; ?>
		</div>
	</section>
	<?php endif; ?>

	<?php if ( $sl_recent ) : ?>
	<section class="wrap section" aria-labelledby="recent-title">
		<?php sl_section_head( __( 'More stories', 'stephenlegal' ), '', '', 'recent-title' ); ?>
		<div class="rows">
			<?php
			foreach ( $sl_recent as $sl_post ) {
				sl_card( $sl_post, 'row' );
			}
			?>
		</div>
		<p class="more"><a class="btn" href="<?php echo esc_url( sl_all_stories_url() ); ?>"><?php esc_html_e( 'Browse all stories', 'stephenlegal' ); ?> <span aria-hidden="true">→</span></a></p>
	</section>
	<?php endif; ?>
</main>
<?php
get_footer();
