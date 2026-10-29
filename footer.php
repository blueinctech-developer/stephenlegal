<?php
/**
 * Site footer.
 *
 * @package StephenLegal
 */

?>
<footer class="site-footer surface-dark">
	<div class="wrap">
		<div class="site-footer__top">
			<a class="logo logo--footer" href="<?php echo esc_url( home_url( '/' ) ); ?>">
				<img src="<?php echo esc_url( get_template_directory_uri() . '/assets/img/logo-light.png' ); ?>" width="437" height="72" alt="<?php echo esc_attr( get_bloginfo( 'name' ) ); ?>" loading="lazy">
			</a>
			<form class="footer-search" role="search" method="get" action="<?php echo esc_url( home_url( '/' ) ); ?>">
				<label for="footer-s"><?php esc_html_e( 'Search the archive', 'stephenlegal' ); ?></label>
				<div class="field-row">
					<input id="footer-s" type="search" name="s" value="<?php echo esc_attr( get_search_query() ); ?>">
					<button type="submit" class="btn btn--accent"><?php esc_html_e( 'Search', 'stephenlegal' ); ?></button>
				</div>
			</form>
		</div>

		<div class="site-footer__cols">
			<div>
				<h2 class="footer-title"><?php esc_html_e( 'Topics', 'stephenlegal' ); ?></h2>
				<ul class="link-list link-list--cols">
					<?php foreach ( sl_topics( 10, 5 ) as $topic ) : ?>
						<li><a href="<?php echo esc_url( get_category_link( $topic ) ); ?>"><?php echo esc_html( $topic->name ); ?></a></li>
					<?php endforeach; ?>
				</ul>
			</div>
			<div>
				<h2 class="footer-title"><?php esc_html_e( 'Publication', 'stephenlegal' ); ?></h2>
				<?php sl_publication_links(); ?>
			</div>
			<div>
				<h2 class="footer-title"><?php esc_html_e( 'Follow', 'stephenlegal' ); ?></h2>
				<ul class="link-list">
					<?php foreach ( sl_social_links() as $label => $url ) : ?>
						<li><a href="<?php echo esc_url( $url ); ?>" rel="noopener me" target="_blank"><?php echo esc_html( $label ); ?><span class="screen-reader-text"> <?php esc_html_e( '(opens in a new tab)', 'stephenlegal' ); ?></span></a></li>
					<?php endforeach; ?>
				</ul>
			</div>
		</div>

		<div class="site-footer__legal">
			<p class="site-footer__disclaimer"><?php echo esc_html( get_theme_mod( 'sl_disclaimer', sl_default_disclaimer() ) ); ?></p>
			<p>&copy; <?php echo esc_html( wp_date( 'Y' ) ); ?> <?php bloginfo( 'name' ); ?>. <?php esc_html_e( 'All rights reserved.', 'stephenlegal' ); ?></p>
		</div>
	</div>
</footer>
<?php wp_footer(); ?>
</body>
</html>
