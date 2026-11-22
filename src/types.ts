export type Layout = 'ring' | 'compact' | 'tank';

export type CardState =
  | 'unavailable'
  | 'off'
  | 'constant'
  | 'sleep'
  | 'strong'
  | 'on'
  | 'fan'
  | 'clean_sleep'
  | 'clean_strong';

export interface CardConfig {
  type: string;
  /** Humidifier entity (required). */
  entity: string;
  name?: string;
  layout?: Layout;

  /** Switch that is off while the device only runs its fan. */
  switch_entity?: string;
  /** Sensor with the remaining clean / fan-dry minutes. */
  dry_time_entity?: string;
  /** input_boolean that is on while the clean loop runs. */
  clean_loop_entity?: string;
  /** input_select holding the clean loop mode. */
  clean_mode_entity?: string;
  water_entity?: string;
  /** State of `water_entity` that means "enough water". */
  water_ok_state?: string;
  filter_entity?: string;
  /** Filter life (%) below which the chip turns into a warning. */
  filter_warning?: number;
  lock_entity?: string;
  screen_entity?: string;

  off_script?: string;
  constant_script?: string;
  sleep_script?: string;
  strong_script?: string;
  clean_sleep_script?: string;
  clean_strong_script?: string;

  /** Device mode names, as reported in the humidifier `mode` attribute. */
  constant_mode?: string;
  sleep_mode?: string;
  strong_mode?: string;
  /** Clean loop mode names, as reported by `clean_mode_entity`. */
  clean_sleep_option?: string;
  clean_strong_option?: string;
}

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
}

export interface HomeAssistant {
  states: Record<string, HassEntity | undefined>;
  locale?: { language: string };
  language?: string;
  callService(
    domain: string,
    service: string,
    data?: Record<string, unknown>,
  ): Promise<unknown>;
}
