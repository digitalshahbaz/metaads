<?php
/** "Lead CRM Form" widget for Elementor (free or Pro). Renders the [lead_crm_form] shortcode. */

if (!defined('ABSPATH')) exit;

class LCRM_Elementor_Form_Widget extends \Elementor\Widget_Base {
    public function get_name() { return 'lead_crm_form'; }
    public function get_title() { return 'Lead CRM Form'; }
    public function get_icon() { return 'eicon-form-horizontal'; }
    public function get_categories() { return ['general']; }
    public function get_keywords() { return ['form', 'lead', 'crm', 'optin']; }

    protected function register_controls() {
        $options = array_map(fn($f) => $f[0], LCRM_FORM_FIELDS);

        $this->start_controls_section('form', ['label' => 'Form']);
        $this->add_control('fields', [
            'label'    => 'Fields',
            'type'     => \Elementor\Controls_Manager::SELECT2,
            'multiple' => true,
            'options'  => $options,
            'default'  => ['name', 'email', 'phone'],
        ]);
        $this->add_control('required', [
            'label'       => 'Required fields',
            'type'        => \Elementor\Controls_Manager::SELECT2,
            'multiple'    => true,
            'options'     => $options,
            'default'     => ['name', 'email', 'phone'],
        ]);
        $this->add_control('labels', [
            'label'        => 'Show labels',
            'type'         => \Elementor\Controls_Manager::SWITCHER,
            'return_value' => 'yes',
            'default'      => 'yes',
        ]);
        $this->add_control('button', ['label' => 'Button text', 'type' => \Elementor\Controls_Manager::TEXT, 'default' => 'Submit']);
        $this->end_controls_section();

        $this->start_controls_section('after', ['label' => 'After submit']);
        $this->add_control('success', [
            'label'   => 'Thank-you message',
            'type'    => \Elementor\Controls_Manager::TEXTAREA,
            'default' => "Thank you! We'll be in touch shortly.",
        ]);
        $this->add_control('redirect', [
            'label'       => 'Redirect to URL',
            'type'        => \Elementor\Controls_Manager::URL,
            'description' => "Leave empty to use this page's funnel next step (Lead CRM funnel box) or show the thank-you message.",
        ]);
        $this->add_control('funnel', [
            'label'       => 'Funnel name',
            'type'        => \Elementor\Controls_Manager::TEXT,
            'description' => "Only used when this page isn't in a funnel yet.",
        ]);
        $this->end_controls_section();

        $this->start_controls_section('style_button', ['label' => 'Button', 'tab' => \Elementor\Controls_Manager::TAB_STYLE]);
        $this->add_control('button_bg', [
            'label'     => 'Background',
            'type'      => \Elementor\Controls_Manager::COLOR,
            'selectors' => ['{{WRAPPER}} .lcrm-submit' => 'background: {{VALUE}};'],
        ]);
        $this->add_control('button_color', [
            'label'     => 'Text color',
            'type'      => \Elementor\Controls_Manager::COLOR,
            'selectors' => ['{{WRAPPER}} .lcrm-submit' => 'color: {{VALUE}};'],
        ]);
        $this->add_group_control(\Elementor\Group_Control_Typography::get_type(), ['name' => 'button_typography', 'selector' => '{{WRAPPER}} .lcrm-submit']);
        $this->end_controls_section();
    }

    protected function render() {
        $s = $this->get_settings_for_display();
        echo lcrm_render_form([
            'fields'   => implode(',', (array) $s['fields']),
            'required' => implode(',', (array) $s['required']) ?: ' ',
            'labels'   => $s['labels'] === 'yes' ? 'yes' : 'no',
            'button'   => $s['button'],
            'success'  => $s['success'],
            'redirect' => $s['redirect']['url'] ?? '',
            'funnel'   => $s['funnel'],
        ]);
    }
}
