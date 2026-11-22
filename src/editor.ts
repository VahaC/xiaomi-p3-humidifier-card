import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Key, localize } from './localize';
import { CardConfig, HomeAssistant } from './types';

const entity = (name: string, domain: string | string[]) => ({
  name,
  selector: { entity: { domain } },
});

const text = (name: string) => ({ name, selector: { text: {} } });

const section = (name: string, schema: unknown[]) => ({
  name,
  type: 'expandable',
  flatten: true,
  schema,
});

@customElement('xiaomi-p3-humidifier-card-editor')
export class XiaomiP3HumidifierCardEditor extends LitElement {
  static styles = css`
    ha-form {
      display: block;
    }
  `;

  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private _config?: CardConfig;

  private _schema?: unknown[];
  private _schemaLanguage?: string;

  setConfig(config: CardConfig): void {
    this._config = config;
  }

  private get _language(): string {
    return this.hass?.locale?.language ?? this.hass?.language ?? 'en';
  }

  private _t(key: Key): string {
    return localize(key, this._language);
  }

  private _buildSchema(): unknown[] {
    if (this._schema && this._schemaLanguage === this._language) return this._schema;
    this._schemaLanguage = this._language;
    this._schema = [
      { name: 'entity', required: true, selector: { entity: { domain: 'humidifier' } } },
      {
        name: '',
        type: 'grid',
        schema: [
          text('name'),
          {
            name: 'layout',
            selector: {
              select: {
                mode: 'dropdown',
                options: [
                  { value: 'ring', label: this._t('ed_layout_ring') },
                  { value: 'compact', label: this._t('ed_layout_compact') },
                  { value: 'tank', label: this._t('ed_layout_tank') },
                ],
              },
            },
          },
        ],
      },
      section('sec_state', [
        entity('switch_entity', 'switch'),
        entity('dry_time_entity', 'sensor'),
        entity('clean_loop_entity', 'input_boolean'),
        entity('clean_mode_entity', ['input_select', 'select']),
      ]),
      section('sec_chips', [
        entity('water_entity', ['sensor', 'binary_sensor']),
        text('water_ok_state'),
        entity('filter_entity', 'sensor'),
        {
          name: 'filter_warning',
          selector: { number: { min: 0, max: 100, step: 1, mode: 'box' } },
        },
        entity('lock_entity', 'switch'),
        entity('screen_entity', ['switch', 'light']),
      ]),
      section('sec_scripts', [
        entity('off_script', 'script'),
        entity('constant_script', 'script'),
        entity('sleep_script', 'script'),
        entity('strong_script', 'script'),
        entity('clean_sleep_script', 'script'),
        entity('clean_strong_script', 'script'),
      ]),
      section('sec_names', [
        text('constant_mode'),
        text('sleep_mode'),
        text('strong_mode'),
        text('clean_sleep_option'),
        text('clean_strong_option'),
      ]),
    ];
    return this._schema;
  }

  private _computeLabel = (field: { name: string }): string =>
    field.name ? this._t(`ed_${field.name}` as Key) : '';

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const config: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(ev.detail.value ?? {})) {
      if (value !== undefined && value !== null && value !== '') config[key] = value;
    }
    this._config = config as unknown as CardConfig;
    this.dispatchEvent(
      new CustomEvent('config-changed', {
        detail: { config },
        bubbles: true,
        composed: true,
      }),
    );
  }

  protected render() {
    if (!this.hass || !this._config) return nothing;
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${{ layout: 'ring', ...this._config }}
        .schema=${this._buildSchema()}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }
}
