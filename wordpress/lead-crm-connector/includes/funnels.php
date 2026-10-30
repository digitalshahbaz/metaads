<?php
/**
 * Funnels: any page can belong to a funnel (name, step number, business, next step).
 * Leads from a form on that page are tagged with the funnel in the CRM, and the visitor
 * is sent on to the next step after submitting.
 */

if (!defined('ABSPATH')) exit;

const LCRM_BUSINESSES = ['dmm' => 'Digimark Media', 'ds' => 'Digital Shahbaz', 'both' => 'Both'];

/** @return array{funnel:string,step:int,business:string,next:int} */
function lcrm_page_funnel($post_id) {
    return [
        'funnel'   => (string) get_post_meta($post_id, '_lcrm_funnel', true),
        'step'     => (int) get_post_meta($post_id, '_lcrm_step', true),
        'business' => (string) get_post_meta($post_id, '_lcrm_business', true),
        'next'     => (int) get_post_meta($post_id, '_lcrm_next', true),
    ];
}

/** All funnel names in use, for suggestions. */
function lcrm_funnel_names() {
    global $wpdb;
    return $wpdb->get_col("SELECT DISTINCT meta_value FROM {$wpdb->postmeta} WHERE meta_key = '_lcrm_funnel' AND meta_value <> '' ORDER BY meta_value");
}

/** Work out which page a submission came from. */
function lcrm_source_page_id(array $lead) {
    if (!empty($lead['_page_id'])) return (int) $lead['_page_id'];
    foreach (['queried_id', 'post_id', '_wpcf7_container_post'] as $k) { // Elementor / CF7 send these
        if (!empty($_POST[$k]) && is_numeric($_POST[$k])) return (int) $_POST[$k];
    }
    return !empty($lead['page_url']) ? url_to_postid(strtok($lead['page_url'], '?')) : 0;
}

/** Tag a lead with the funnel and business of the page it came from. */
function lcrm_apply_funnel(array $lead) {
    $page_id = lcrm_source_page_id($lead);
    unset($lead['_page_id']);
    if (!$page_id) return $lead;

    $f = lcrm_page_funnel($page_id);
    if ($f['funnel']) {
        $step = trim(($f['step'] ? "Step {$f['step']}: " : '') . get_the_title($page_id));
        $form = isset($lead['funnel']) ? " (form: {$lead['funnel']})" : '';
        $lead['funnel'] = $f['funnel'];
        $lead['notes'] = trim("Funnel step: {$step}{$form}\n" . ($lead['notes'] ?? ''));
    }
    if ($f['business']) $lead['business'] = $f['business'];
    if (empty($lead['page_url'])) $lead['page_url'] = get_permalink($page_id);
    return $lead;
}

/** Where to send the visitor after a form on this page is submitted (0 = stay). */
function lcrm_next_url($page_id) {
    $next = lcrm_page_funnel($page_id)['next'];
    return $next ? get_permalink($next) : '';
}

/* ---------------------------------------------------------------------------
 * "Funnel" box on the page editor
 * ------------------------------------------------------------------------ */

add_action('add_meta_boxes', function () {
    add_meta_box('lcrm_funnel', 'Lead CRM funnel', 'lcrm_render_meta_box', 'page', 'side');
});

function lcrm_page_dropdown($name, $selected, $exclude = 0) {
    wp_dropdown_pages([
        'name'              => $name,
        'selected'          => $selected,
        'exclude'           => $exclude ?: '',
        'show_option_none'  => '— none —',
        'option_none_value' => 0,
        'post_status'       => ['publish', 'draft', 'private'],
    ]);
}

function lcrm_render_meta_box($post) {
    $f = lcrm_page_funnel($post->ID);
    wp_nonce_field('lcrm_meta', 'lcrm_meta_nonce');
    ?>
    <p><label>Funnel name<br>
        <input name="lcrm_funnel" value="<?php echo esc_attr($f['funnel']); ?>" list="lcrm_funnels" style="width:100%" placeholder="e.g. Coaching Webinar Oct">
    </label></p>
    <datalist id="lcrm_funnels"><?php foreach (lcrm_funnel_names() as $n) echo '<option value="' . esc_attr($n) . '">'; ?></datalist>
    <p><label>Step number<br><input type="number" min="0" name="lcrm_step" value="<?php echo esc_attr($f['step'] ?: ''); ?>" style="width:80px"></label></p>
    <p><label>Business<br><select name="lcrm_business">
        <option value="">Default (from settings)</option>
        <?php foreach (LCRM_BUSINESSES as $k => $v): ?>
            <option value="<?php echo $k; ?>" <?php selected($f['business'], $k); ?>><?php echo esc_html($v); ?></option>
        <?php endforeach; ?>
    </select></label></p>
    <p><label>After the form, go to<br><?php lcrm_page_dropdown('lcrm_next', $f['next'], $post->ID); ?></label></p>
    <?php
}

add_action('save_post_page', function ($post_id) {
    if (!isset($_POST['lcrm_meta_nonce']) || !wp_verify_nonce($_POST['lcrm_meta_nonce'], 'lcrm_meta')) return;
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
    if (!current_user_can('edit_page', $post_id)) return;
    lcrm_save_page_funnel($post_id, [
        'funnel'   => wp_unslash($_POST['lcrm_funnel'] ?? ''),
        'step'     => $_POST['lcrm_step'] ?? 0,
        'business' => $_POST['lcrm_business'] ?? '',
        'next'     => $_POST['lcrm_next'] ?? 0,
    ]);
});

function lcrm_save_page_funnel($post_id, array $in) {
    update_post_meta($post_id, '_lcrm_funnel', sanitize_text_field($in['funnel'] ?? ''));
    update_post_meta($post_id, '_lcrm_step', absint($in['step'] ?? 0));
    update_post_meta($post_id, '_lcrm_business', isset(LCRM_BUSINESSES[$in['business'] ?? '']) ? $in['business'] : '');
    update_post_meta($post_id, '_lcrm_next', absint($in['next'] ?? 0));
}

/* ---------------------------------------------------------------------------
 * Lead CRM → Funnels: overview of every funnel + create new landing pages
 * ------------------------------------------------------------------------ */

add_action('admin_post_lcrm_new_page', function () {
    if (!current_user_can('publish_pages') || !check_admin_referer('lcrm_new_page')) wp_die('Not allowed');
    $title = sanitize_text_field(wp_unslash($_POST['title'] ?? '')) ?: 'New landing page';
    $id = wp_insert_post(['post_type' => 'page', 'post_status' => 'draft', 'post_title' => $title], true);
    if (is_wp_error($id)) wp_die($id);

    lcrm_save_page_funnel($id, [
        'funnel'   => wp_unslash($_POST['funnel'] ?? ''),
        'step'     => $_POST['step'] ?? 0,
        'business' => $_POST['business'] ?? '',
    ]);
    // Link the previous step to this new page, if chosen.
    $prev = absint($_POST['after'] ?? 0);
    if ($prev && current_user_can('edit_page', $prev)) update_post_meta($prev, '_lcrm_next', $id);

    if (did_action('elementor/loaded')) {
        update_post_meta($id, '_wp_page_template', 'elementor_canvas'); // blank full-width canvas, ideal for landing pages
        update_post_meta($id, '_elementor_edit_mode', 'builder');
        wp_safe_redirect(admin_url("post.php?post={$id}&action=elementor"));
    } else {
        wp_safe_redirect(get_edit_post_link($id, 'url'));
    }
    exit;
});

function lcrm_render_funnels() {
    $pages = get_posts([
        'post_type'   => 'page',
        'post_status' => ['publish', 'draft', 'private', 'pending'],
        'numberposts' => -1,
        'meta_key'    => '_lcrm_funnel',
        'meta_compare' => '!=',
        'meta_value'  => '',
    ]);
    $funnels = [];
    foreach ($pages as $p) $funnels[get_post_meta($p->ID, '_lcrm_funnel', true)][] = $p;
    ksort($funnels);
    $elementor = did_action('elementor/loaded');
    ?>
    <div class="wrap">
        <h1>Funnels</h1>
        <p>Every page tagged with a funnel sends its leads to the CRM under that funnel name. Set a page's funnel in the <strong>Lead CRM funnel</strong> box on the right side of the page editor, or create a new page here.</p>

        <h2>New landing page</h2>
        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
            <?php wp_nonce_field('lcrm_new_page'); ?>
            <input type="hidden" name="action" value="lcrm_new_page">
            <table class="form-table">
                <tr><th><label for="lcrm_t">Page title</label></th><td><input id="lcrm_t" name="title" class="regular-text" required placeholder="e.g. Free Webinar – Register"></td></tr>
                <tr><th><label for="lcrm_f">Funnel</label></th><td><input id="lcrm_f" name="funnel" class="regular-text" list="lcrm_funnels_all" required>
                    <datalist id="lcrm_funnels_all"><?php foreach (array_keys($funnels) as $n) echo '<option value="' . esc_attr($n) . '">'; ?></datalist></td></tr>
                <tr><th><label for="lcrm_s">Step number</label></th><td><input id="lcrm_s" type="number" min="1" name="step" value="1" style="width:80px"></td></tr>
                <tr><th><label for="lcrm_b">Business</label></th><td><select id="lcrm_b" name="business"><option value="">Default (from settings)</option>
                    <?php foreach (LCRM_BUSINESSES as $k => $v) echo '<option value="' . $k . '">' . esc_html($v) . '</option>'; ?></select></td></tr>
                <tr><th>Comes after</th><td><?php lcrm_page_dropdown('after', 0); ?>
                    <p class="description">Optional: the previous step. Its form will send visitors to this new page.</p></td></tr>
            </table>
            <?php submit_button($elementor ? 'Create & edit with Elementor' : 'Create page'); ?>
        </form>

        <?php if (!$funnels): ?>
            <p><em>No funnels yet.</em></p>
        <?php endif; ?>
        <?php foreach ($funnels as $name => $steps):
            usort($steps, fn($a, $b) => (int) get_post_meta($a->ID, '_lcrm_step', true) <=> (int) get_post_meta($b->ID, '_lcrm_step', true)); ?>
            <h2><?php echo esc_html($name); ?></h2>
            <table class="widefat striped" style="max-width:1000px">
                <thead><tr><th style="width:60px">Step</th><th>Page</th><th>Status</th><th>Business</th><th>After the form →</th><th></th></tr></thead>
                <tbody>
                <?php foreach ($steps as $p): $f = lcrm_page_funnel($p->ID); ?>
                    <tr>
                        <td><?php echo $f['step'] ?: '–'; ?></td>
                        <td><strong><?php echo esc_html(get_the_title($p)); ?></strong></td>
                        <td><?php echo esc_html(get_post_status_object($p->post_status)->label); ?></td>
                        <td><?php echo esc_html(LCRM_BUSINESSES[$f['business']] ?? 'Default'); ?></td>
                        <td><?php echo $f['next'] ? esc_html(get_the_title($f['next'])) : '<em>stay on page</em>'; ?></td>
                        <td>
                            <?php if ($elementor): ?><a href="<?php echo esc_url(admin_url("post.php?post={$p->ID}&action=elementor")); ?>">Edit with Elementor</a> · <?php endif; ?>
                            <a href="<?php echo esc_url(get_edit_post_link($p->ID)); ?>">Settings</a> ·
                            <a href="<?php echo esc_url(get_permalink($p->ID)); ?>" target="_blank">View</a>
                        </td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        <?php endforeach; ?>
    </div>
    <?php
}

/* ---------------------------------------------------------------------------
 * Send visitors to the next step after Contact Form 7 / WPForms AJAX submits.
 * (Lead CRM forms and Elementor Pro forms are redirected server-side.)
 * ------------------------------------------------------------------------ */

add_action('wp_footer', function () {
    if (!is_page() || !($url = lcrm_next_url(get_queried_object_id()))) return;
    ?>
    <script>
    (function (url) {
        document.addEventListener('wpcf7mailsent', function () { window.location.href = url; });
        if (window.jQuery) jQuery(document).on('wpformsAjaxSubmitSuccess', function () { window.location.href = url; });
    })(<?php echo wp_json_encode($url); ?>);
    </script>
    <?php
});
