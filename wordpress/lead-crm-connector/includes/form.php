<?php
/**
 * Lead CRM form: a lightweight form that sends straight to the CRM.
 * Use it anywhere as a shortcode, or drag the "Lead CRM Form" widget in Elementor (works with free Elementor).
 *
 *   [lead_crm_form fields="name,email,phone" button="Book my call" success="Thanks! We'll call you soon."]
 *
 * Attributes:
 *   fields   – any of: name, first_name, last_name, email, phone, city, company, profession, message
 *   required – fields that must be filled (default: all except message)
 *   button   – button text
 *   success  – message shown after submitting (when the page has no next step)
 *   redirect – URL to send visitors to after submitting (overrides the page's funnel next step)
 *   funnel   – funnel name, only used when the page itself isn't in a funnel
 */

if (!defined('ABSPATH')) exit;

const LCRM_FORM_FIELDS = [
    'name'       => ['Full name', 'text', 'name'],
    'first_name' => ['First name', 'text', 'given-name'],
    'last_name'  => ['Last name', 'text', 'family-name'],
    'email'      => ['Email', 'email', 'email'],
    'phone'      => ['WhatsApp number', 'tel', 'tel'],
    'city'       => ['City', 'text', 'address-level2'],
    'company'    => ['Business name', 'text', 'organization'],
    'profession' => ['Profession', 'text', ''],
    'message'    => ['Message', 'textarea', ''],
];

function lcrm_form_fields_list($csv) {
    return array_values(array_filter(array_map('trim', explode(',', strtolower((string) $csv))), fn($f) => isset(LCRM_FORM_FIELDS[$f])));
}

add_shortcode('lead_crm_form', 'lcrm_render_form');

function lcrm_render_form($atts) {
    static $instance = 0;
    $instance++;
    $a = shortcode_atts([
        'fields'   => 'name,email,phone',
        'required' => '',
        'button'   => 'Submit',
        'success'  => "Thank you! We'll be in touch shortly.",
        'redirect' => '',
        'funnel'   => '',
        'labels'   => 'yes',
    ], $atts, 'lead_crm_form');

    $fields = lcrm_form_fields_list($a['fields']) ?: ['name', 'email', 'phone'];
    $required = $a['required'] !== '' ? lcrm_form_fields_list($a['required']) : array_diff($fields, ['message']);
    $id = 'lcrm-form-' . $instance;

    if (isset($_GET['lcrm_sent']) && (int) $_GET['lcrm_sent'] === $instance) {
        return '<div id="' . $id . '" class="lcrm-form lcrm-success">' . esc_html($a['success']) . '</div>';
    }

    ob_start(); ?>
    <form id="<?php echo $id; ?>" class="lcrm-form" method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
        <?php if (isset($_GET['lcrm_error']) && (int) $_GET['lcrm_error'] === $instance): ?>
            <p class="lcrm-error">Please fill in all required fields with a valid email and phone number.</p>
        <?php endif; ?>
        <input type="hidden" name="action" value="lcrm_form">
        <input type="hidden" name="lcrm_instance" value="<?php echo $instance; ?>">
        <input type="hidden" name="lcrm_page" value="<?php echo (int) get_queried_object_id(); ?>">
        <input type="hidden" name="lcrm_return" value="<?php echo esc_url(lcrm_current_url()); ?>">
        <input type="hidden" name="lcrm_redirect" value="<?php echo esc_url($a['redirect']); ?>">
        <input type="hidden" name="lcrm_redirect_sig" value="<?php echo esc_attr(wp_hash('lcrm_redirect|' . esc_url_raw($a['redirect']))); ?>">
        <input type="hidden" name="lcrm_funnel" value="<?php echo esc_attr($a['funnel']); ?>">
        <input type="hidden" name="lcrm_required" value="<?php echo esc_attr(implode(',', $required)); ?>">
        <div style="position:absolute;left:-9999px" aria-hidden="true"><input name="lcrm_website" tabindex="-1" autocomplete="off"></div>
        <?php foreach ($fields as $f):
            [$label, $type, $auto] = LCRM_FORM_FIELDS[$f];
            $req = in_array($f, $required, true); ?>
            <p class="lcrm-field lcrm-field-<?php echo $f; ?>">
                <?php if ($a['labels'] === 'yes'): ?><label for="<?php echo "$id-$f"; ?>"><?php echo esc_html($label) . ($req ? ' *' : ''); ?></label><?php endif; ?>
                <?php if ($type === 'textarea'): ?>
                    <textarea id="<?php echo "$id-$f"; ?>" name="lcrm[<?php echo $f; ?>]" rows="4" placeholder="<?php echo esc_attr($label); ?>" <?php echo $req ? 'required' : ''; ?>></textarea>
                <?php else: ?>
                    <input id="<?php echo "$id-$f"; ?>" type="<?php echo $type; ?>" name="lcrm[<?php echo $f; ?>]" placeholder="<?php echo esc_attr($label); ?>" <?php echo $auto ? 'autocomplete="' . $auto . '"' : ''; ?> <?php echo $req ? 'required' : ''; ?>>
                <?php endif; ?>
            </p>
        <?php endforeach; ?>
        <p><button type="submit" class="lcrm-submit"><?php echo esc_html($a['button']); ?></button></p>
    </form>
    <?php
    return ob_get_clean();
}

add_action('wp_head', function () { ?>
    <style>
    .lcrm-form{max-width:520px}
    .lcrm-form .lcrm-field{margin:0 0 12px}
    .lcrm-form label{display:block;font-weight:600;margin-bottom:4px}
    .lcrm-form input,.lcrm-form textarea{width:100%;padding:12px;border:1px solid #ccc;border-radius:6px;font-size:16px;box-sizing:border-box}
    .lcrm-form .lcrm-submit{width:100%;padding:14px;border:0;border-radius:6px;background:#4f46e5;color:#fff;font-size:17px;font-weight:700;cursor:pointer}
    .lcrm-form .lcrm-error{color:#b91c1c}
    .lcrm-success{padding:16px;border-radius:6px;background:#ecfdf5;color:#065f46;font-weight:600}
    </style>
<?php });

function lcrm_handle_form() {
    $return = wp_validate_redirect(esc_url_raw(wp_unslash($_POST['lcrm_return'] ?? '')), home_url('/'));
    $return = remove_query_arg(['lcrm_sent', 'lcrm_error'], $return);
    $instance = absint($_POST['lcrm_instance'] ?? 1);
    if (!empty($_POST['lcrm_website'])) { // honeypot: bots fill every field
        wp_safe_redirect(add_query_arg('lcrm_sent', $instance, $return));
        exit;
    }

    $in = array_map(fn($v) => sanitize_textarea_field(wp_unslash($v)), (array) ($_POST['lcrm'] ?? []));
    $in = array_intersect_key($in, LCRM_FORM_FIELDS);
    $required = lcrm_form_fields_list(sanitize_text_field(wp_unslash($_POST['lcrm_required'] ?? '')));
    $missing = array_filter($required, fn($f) => empty($in[$f]));
    $bad_email = !empty($in['email']) && !is_email($in['email']);
    $bad_phone = !empty($in['phone']) && strlen(preg_replace('/\D/', '', $in['phone'])) < 8;
    if ($missing || $bad_email || $bad_phone) {
        wp_safe_redirect(add_query_arg('lcrm_error', $instance, $return) . '#lcrm-form-' . $instance);
        exit;
    }

    $page_id = absint($_POST['lcrm_page'] ?? 0);
    $lead = $in;
    if (isset($lead['message'])) { $lead['notes'] = $lead['message']; unset($lead['message']); }
    $lead['_page_id'] = $page_id;
    $lead['page_url'] = $return;
    $funnel = sanitize_text_field(wp_unslash($_POST['lcrm_funnel'] ?? ''));
    $lead['funnel'] = $funnel ?: 'WordPress: ' . ($page_id ? get_the_title($page_id) : 'form');
    lcrm_send($lead); // queued for retry if the CRM is unreachable, so the visitor always continues

    // The redirect URL is signed when the form is rendered, so it can't be swapped for another site.
    $redirect = esc_url_raw(wp_unslash($_POST['lcrm_redirect'] ?? ''));
    if ($redirect && !hash_equals(wp_hash('lcrm_redirect|' . $redirect), (string) ($_POST['lcrm_redirect_sig'] ?? ''))) $redirect = '';
    $redirect = $redirect ?: ($page_id ? lcrm_next_url($page_id) : '');
    wp_redirect($redirect ?: add_query_arg('lcrm_sent', $instance, $return) . '#lcrm-form-' . $instance);
    exit;
}
add_action('admin_post_nopriv_lcrm_form', 'lcrm_handle_form');
add_action('admin_post_lcrm_form', 'lcrm_handle_form');

/* ---------------------------------------------------------------------------
 * Elementor widget
 * ------------------------------------------------------------------------ */

add_action('elementor/widgets/register', function ($widgets) {
    require_once __DIR__ . '/elementor-widget.php';
    $widgets->register(new LCRM_Elementor_Form_Widget());
});
