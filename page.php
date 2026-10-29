<?php
/**
 * Static pages (Contact, Become a Contributor, Privacy Policy…).
 *
 * @package StephenLegal
 */

get_header();

while ( have_posts() ) :
	the_post();
	?>
<main id="main" class="page">
	<header class="wrap page-header">
		<h1 class="page-header__title"><?php the_title(); ?></h1>
	</header>
	<div class="wrap">
		<div class="entry-content page-content">
			<?php the_content(); ?>
		</div>
	</div>
</main>
	<?php
endwhile;

get_footer();
