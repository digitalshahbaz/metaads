<?php
/**
 * Plugin Name: Lead CRM Connector
 * Description: Build funnels and lead forms in WordPress/Elementor and send every lead to your Lead CRM (POST /api/leads). Also captures Contact Form 7, WPForms, Elementor Pro Forms, Gravity Forms, Fluent Forms and WooCommerce orders.
 * Version:     1.1.0
 * Author:      Digimark Media
 * License:     GPL-2.0-or-later
 */

if (!defined('ABSPATH')) exit;

const LCRM_OPT = 'lcrm_settings';
const LCRM_UTM_COOKIE = 'lcrm_utm';
const LCRM_QUEUE = 'lcrm_failed_leads';

require_once __DIR__ . '/includes/funnels.php';
require_once __DIR__ . '/includes/form.php';

/* ---------------------------------------------------------------------------
 * Settings
 * ------------------------------------------------------------------------ */

function lcrm_settings() {
    return wp_parse_args(get_option(LCRM_OPT, []), [
        'crm_url'  => '',     // e.g. https://your-app.vercel.app
        'api_key'  => '',     // LEADS_API_KEY from Vercel
        'business' => 'dmm',  // dmm | ds | both
        'source'   => 'website',
        'woo'      => '1',
    ]);
}

add_action('admin_menu', function () {
    add_menu_page('Lead CRM', 'Lead CRM', 'manage_options', 'lead-crm', 'lcrm_render_funnels', 'dashicons-filter', 26);
    add_submenu_page('lead-crm', 'Funnels', 'Funnels', 'manage_options', 'lead-crm', 'lcrm_render_funnels');
    add_submenu_page('lead-crm', 'Lead CRM settings', 'Settings', 'manage_options', 'lead-crm-settings', 'lcrm_render_settings');
});

add_action('admin_init', function () {
    register_setting('lcrm', LCRM_OPT, ['sanitize_callback' => function ($in) {
        return [
            'crm_url'  => untrailingslashit(esc_url_raw(trim($in['crm_url'] ?? ''))),
            'api_key'  => sanitize_text_field($in['api_key'] ?? ''),
            'business' => in_array($in['business'] ?? '', ['dmm', 'ds', 'both'], true) ? $in['business'] : 'dmm',
            'source'   => sanitize_key($in['source'] ?? 'website') ?: 'website',
            'woo'      => empty($in['woo']) ? '0' : '1',
        ];
    }]);
});

function lcrm_render_settings() {
    $s = lcrm_settings();
    $test = null;
    if (isset($_POST['lcrm_test']) && check_admin_referer('lcrm_test')) {
        $test = lcrm_send([
            'name'   => 'WordPress test lead',
            'email'  => 'wp-test@example.com',
            'notes'  => 'Sent from the Lead CRM Connector settings page.',
            'funnel' => 'WordPress (test)',
        ], false);
    }
    ?>
    <div class="wrap">
        <h1>Lead CRM Connector</h1>
        <?php if ($test !== null): ?>
            <div class="notice notice-<?php echo $test === true ? 'success' : 'error'; ?>"><p>
                <?php echo $test === true ? 'Test lead sent — check your CRM.' : 'Test failed: ' . esc_html($test); ?>
            </p></div>
        <?php endif; ?>
        <?php $queued = count((array) get_option(LCRM_QUEUE, [])); if ($queued): ?>
            <div class="notice notice-warning"><p><?php echo (int) $queued; ?> lead(s) could not reach the CRM yet — they are retried automatically every hour.</p></div>
        <?php endif; ?>
        <form method="post" action="options.php">
            <?php settings_fields('lcrm'); ?>
            <table class="form-table">
                <tr><th><label for="lcrm_url">CRM URL</label></th>
                    <td><input id="lcrm_url" class="regular-text" name="<?php echo LCRM_OPT; ?>[crm_url]" value="<?php echo esc_attr($s['crm_url']); ?>" placeholder="https://your-app.vercel.app">
                    <p class="description">Your CRM address on Vercel, without <code>/api/leads</code>.</p></td></tr>
                <tr><th><label for="lcrm_key">API key</label></th>
                    <td><input id="lcrm_key" class="regular-text" type="password" name="<?php echo LCRM_OPT; ?>[api_key]" value="<?php echo esc_attr($s['api_key']); ?>">
                    <p class="description">The <code>LEADS_API_KEY</code> value from your Vercel environment variables.</p></td></tr>
                <tr><th><label for="lcrm_biz">Business</label></th>
                    <td><select id="lcrm_biz" name="<?php echo LCRM_OPT; ?>[business]">
                        <?php foreach (['dmm' => 'Digimark Media', 'ds' => 'Digital Shahbaz', 'both' => 'Both'] as $k => $v): ?>
                            <option value="<?php echo $k; ?>" <?php selected($s['business'], $k); ?>><?php echo $v; ?></option>
                        <?php endforeach; ?>
                    </select></td></tr>
                <tr><th><label for="lcrm_src">Source label</label></th>
                    <td><input id="lcrm_src" name="<?php echo LCRM_OPT; ?>[source]" value="<?php echo esc_attr($s['source']); ?>"></td></tr>
                <tr><th>WooCommerce</th>
                    <td><label><input type="checkbox" name="<?php echo LCRM_OPT; ?>[woo]" value="1" <?php checked($s['woo'], '1'); ?>> Send paid orders as leads (with order value)</label></td></tr>
            </table>
            <?php submit_button(); ?>
        </form>
        <form method="post">
            <?php wp_nonce_field('lcrm_test'); ?>
            <input type="hidden" name="lcrm_test" value="1">
            <?php submit_button('Send test lead', 'secondary'); ?>
        </form>
    </div>
    <?php
}

/* ---------------------------------------------------------------------------
 * Remember UTM parameters from the landing page so they reach the CRM
 * even when the form is on a different page.
 * ------------------------------------------------------------------------ */

add_action('init', function () {
    if (is_admin() || headers_sent()) return;
    $utm = [];
    foreach (['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'] as $k) {
        if (!empty($_GET[$k])) $utm[$k] = sanitize_text_field(wp_unslash($_GET[$k]));
    }
    if ($utm) {
        $utm['landing_page'] = lcrm_current_url();
        setcookie(LCRM_UTM_COOKIE, wp_json_encode($utm), time() + 30 * DAY_IN_SECONDS, COOKIEPATH ?: '/', COOKIE_DOMAIN, is_ssl(), true);
        $_COOKIE[LCRM_UTM_COOKIE] = wp_json_encode($utm);
    }
});

function lcrm_current_url() {
    $host = sanitize_text_field(wp_unslash($_SERVER['HTTP_HOST'] ?? wp_parse_url(home_url(), PHP_URL_HOST)));
    return esc_url_raw((is_ssl() ? 'https://' : 'http://') . $host . wp_unslash($_SERVER['REQUEST_URI'] ?? '/'));
}

function lcrm_utm() {
    if (empty($_COOKIE[LCRM_UTM_COOKIE])) return [];
    $d = json_decode(wp_unslash($_COOKIE[LCRM_UTM_COOKIE]), true);
    return is_array($d) ? array_map('sanitize_text_field', $d) : [];
}

/* ---------------------------------------------------------------------------
 * Sending
 * ------------------------------------------------------------------------ */

/**
 * Send a lead to the CRM. Leads are tagged with the funnel/business of the page they came from
 * (see includes/funnels.php). If the CRM can't be reached the lead is queued and retried hourly.
 *
 * @return true|string true on success, otherwise an error message.
 */
function lcrm_send(array $lead, $queue_on_fail = true) {
    $s = lcrm_settings();
    if (!$s['crm_url'] || !$s['api_key']) return 'CRM URL or API key is not set (Lead CRM → Settings).';

    $lead = array_merge(lcrm_utm(), array_filter($lead, fn($v) => $v !== '' && $v !== null));
    if (empty($lead['page_url']) && !empty($_SERVER['HTTP_REFERER'])) $lead['page_url'] = esc_url_raw(wp_unslash($_SERVER['HTTP_REFERER']));
    $lead = apply_filters('lcrm_lead', lcrm_apply_funnel($lead));

    $result = lcrm_post($lead);
    if ($result !== true && $queue_on_fail) {
        $queue = (array) get_option(LCRM_QUEUE, []);
        $queue[] = $lead;
        update_option(LCRM_QUEUE, array_slice($queue, -200), false);
    }
    return $result;
}

/** @return true|string */
function lcrm_post(array $lead) {
    $s = lcrm_settings();
    $url = add_query_arg(['source' => $s['source'], 'business' => $s['business']], $s['crm_url'] . '/api/leads');
    $res = wp_remote_post($url, [
        'timeout' => 10,
        'headers' => ['Content-Type' => 'application/json', 'x-api-key' => $s['api_key']],
        'body'    => wp_json_encode($lead),
    ]);
    if (is_wp_error($res)) {
        error_log('[Lead CRM] ' . $res->get_error_message());
        return $res->get_error_message();
    }
    $code = wp_remote_retrieve_response_code($res);
    if ($code >= 300) {
        error_log("[Lead CRM] HTTP $code: " . wp_remote_retrieve_body($res));
        return "HTTP $code — " . wp_remote_retrieve_body($res);
    }
    return true;
}

// Retry queued leads every hour.
add_action('lcrm_retry_queue', function () {
    $queue = (array) get_option(LCRM_QUEUE, []);
    if (!$queue) return;
    $left = array_values(array_filter($queue, fn($lead) => lcrm_post($lead) !== true));
    update_option(LCRM_QUEUE, $left, false);
});
register_activation_hook(__FILE__, function () {
    if (!wp_next_scheduled('lcrm_retry_queue')) wp_schedule_event(time() + HOUR_IN_SECONDS, 'hourly', 'lcrm_retry_queue');
});
register_deactivation_hook(__FILE__, function () {
    wp_clear_scheduled_hook('lcrm_retry_queue');
});

/**
 * Turn arbitrary form fields (keyed by label or field name) into a lead.
 * Unknown fields are kept and also listed in the notes, so nothing gets lost.
 */
function lcrm_from_fields(array $fields, $form_name) {
    $lead = ['funnel' => 'WordPress: ' . $form_name];
    $notes = [];
    foreach ($fields as $key => $value) {
        if (is_array($value)) $value = implode(', ', array_filter(array_map('strval', $value)));
        $value = trim(wp_strip_all_tags((string) $value));
        if ($value === '' || strpos((string) $key, '_') === 0) continue;

        $k = strtolower(preg_replace('/[^a-z0-9]+/i', '_', trim((string) $key)));
        $k = trim($k, '_');
        if (preg_match('/^(your_)?e?_?mail|email/', $k) && is_email($value)) $lead['email'] = $value;
        elseif (preg_match('/phone|mobile|whatsapp|tel/', $k)) $lead['phone'] = $value;
        elseif (preg_match('/^(your_)?first_?name/', $k)) $lead['first_name'] = $value;
        elseif (preg_match('/^(your_)?last_?name|surname/', $k)) $lead['last_name'] = $value;
        elseif (preg_match('/^(your_)?(full_)?name$/', $k)) $lead['name'] = $value;
        elseif (preg_match('/company|business_name|organi[sz]ation/', $k)) $lead['company'] = $value;
        elseif (preg_match('/city|location/', $k)) $lead['city'] = $value;
        elseif (preg_match('/^utm_/', $k)) $lead[$k] = $value;
        else $notes[] = $key . ': ' . $value;
    }
    if ($notes) $lead['notes'] = implode("\n", $notes);
    return $lead;
}

/* ---------------------------------------------------------------------------
 * Form plugin integrations
 * ------------------------------------------------------------------------ */

// Contact Form 7
add_action('wpcf7_mail_sent', function ($form) {
    if (!class_exists('WPCF7_Submission') || !($sub = WPCF7_Submission::get_instance())) return;
    lcrm_send(lcrm_from_fields($sub->get_posted_data(), $form->title()) + ['page_url' => $sub->get_meta('url')]);
});

// WPForms
add_action('wpforms_process_complete', function ($fields, $entry, $form_data) {
    $data = [];
    foreach ($fields as $f) $data[$f['name'] ?? $f['id']] = $f['value'] ?? '';
    lcrm_send(lcrm_from_fields($data, $form_data['settings']['form_title'] ?? 'WPForms'));
}, 10, 3);

// Elementor Pro forms
add_action('elementor_pro/forms/new_record', function ($record, $ajax_handler) {
    $data = [];
    foreach ((array) $record->get('fields') as $id => $f) $data[$f['title'] ?: $id] = $f['value'] ?? '';
    lcrm_send(lcrm_from_fields($data, $record->get_form_settings('form_name') ?: 'Elementor form'));

    // Send the visitor to the funnel's next step, unless the form has its own Redirect action.
    $page_id = absint($_POST['queried_id'] ?? 0);
    $next = $page_id ? lcrm_next_url($page_id) : '';
    if ($next && !in_array('redirect', (array) $record->get_form_settings('submit_actions'), true)) {
        $ajax_handler->add_response_data('redirect_url', $next);
    }
}, 10, 2);

// Gravity Forms
add_action('gform_after_submission', function ($entry, $form) {
    $data = [];
    foreach ($form['fields'] as $field) {
        if (!empty($field->inputs) && is_array($field->inputs)) {
            foreach ($field->inputs as $in) {
                $data[$field->label . ' ' . $in['label']] = rgar($entry, (string) $in['id']);
            }
        } else {
            $data[$field->label] = rgar($entry, (string) $field->id);
        }
    }
    lcrm_send(lcrm_from_fields($data, $form['title']) + ['page_url' => rgar($entry, 'source_url')]);
}, 10, 2);

// Fluent Forms
add_action('fluentform/submission_inserted', function ($entry_id, $form_data, $form) {
    $flat = [];
    foreach ($form_data as $k => $v) {
        if (is_array($v) && array_keys($v) !== range(0, count($v) - 1)) foreach ($v as $k2 => $v2) $flat[$k2] = $v2;
        else $flat[$k] = $v;
    }
    lcrm_send(lcrm_from_fields($flat, $form->title ?? 'Fluent Form'));
}, 10, 3);

// WooCommerce: paid orders become leads (with value) — the CRM merges them by email/phone.
add_action('woocommerce_order_status_processing', 'lcrm_woo_order');
add_action('woocommerce_order_status_completed', 'lcrm_woo_order');
function lcrm_woo_order($order_id) {
    if (lcrm_settings()['woo'] !== '1' || !($order = wc_get_order($order_id))) return;
    if ($order->get_meta('_lcrm_sent')) return;
    $items = [];
    foreach ($order->get_items() as $item) $items[] = $item->get_name() . ' × ' . $item->get_quantity();
    lcrm_send([
        'first_name' => $order->get_billing_first_name(),
        'last_name'  => $order->get_billing_last_name(),
        'email'      => $order->get_billing_email(),
        'phone'      => $order->get_billing_phone(),
        'company'    => $order->get_billing_company(),
        'city'       => $order->get_billing_city(),
        'value'      => $order->get_total(),
        'funnel'     => 'WooCommerce: ' . implode(', ', $items),
        'notes'      => sprintf('Order #%s — %s %s', $order->get_order_number(), $order->get_total(), $order->get_currency()),
    ]);
    $order->update_meta_data('_lcrm_sent', 1); // failed sends are queued and retried, so never send twice
    $order->save();
}
