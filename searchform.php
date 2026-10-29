<?php
/**
 * Search form.
 *
 * @package StephenLegal
 */

$sl_field_id = wp_unique_id( 'search-' );
?>
<form class="search-form" role="search" method="get" action="<?php echo esc_url( home_url( '/' ) ); ?>">
	<label for="<?php echo esc_attr( $sl_field_id ); ?>"><?php esc_html_e( 'Search articles', 'stephenlegal' ); ?></label>
	<div class="field-row">
		<input id="<?php echo esc_attr( $sl_field_id ); ?>" type="search" name="s" value="<?php echo esc_attr( get_search_query() ); ?>" placeholder="<?php esc_attr_e( 'Case names, courts, topics…', 'stephenlegal' ); ?>">
		<button type="submit" class="btn"><?php esc_html_e( 'Search', 'stephenlegal' ); ?></button>
	</div>
</form>
