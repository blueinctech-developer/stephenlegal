<?php
/**
 * DEV ONLY: serve imported featured images from stephenlegal.ng instead of local uploads.
 */
add_filter(
	'wp_get_attachment_url',
	function ( $url, $id ) {
		$remote = get_post_meta( $id, '_sl_remote_url', true );
		return $remote ? $remote : $url;
	},
	10,
	2
);

add_filter(
	'wp_redirect',
	function ( $location ) {
		if ( isset( $_GET['sl_dbg'] ) ) {
			global $wp_query, $wp;
			wp_die( '<pre>' . esc_html( $location . "\n" . wp_debug_backtrace_summary() . "\n" . $wp->matched_rule . "\n" . print_r( $wp->query_vars, true ) . ' 404:' . (int) $wp_query->is_404 ) );
		}
		return $location;
	}
);

// One-off repair: link imported attachments to their posts (?sl_fix_thumbs=1).
add_action(
	'init',
	function () {
		if ( ! empty( $_GET['sl_rules'] ) ) {
			$path = trim( wp_unslash( $_GET['sl_rules'] ), '/' );
			$out  = array();
			foreach ( (array) get_option( 'rewrite_rules' ) as $re => $q ) {
				if ( preg_match( "#^$re#", $path ) || false !== strpos( $q, "&name=" ) || 0 === strpos( $q, "index.php?name=" ) ) {
					$out[] = "$re => $q";
				}
			}
			wp_die( '<pre>' . esc_html( get_option( 'permalink_structure' ) . "\n" . implode( "\n", $out ) ) . '</pre>' );
		}
		if ( ! empty( $_GET['sl_flush'] ) ) {
			global $wp_rewrite;
			$wp_rewrite->set_permalink_structure( '/%postname%/' );
			$wp_rewrite->init();
			$rules = $wp_rewrite->rewrite_rules();
			update_option( 'rewrite_rules', $rules );
			wp_die( 'flushed ' . count( $rules ) . ' ' . esc_html( $wp_rewrite->permalink_structure ) . ' ' . esc_html( implode( ' | ', array_slice( array_keys( $rules ), -3 ) ) ) );
		}
		if ( empty( $_GET['sl_fix_thumbs'] ) ) {
			return;
		}
		$n = 0;
		foreach ( get_posts( array( 'post_type' => 'attachment', 'post_status' => 'inherit', 'posts_per_page' => -1, 'meta_key' => '_sl_remote_url' ) ) as $att ) {
			update_post_meta( $att->ID, '_wp_attached_file', 'remote/' . basename( get_post_meta( $att->ID, '_sl_remote_url', true ) ) );
			if ( $att->post_parent ) {
				update_post_meta( $att->post_parent, '_thumbnail_id', $att->ID );
				++$n;
			}
		}
		wp_die( 'fixed ' . (int) $n );
	}
);

add_action(
	'wp',
	function ( $wp ) {
		if ( isset( $_GET['sl_dbg2'] ) ) {
			global $wp_rewrite;
			wp_die( '<pre>' . esc_html( $wp->request . "\nrule: " . $wp->matched_rule . "\nq: " . $wp->matched_query . "\nverbose: " . (int) $wp_rewrite->use_verbose_page_rules . "\n" . print_r( $wp->query_vars, true ) ) . '</pre>' );
		}
	}
);

add_action(
	'muplugins_loaded',
	function () {
		if ( isset( $_GET['sl_reset_rules'] ) ) {
			delete_option( 'rewrite_rules' );
			die( 'reset' );
		}
	}
);
