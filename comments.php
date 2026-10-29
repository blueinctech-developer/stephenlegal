<?php
/**
 * Comments.
 *
 * @package StephenLegal
 */

if ( post_password_required() ) {
	return;
}
?>
<section id="comments" class="comments" aria-label="<?php esc_attr_e( 'Comments', 'stephenlegal' ); ?>">
	<?php if ( have_comments() ) : ?>
		<h2 class="section-head__title">
			<?php
			$sl_count = get_comments_number();
			/* translators: %s: comment count */
			echo esc_html( sprintf( _n( '%s comment', '%s comments', $sl_count, 'stephenlegal' ), number_format_i18n( $sl_count ) ) );
			?>
		</h2>
		<ol class="comment-list">
			<?php
			wp_list_comments(
				array(
					'style'       => 'ol',
					'short_ping'  => true,
					'avatar_size' => 40,
				)
			);
			?>
		</ol>
		<?php the_comments_navigation(); ?>
	<?php endif; ?>

	<?php
	comment_form(
		array(
			'class_submit'       => 'btn',
			'title_reply_before' => '<h3 id="reply-title" class="comment-reply-title">',
			'title_reply_after'  => '</h3>',
		)
	);
	?>
</section>
