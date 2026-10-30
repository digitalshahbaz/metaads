# WordPress → Lead CRM

Build your **landing pages, forms and funnels in WordPress (with Elementor)**. Every lead from them goes straight into this CRM, tagged with its funnel and business. The CRM de-duplicates leads by email and phone, as it does for every other source.

```
wordpress/
└── lead-crm-connector/              ← the WordPress plugin (upload this)
    ├── lead-crm-connector.php       settings, sending, other form plugins, WooCommerce
    └── includes/
        ├── funnels.php              funnels: page settings box + "Funnels" screen
        ├── form.php                 the Lead CRM form ([lead_crm_form] shortcode)
        └── elementor-widget.php     "Lead CRM Form" widget for Elementor
```

## Install (≈2 minutes)

1. Download [`lead-crm-connector.zip`](lead-crm-connector.zip) from this folder (or zip the plugin folder yourself):
   ```bash
   cd wordpress && zip -r lead-crm-connector.zip lead-crm-connector
   ```
2. WordPress admin → **Plugins → Add New → Upload Plugin** → `lead-crm-connector.zip` → **Install** → **Activate**.
3. WordPress admin → **Lead CRM → Settings**:
   | Field | Value |
   |---|---|
   | CRM URL | your CRM address, e.g. `https://your-app.vercel.app` |
   | API key | the `LEADS_API_KEY` you set in Vercel |
   | Business | default business: Digimark Media / Digital Shahbaz / Both |
4. Click **Send test lead**. It should appear in the CRM within seconds.

## Build a funnel

1. **Lead CRM → Funnels → New landing page**: enter a title, funnel name (e.g. `Coaching Webinar Oct`), step number and business. Click **Create & edit with Elementor**. The page opens on Elementor's blank canvas, which suits landing pages.
2. In Elementor, search for the **Lead CRM Form** widget and drag it onto the page. Choose the fields (name, email, WhatsApp, city, business name…), the button text and the thank-you message, and style the button.
3. Create the next step (e.g. `Thank you – Join WhatsApp group`) the same way and pick the first page under **Comes after**. Visitors who submit the form on step 1 now go to step 2 automatically.
4. Publish. The **Funnels** screen lists every funnel with its steps, status and next step, with links to edit in Elementor or view each page.

You can also put an existing page into a funnel from the **Lead CRM funnel** box on the right side of the page editor.

### What arrives in the CRM

- **Funnel**: the page's funnel name, so you can filter or segment by it in the CRM.
- **Business**: the page's business, or the default from Settings.
- **Notes**: which funnel step and form the lead came from, plus any extra fields.
- **UTMs**: `utm_source`, `utm_campaign`… and `fbclid` from the ad click. These are remembered for 30 days even if the visitor fills in the form on a later page, so you can see which Meta ad brought each lead.

If the CRM can't be reached, the lead is saved in WordPress and retried every hour, so no lead is lost. **Settings** shows how many leads are waiting.

## Other forms you already use

These are captured automatically and also follow the page's funnel and next step:

- **Elementor Pro Form** widget. If the form has its own *Redirect* action, that action wins.
- **Contact Form 7**, **WPForms**, **Gravity Forms**, **Fluent Forms**
- **WooCommerce**: paid orders are sent with the order value (can be turned off in Settings)

Their fields are matched by label: *email* → email, *phone / mobile / whatsapp* → phone, *first / last / full name* → name, *company / business name* → company, *city* → city. Anything else goes into the lead's notes.

## Shortcode (without Elementor)

```
[lead_crm_form fields="name,email,phone,city" button="Book my free call" success="Thanks! We'll WhatsApp you shortly."]
```

| Attribute | Meaning |
|---|---|
| `fields` | any of `name, first_name, last_name, email, phone, city, company, profession, message` |
| `required` | fields that must be filled (default: all except `message`) |
| `button` | button text |
| `success` | thank-you message shown when there is no next step |
| `redirect` | URL to go to after submitting (overrides the funnel's next step) |
| `funnel` | funnel name, only used when the page itself isn't in a funnel |

## Customising

Change the data before it is sent, from your theme's `functions.php`:

```php
add_filter('lcrm_lead', function ($lead) {
    $lead['profession'] = 'Coach';
    return $lead;
});
```

Errors are written to the PHP error log with the prefix `[Lead CRM]`.
