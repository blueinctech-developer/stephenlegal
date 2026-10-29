<?php
/**
 * Horizontal topic navigation for archives and search.
 *
 * @package StephenLegal
 */

$sl_topics = sl_topics( 14, 3 );
if ( ! $sl_topics ) {
	return;
}
?>
<nav class="topic-nav" aria-label="<?php esc_attr_e( 'Topics', 'stephenlegal' ); ?>">
	<div class="wrap">
		<ul class="topic-nav__list">
			<?php foreach ( $sl_topics as $sl_topic ) : ?>
				<li><a href="<?php echo esc_url( get_category_link( $sl_topic ) ); ?>"<?php echo is_category( $sl_topic->term_id ) ? ' aria-current="page"' : ''; ?>><?php echo esc_html( $sl_topic->name ); ?></a></li>
			<?php endforeach; ?>
		</ul>
	</div>
</nav>
