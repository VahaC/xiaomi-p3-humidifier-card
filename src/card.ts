import {
  mdiAirHumidifier,
  mdiLightbulbOn,
  mdiLightbulbOutline,
  mdiLock,
  mdiLockOpenVariant,
  mdiAirFilter,
  mdiPower,
  mdiShimmer,
  mdiWater,
  mdiWaterAlert,
  mdiWaterPercent,
  mdiWeatherNight,
  mdiWeatherWindy,
} from '@mdi/js';
import { LitElement, PropertyValues, TemplateResult, html, nothing, svg } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { version } from '../package.json';
import './editor';
import { Key, localize } from './localize';
import { cardStyles } from './styles';
import { CardConfig, CardState, HassEntity, HomeAssistant, Layout } from './types';

const CARD_TAG = 'xiaomi-p3-humidifier-card';
const EDITOR_TAG = 'xiaomi-p3-humidifier-card-editor';

const RING_R = 80;
const RING_C = 2 * Math.PI * RING_R;
const RING_ARC = RING_C * 0.75;
const RING_START = 135;
const RING_SWEEP = 270;

type ModeKey = 'constant' | 'sleep' | 'strong';
type CleanKey = 'clean_sleep' | 'clean_strong';

const ENTITY_KEYS = [
  'entity',
  'switch_entity',
  'dry_time_entity',
  'clean_loop_entity',
  'clean_mode_entity',
  'water_entity',
  'filter_entity',
  'lock_entity',
  'screen_entity',
] as const;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const icon = (path: string): TemplateResult =>
  html`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d=${path}></path>
  </svg>`;

@customElement(CARD_TAG)
export class XiaomiP3HumidifierCard extends LitElement {
  static styles = cardStyles;

  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private _config?: CardConfig;
  /** Target chosen in the UI that the device has not confirmed yet. */
  @state() private _pendingTarget?: number;
  @state() private _dragging = false;

  private _pendingTimer?: number;

  static getConfigElement(): HTMLElement {
    return document.createElement(EDITOR_TAG);
  }

  /** Pre-fills the card with the usual Xiaomi P3 entity names that exist. */
  static getStubConfig(hass: HomeAssistant): Partial<CardConfig> {
    const ids = Object.keys(hass.states);
    const entity =
      ids.find((id) => /^humidifier\..*p3.*/.test(id)) ??
      ids.find((id) => id.startsWith('humidifier.')) ??
      '';
    const base = entity.replace(/^humidifier\./, '').replace(/_humidifier$/, '');
    const guesses: Partial<Record<keyof CardConfig, string>> = {
      switch_entity: `switch.${base}_switch_status`,
      filter_entity: `sensor.${base}_filter_life_level`,
      lock_entity: `switch.${base}_physical_control_locked`,
      screen_entity: `switch.${base}_switch_status_2`,
      dry_time_entity: 'sensor.p3_fan_dry_time',
      clean_loop_entity: 'input_boolean.p3_clean_loop',
      clean_mode_entity: 'input_select.p3_clean_mode',
      water_entity: 'sensor.p3_water_status',
      off_script: 'script.p3_clean_stop',
      constant_script: 'script.p3_mode_constant',
      sleep_script: 'script.p3_mode_sleep',
      strong_script: 'script.p3_mode_strong',
      clean_sleep_script: 'script.p3_clean_start_sleep',
      clean_strong_script: 'script.p3_clean_start_strong',
    };
    const config: Record<string, unknown> = { entity, layout: 'ring' };
    for (const [key, id] of Object.entries(guesses)) {
      if (id && hass.states[id]) config[key] = id;
    }
    return config as Partial<CardConfig>;
  }

  setConfig(config: CardConfig): void {
    if (!config?.entity) {
      throw new Error('Select a humidifier entity');
    }
    this._config = config;
  }

  getCardSize(): number {
    return this._layout === 'compact' ? 4 : 6;
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6 };
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearTimeout(this._pendingTimer);
  }

  protected shouldUpdate(changed: PropertyValues): boolean {
    if (changed.size > 1 || !changed.has('hass')) return true;
    const old = changed.get('hass') as HomeAssistant | undefined;
    if (!old || !this.hass || !this._config) return true;
    if (old.locale?.language !== this.hass.locale?.language) return true;
    return ENTITY_KEYS.some((key) => {
      const id = this._config![key];
      return id !== undefined && old.states[id] !== this.hass!.states[id];
    });
  }

  protected willUpdate(changed: PropertyValues): void {
    if (changed.has('hass') && this._pendingTarget !== undefined && !this._dragging) {
      const old = changed.get('hass') as HomeAssistant | undefined;
      const id = this._config?.entity ?? '';
      const before = old?.states[id]?.attributes.humidity;
      const now = this.hass?.states[id]?.attributes.humidity;
      if (before !== now) this._pendingTarget = undefined;
    }
  }

  // ---------------------------------------------------------------- state

  private get _layout(): Layout {
    const layout = this._config?.layout;
    return layout === 'compact' || layout === 'tank' ? layout : 'ring';
  }

  private _t(key: Key): string {
    return localize(key, this.hass?.locale?.language ?? this.hass?.language);
  }

  private _entity(id?: string): HassEntity | undefined {
    return id ? this.hass?.states[id] : undefined;
  }

  private _modeName(key: ModeKey): string {
    const defaults = { constant: 'Constant Humidity', sleep: 'Sleep', strong: 'Strong' };
    return this._config?.[`${key}_mode`] || defaults[key];
  }

  private _computeState(entity: HassEntity): CardState {
    const cfg = this._config!;
    if (entity.state === 'unavailable' || entity.state === 'unknown') {
      return 'unavailable';
    }
    if (this._entity(cfg.clean_loop_entity)?.state === 'on') {
      const mode = this._entity(cfg.clean_mode_entity)?.state;
      if (mode === (cfg.clean_strong_option || 'Strong')) return 'clean_strong';
      if (mode === (cfg.clean_sleep_option || 'Sleep')) return 'clean_sleep';
    }
    if (entity.state !== 'on') return 'off';
    if (this._entity(cfg.switch_entity)?.state === 'off') return 'fan';
    const mode = entity.attributes.mode;
    if (mode === this._modeName('constant')) return 'constant';
    if (mode === this._modeName('sleep')) return 'sleep';
    if (mode === this._modeName('strong')) return 'strong';
    return 'on';
  }

  private _humidity(entity: HassEntity): number | undefined {
    const raw =
      entity.attributes.current_humidity ??
      entity.attributes['environment.relative_humidity'];
    const value = Number(raw);
    return raw === undefined || raw === null || Number.isNaN(value)
      ? undefined
      : Math.round(value);
  }

  private _range(entity: HassEntity): [number, number] {
    const min = Number(entity.attributes.min_humidity ?? 40);
    const max = Number(entity.attributes.max_humidity ?? 70);
    return [min, max];
  }

  private _target(entity: HassEntity): number {
    const [min, max] = this._range(entity);
    const value = this._pendingTarget ?? Number(entity.attributes.humidity ?? min);
    return clamp(Math.round(value), min, max);
  }

  private _dryMinutes(): number {
    const value = Number(this._entity(this._config?.dry_time_entity)?.state);
    return Number.isFinite(value) ? Math.round(value) : 0;
  }

  private _statusText(cardState: CardState, entity: HassEntity): string {
    switch (cardState) {
      case 'clean_sleep':
      case 'clean_strong': {
        const left = this._dryMinutes();
        return left > 0
          ? `${this._t(cardState)} · ${left} ${this._t('min')}`
          : this._t(cardState);
      }
      case 'constant':
        return `${this._t('constant')} · ${this._t('target_short')} ${this._target(entity)}%`;
      case 'on':
        return String(entity.attributes.mode ?? this._t('on'));
      default:
        return this._t(cardState);
    }
  }

  // -------------------------------------------------------------- actions

  private _haptic(): void {
    this.dispatchEvent(
      new CustomEvent('haptic', { detail: 'light', bubbles: true, composed: true }),
    );
  }

  private _moreInfo(): void {
    this.dispatchEvent(
      new CustomEvent('hass-more-info', {
        detail: { entityId: this._config!.entity },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _runScript(entityId: string): void {
    this.hass!.callService('script', 'turn_on', { entity_id: entityId });
  }

  private _turnOff(): void {
    this._haptic();
    const cfg = this._config!;
    if (cfg.off_script) {
      this._runScript(cfg.off_script);
    } else {
      this.hass!.callService('humidifier', 'turn_off', { entity_id: cfg.entity });
    }
  }

  private async _setMode(key: ModeKey): Promise<void> {
    this._haptic();
    const cfg = this._config!;
    const script = cfg[`${key}_script`];
    if (script) {
      this._runScript(script);
      return;
    }
    if (this._entity(cfg.entity)?.state !== 'on') {
      await this.hass!.callService('humidifier', 'turn_on', { entity_id: cfg.entity });
    }
    await this.hass!.callService('humidifier', 'set_mode', {
      entity_id: cfg.entity,
      mode: this._modeName(key),
    });
  }

  private _startClean(key: CleanKey): void {
    this._haptic();
    const script = this._config![`${key}_script`];
    if (script) this._runScript(script);
  }

  private _toggle(entityId: string): void {
    this._haptic();
    this.hass!.callService('homeassistant', 'toggle', { entity_id: entityId });
  }

  private _commitTarget(value: number): void {
    this._pendingTarget = value;
    this.hass!.callService('humidifier', 'set_humidity', {
      entity_id: this._config!.entity,
      humidity: value,
    });
    // Fall back to the device value if it never confirms the change.
    window.clearTimeout(this._pendingTimer);
    this._pendingTimer = window.setTimeout(() => {
      this._pendingTarget = undefined;
    }, 8000);
  }

  private _sliderInput(ev: Event): void {
    this._pendingTarget = Number((ev.target as HTMLInputElement).value);
  }

  private _sliderChange(ev: Event): void {
    this._commitTarget(Number((ev.target as HTMLInputElement).value));
  }

  private _ringValue(ev: PointerEvent, min: number, max: number): number {
    const ring = this.renderRoot.querySelector('.ring') as SVGSVGElement;
    const rect = ring.getBoundingClientRect();
    const scale = rect.width / 200;
    const x = ev.clientX - (rect.left + 100 * scale);
    const y = ev.clientY - (rect.top + 100 * scale);
    let rel = ((Math.atan2(y, x) * 180) / Math.PI - RING_START + 360) % 360;
    if (rel > RING_SWEEP) rel = rel > RING_SWEEP + 45 ? 0 : RING_SWEEP;
    return clamp(Math.round((rel / RING_SWEEP) * 100), min, max);
  }

  private _dragStart(ev: PointerEvent): void {
    ev.preventDefault();
    (ev.currentTarget as Element).setPointerCapture(ev.pointerId);
    this._dragging = true;
  }

  private _dragMove(ev: PointerEvent, min: number, max: number): void {
    if (this._dragging) this._pendingTarget = this._ringValue(ev, min, max);
  }

  private _dragEnd(): void {
    if (!this._dragging) return;
    this._dragging = false;
    if (this._pendingTarget !== undefined) this._commitTarget(this._pendingTarget);
  }

  // --------------------------------------------------------------- render

  protected render() {
    const cfg = this._config;
    if (!cfg || !this.hass) return nothing;
    const entity = this._entity(cfg.entity);
    if (!entity) {
      return html`<ha-card>
        <div class="missing">${this._t('missing_entity')}: ${cfg.entity}</div>
      </ha-card>`;
    }

    const cardState = this._computeState(entity);
    const cleaning = cardState === 'clean_sleep' || cardState === 'clean_strong';
    const active = cardState !== 'off' && cardState !== 'unavailable';
    const classes = [
      `s-${cardState}`,
      `l-${this._layout}`,
      cleaning ? 'cleaning' : '',
      active ? 'active' : '',
    ].join(' ');

    let body: TemplateResult;
    switch (this._layout) {
      case 'compact':
        body = html`
          ${this._renderHeader(cardState, entity, true)}
          ${this._renderBar(cardState, entity)}
          ${this._renderTarget(cardState, entity)}
          ${this._renderModes(cardState)} ${this._renderChips()}
        `;
        break;
      case 'tank':
        body = html`
          <div class="tank-row">
            ${this._renderTank(cardState, entity)}
            <div class="tank-info">
              ${this._renderHeader(cardState, entity, false, false)}
              ${this._renderChips()}
            </div>
          </div>
          ${this._renderTarget(cardState, entity)} ${this._renderModes(cardState)}
        `;
        break;
      default:
        body = html`
          ${this._renderHeader(cardState, entity, false)}
          ${this._renderRing(cardState, entity)}
          ${this._renderTarget(cardState, entity)}
          ${this._renderModes(cardState)} ${this._renderChips()}
        `;
    }
    return html`<ha-card class=${classes}>${body}</ha-card>`;
  }

  private _renderHeader(
    cardState: CardState,
    entity: HassEntity,
    showValue: boolean,
    showBadge = true,
  ) {
    const name =
      this._config!.name ?? entity.attributes.friendly_name ?? this._config!.entity;
    const humidity = this._humidity(entity);
    return html`
      <div
        class="header"
        role="button"
        tabindex="0"
        @click=${this._moreInfo}
        @keydown=${(ev: KeyboardEvent) => ev.key === 'Enter' && this._moreInfo()}
      >
        ${showBadge
          ? html`<div class="badge">${icon(mdiAirHumidifier)}</div>`
          : nothing}
        <div class="titles">
          <div class="title">${name}</div>
          <div class="status">${this._statusText(cardState, entity)}</div>
        </div>
        ${showValue
          ? html`<div class="big">${humidity ?? '–'}<small>%</small></div>`
          : nothing}
      </div>
    `;
  }

  private _renderRing(cardState: CardState, entity: HassEntity) {
    const humidity = this._humidity(entity);
    const filled = (RING_ARC * clamp(humidity ?? 0, 0, 100)) / 100;
    const [min, max] = this._range(entity);
    const target = this._target(entity);
    const angle = ((RING_START + (RING_SWEEP * target) / 100) * Math.PI) / 180;
    const hx = 100 + RING_R * Math.cos(angle);
    const hy = 100 + RING_R * Math.sin(angle);
    const rotate = `rotate(${RING_START} 100 100)`;

    return html`
      <div class="ring-wrap">
        <svg
          class="ring ${this._dragging ? 'dragging' : ''}"
          viewBox="0 0 200 172"
          role="img"
          aria-label="${humidity ?? '–'}%"
        >
          <circle
            class="track"
            cx="100"
            cy="100"
            r=${RING_R}
            stroke-dasharray="${RING_ARC} ${RING_C}"
            transform=${rotate}
          ></circle>
          <circle
            class="value"
            cx="100"
            cy="100"
            r=${RING_R}
            stroke-dasharray="${filled} ${RING_C}"
            transform=${rotate}
          ></circle>
          ${cardState === 'constant'
            ? svg`
                <circle class="handle" cx=${hx} cy=${hy} r="9"></circle>
                <circle
                  class="handle-hit"
                  cx=${hx}
                  cy=${hy}
                  r="20"
                  @pointerdown=${this._dragStart}
                  @pointermove=${(ev: PointerEvent) => this._dragMove(ev, min, max)}
                  @pointerup=${this._dragEnd}
                  @pointercancel=${this._dragEnd}
                ></circle>`
            : nothing}
        </svg>
        <div class="ring-center">
          <div class="ring-value">${humidity ?? '–'}<small>%</small></div>
          <div class="ring-caption">
            ${this._dragging
              ? `${this._t('target_short')} ${target}%`
              : this._t('humidity_now')}
          </div>
        </div>
      </div>
    `;
  }

  private _renderBar(cardState: CardState, entity: HassEntity) {
    const humidity = clamp(this._humidity(entity) ?? 0, 0, 100);
    const target = this._target(entity);
    const constant = cardState === 'constant';
    return html`
      <div class="bar">
        <div class="bar-fill" style="width:${humidity}%"></div>
        ${constant
          ? html`<div class="bar-target" style="left:${target}%"></div>`
          : nothing}
      </div>
      <div class="bar-scale">
        <span>0%</span>
        <span>${constant ? `${this._t('target_short')} ${target}%` : ''}</span>
        <span>100%</span>
      </div>
    `;
  }

  private _renderTank(cardState: CardState, entity: HassEntity) {
    const humidity = this._humidity(entity);
    const level = clamp(humidity ?? 0, 0, 100);
    return html`
      <div class="tank" @click=${this._moreInfo}>
        <div class="water" style="height:${level}%">
          <svg class="wave" viewBox="0 0 200 10" preserveAspectRatio="none">
            <path d="M0 10V5Q25 0 50 5T100 5T150 5T200 5V10Z"></path>
          </svg>
        </div>
        ${cardState === 'constant'
          ? html`<div
              class="tank-target"
              style="bottom:${this._target(entity)}%"
            ></div>`
          : nothing}
        <div class="tank-value">${humidity ?? '–'}%</div>
      </div>
    `;
  }

  private _renderTarget(cardState: CardState, entity: HassEntity) {
    if (cardState !== 'constant') return nothing;
    const [min, max] = this._range(entity);
    const target = this._target(entity);
    return html`
      <label class="target">
        <span>${this._t('target')}</span>
        <input
          type="range"
          min=${min}
          max=${max}
          step="1"
          .value=${String(target)}
          @input=${this._sliderInput}
          @change=${this._sliderChange}
        />
        <output>${target}%</output>
      </label>
    `;
  }

  private _modeButton(
    active: boolean,
    path: string,
    label: string,
    action: () => void,
    wide = false,
  ) {
    return html`
      <button
        class="mode ${active ? 'active' : ''} ${wide ? 'wide' : ''}"
        aria-pressed=${active ? 'true' : 'false'}
        @click=${action}
      >
        ${icon(path)}<span>${label}</span>
      </button>
    `;
  }

  private _renderModes(cardState: CardState) {
    const cfg = this._config!;
    const left = this._dryMinutes();
    const cleanLabel = (key: CleanKey) =>
      cardState === key && left > 0
        ? `${this._t(key)} · ${left} ${this._t('min')}`
        : this._t(key);

    return html`
      <div class="modes">
        ${this._modeButton(cardState === 'off', mdiPower, this._t('off'), () =>
          this._turnOff(),
        )}
        ${this._modeButton(
          cardState === 'constant',
          mdiWaterPercent,
          this._t('constant'),
          () => this._setMode('constant'),
        )}
        ${this._modeButton(
          cardState === 'sleep',
          mdiWeatherNight,
          this._t('sleep'),
          () => this._setMode('sleep'),
        )}
        ${this._modeButton(
          cardState === 'strong',
          mdiWeatherWindy,
          this._t('strong'),
          () => this._setMode('strong'),
        )}
      </div>
      ${cfg.clean_sleep_script || cfg.clean_strong_script
        ? html`<div class="clean">
            ${cfg.clean_sleep_script
              ? this._modeButton(
                  cardState === 'clean_sleep',
                  mdiShimmer,
                  cleanLabel('clean_sleep'),
                  () => this._startClean('clean_sleep'),
                  true,
                )
              : nothing}
            ${cfg.clean_strong_script
              ? this._modeButton(
                  cardState === 'clean_strong',
                  mdiShimmer,
                  cleanLabel('clean_strong'),
                  () => this._startClean('clean_strong'),
                  true,
                )
              : nothing}
          </div>`
        : nothing}
    `;
  }

  private _renderChips() {
    const cfg = this._config!;
    const chips: TemplateResult[] = [];

    const water = this._entity(cfg.water_entity);
    if (water) {
      const ok =
        water.state.toLowerCase() === (cfg.water_ok_state || 'Normal').toLowerCase();
      chips.push(html`
        <span class="chip ${ok ? '' : 'warn'}">
          ${icon(ok ? mdiWater : mdiWaterAlert)}
          ${ok ? this._t('water_ok') : this._t('water_low')}
        </span>
      `);
    }

    const filter = this._entity(cfg.filter_entity);
    if (filter) {
      const life = Number(filter.state);
      const known = Number.isFinite(life);
      const warn = known && life < (cfg.filter_warning ?? 15);
      chips.push(html`
        <span class="chip ${warn ? 'warn' : ''}">
          ${icon(mdiAirFilter)} ${this._t('filter')}
          ${known ? `${Math.round(life)}%` : '–'}
        </span>
      `);
    }

    const lock = this._entity(cfg.lock_entity);
    if (lock) {
      const on = lock.state === 'on';
      chips.push(html`
        <button
          class="chip ${on ? 'on' : ''}"
          aria-pressed=${on ? 'true' : 'false'}
          @click=${() => this._toggle(lock.entity_id)}
        >
          ${icon(on ? mdiLock : mdiLockOpenVariant)} ${this._t('lock')}
        </button>
      `);
    }

    const screen = this._entity(cfg.screen_entity);
    if (screen) {
      const on = screen.state === 'on';
      chips.push(html`
        <button
          class="chip ${on ? 'on' : ''}"
          aria-pressed=${on ? 'true' : 'false'}
          @click=${() => this._toggle(screen.entity_id)}
        >
          ${icon(on ? mdiLightbulbOn : mdiLightbulbOutline)} ${this._t('screen')}
        </button>
      `);
    }

    return chips.length ? html`<div class="chips">${chips}</div>` : nothing;
  }
}

declare global {
  interface Window {
    customCards?: Array<Record<string, unknown>>;
  }
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: CARD_TAG,
  name: 'Xiaomi P3 Humidifier Card',
  description: 'Humidifier card with ring, compact and tank layouts',
  preview: true,
  documentationURL: 'https://github.com/VahaC/xiaomi-p3-humidifier-card',
});

console.info(
  `%c XIAOMI-P3-HUMIDIFIER-CARD %c v${version} `,
  'color:#fff;background:#2196f3;font-weight:700',
  'color:#2196f3;background:#fff',
);
