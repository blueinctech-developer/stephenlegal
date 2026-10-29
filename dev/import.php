<?php
/**
 * DEV ONLY: seeds a local WordPress Playground with real stephenlegal.ng content
 * (fetched from the public REST API) so the theme can be tested. Not part of the theme.
 */

wp_set_current_user( 1 );
$dir   = __DIR__;
$cats  = json_decode( file_get_contents( $dir . '/cats.json' ), true );
$posts = json_decode( file_get_contents( $dir . '/posts.json' ), true );
$pages = json_decode( file_get_contents( $dir . '/pages.json' ), true );

$cat_map = array();
foreach ( $cats as $c ) {
	$t = term_exists( $c['slug'], 'category' );
	if ( ! $t ) {
		$t = wp_insert_term( html_entity_decode( $c['name'], ENT_QUOTES ), 'category', array( 'slug' => $c['slug'], 'description' => $c['description'] ) );
	}
	if ( ! is_wp_error( $t ) ) {
		$cat_map[ $c['id'] ] = (int) $t['term_id'];
	}
}

$authors = array();
foreach ( array_reverse( $posts ) as $p ) {
	$name = $p['_embedded']['author'][0]['name'] ?? 'Stephen Legal';
	if ( ! isset( $authors[ $name ] ) ) {
		$login = sanitize_user( strtolower( str_replace( ' ', '', $name ) ) );
		$uid   = username_exists( $login );
		if ( ! $uid ) {
			$uid = wp_insert_user( array( 'user_login' => $login, 'user_pass' => wp_generate_password(), 'display_name' => $name, 'role' => 'author' ) );
		}
		$authors[ $name ] = $uid;
	}

	$post_id = wp_insert_post(
		array(
			'post_title'    => html_entity_decode( $p['title']['rendered'], ENT_QUOTES, 'UTF-8' ),
			'post_name'     => $p['slug'],
			'post_content'  => $p['content']['rendered'],
			'post_status'   => 'publish',
			'post_date'     => $p['date'],
			'post_modified' => $p['modified'],
			'post_author'   => $authors[ $name ],
			'post_category' => array_values( array_filter( array_map( function ( $id ) use ( $cat_map ) { return $cat_map[ $id ] ?? 0; }, $p['categories'] ) ) ),
		)
	);

	$media = $p['_embedded']['wp:featuredmedia'][0] ?? null;
	if ( $post_id && $media && ! empty( $media['source_url'] ) ) {
		$att = wp_insert_post(
			array(
				'post_type'      => 'attachment',
				'post_mime_type' => $media['mime_type'] ?? 'image/jpeg',
				'post_title'     => $media['title']['rendered'] ?? '',
				'post_excerpt'   => wp_strip_all_tags( $media['caption']['rendered'] ?? '' ),
				'post_status'    => 'inherit',
				'post_parent'    => $post_id,
				'guid'           => $media['source_url'],
			)
		);
		update_post_meta( $att, '_sl_remote_url', $media['source_url'] );
		update_post_meta( $att, '_wp_attachment_image_alt', $media['alt_text'] ?? '' );
		update_post_meta( $att, '_wp_attachment_metadata', array( 'width' => $media['media_details']['width'] ?? 1200, 'height' => $media['media_details']['height'] ?? 675, 'file' => basename( $media['source_url'] ), 'sizes' => array() ) );
		set_post_thumbnail( $post_id, $att );
	}
}

foreach ( $pages as $pg ) {
	$content = preg_replace( '#<(script|style)[^>]*>.*?</\1>#is', '', $pg['content']['rendered'] );
	wp_insert_post( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => html_entity_decode( $pg['title']['rendered'] ), 'post_name' => $pg['slug'], 'post_content' => $content ) );
}
$home = wp_insert_post( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => 'Home', 'post_name' => 'home' ) );
$blog = wp_insert_post( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => 'Blog', 'post_name' => 'blog' ) );
update_option( 'show_on_front', 'page' );
update_option( 'page_on_front', $home );
update_option( 'page_for_posts', $blog );
update_option( 'blogname', 'Stephen Legal' );
update_option( 'blogdescription', '' );
update_option( 'permalink_structure', '/%postname%/' );
flush_rewrite_rules();
wp_delete_post( 1, true );
echo 'Imported ' . count( $posts ) . " posts\n";
