# WordPress → Lead CRM

This folder connects your WordPress site to the CRM. Every form submission (and, if you want, every paid WooCommerce order) is sent to the CRM's webhook `POST /api/leads`, where it is de-duplicated by email/phone like any other lead.

## What's inside

```
wordpress/
└── lead-crm-connector/
    └── lead-crm-connector.php   ← the WordPress plugin
```

Supported out of the box: **Contact Form 7, WPForms, Elementor Pro Forms, Gravity Forms, Fluent Forms, WooCommerce**.
UTM parameters (`utm_source`, `utm_campaign`, … and `fbclid`) from the landing page are remembered for 30 days and sent along with the lead, so you can see which Meta ad a lead came from.

## Install (≈2 minutes)

1. Zip the plugin folder:
   ```bash
   cd wordpress && zip -r lead-crm-connector.zip lead-crm-connector
   ```
   (or download this repo as ZIP and zip just the `lead-crm-connector` folder).
2. WordPress admin → **Plugins → Add New → Upload Plugin** → choose `lead-crm-connector.zip` → **Install** → **Activate**.
3. WordPress admin → **Settings → Lead CRM**:
   | Field | Value |
   |---|---|
   | CRM URL | your CRM address, e.g. `https://your-app.vercel.app` |
   | API key | the `LEADS_API_KEY` you set in Vercel |
   | Business | Digimark Media / Digital Shahbaz / Both |
4. Click **Send test lead** — it should show up in the CRM within seconds.

## How form fields are mapped

Fields are matched by their label or name:

| Form field contains… | CRM field |
|---|---|
| `email` | email |
| `phone`, `mobile`, `whatsapp`, `tel` | phone |
| `first name` / `last name` / `name` | name |
| `company`, `business name`, `organisation` | company |
| `city`, `location` | city |
| anything else | added to the lead's notes |

The form's title becomes the lead's **funnel** (`WordPress: <form name>`).

## Customising

Change the data before it is sent from your theme's `functions.php`:

```php
add_filter('lcrm_lead', function ($lead) {
    $lead['business'] = 'ds'; // e.g. force Digital Shahbaz
    return $lead;
});
```

Errors are written to the PHP error log with the prefix `[Lead CRM]`.
