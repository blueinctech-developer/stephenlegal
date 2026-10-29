<?php
/**
 * Site header.
 *
 * @package StephenLegal
 */

?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta name="theme-color" content="#17191F">
	<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<a class="skip-link" href="#main"><?php esc_html_e( 'Skip to content', 'stephenlegal' ); ?></a>

<header class="site-header">
	<div class="wrap site-header__bar">
		<div class="brand">
			<?php if ( has_custom_logo() ) : ?>
				<?php the_custom_logo(); ?>
			<?php else : ?>
				<a class="logo" href="<?php echo esc_url( home_url( '/' ) ); ?>" rel="home">
					<img src="<?php echo esc_url( get_template_directory_uri() . '/assets/img/logo-dark.png' ); ?>" width="437" height="72" alt="<?php echo esc_attr( get_bloginfo( 'name' ) . ' — ' . __( 'home', 'stephenlegal' ) ); ?>">
				</a>
			<?php endif; ?>
			<?php if ( get_bloginfo( 'description' ) ) : ?>
				<p class="brand__tagline"><?php bloginfo( 'description' ); ?></p>
			<?php endif; ?>
		</div>

		<nav class="nav" aria-label="<?php esc_attr_e( 'Sections', 'stephenlegal' ); ?>">
			<?php
			wp_nav_menu(
				array(
					'theme_location' => 'primary',
					'container'      => false,
					'menu_class'     => 'nav__list',
					'depth'          => 1,
					'fallback_cb'    => 'sl_fallback_menu',
				)
			);
			?>
		</nav>

		<div class="site-header__tools">
			<form class="header-search" role="search" method="get" action="<?php echo esc_url( home_url( '/' ) ); ?>">
				<label class="screen-reader-text" for="header-s"><?php esc_html_e( 'Search articles', 'stephenlegal' ); ?></label>
				<input id="header-s" type="search" name="s" placeholder="<?php esc_attr_e( 'Search articles', 'stephenlegal' ); ?>" value="<?php echo esc_attr( get_search_query() ); ?>">
				<button type="submit" class="icon-btn" aria-label="<?php esc_attr_e( 'Submit search', 'stephenlegal' ); ?>">
					<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15.5 15.5 21 21" stroke="currentColor" stroke-width="2" stroke-linecap="square"/></svg>
				</button>
			</form>
			<button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-menu">
				<span class="menu-toggle__icon" aria-hidden="true"><span></span></span>
				<span class="menu-toggle__label"><?php esc_html_e( 'Menu', 'stephenlegal' ); ?></span>
			</button>
		</div>
	</div>

	<div class="site-menu" id="site-menu" hidden>
		<div class="wrap site-menu__inner">
			<div class="site-menu__search">
				<?php get_search_form(); ?>
			</div>
			<div class="site-menu__topics">
				<h2 class="site-menu__title"><?php esc_html_e( 'Topics', 'stephenlegal' ); ?></h2>
				<ul class="topic-list">
					<?php foreach ( sl_topics( 18, 1 ) as $topic ) : ?>
						<li><a href="<?php echo esc_url( get_category_link( $topic ) ); ?>"<?php echo is_category( $topic->term_id ) ? ' aria-current="page"' : ''; ?>><?php echo esc_html( $topic->name ); ?> <span class="count"><?php echo esc_html( number_format_i18n( $topic->count ) ); ?></span></a></li>
					<?php endforeach; ?>
				</ul>
			</div>
			<div class="site-menu__pages">
				<h2 class="site-menu__title"><?php esc_html_e( 'Stephen Legal', 'stephenlegal' ); ?></h2>
				<?php sl_publication_links(); ?>
			</div>
		</div>
	</div>
</header>
<?php if ( is_singular( 'post' ) ) : ?>
	<div class="progress" aria-hidden="true"></div>
<?php endif; ?>
