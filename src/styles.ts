import { css } from 'lit';

export const cardStyles = css`
  :host {
    display: block;
  }

  ha-card {
    --accent: var(--p3-on-color, var(--blue-color, #2196f3));
    --tint: color-mix(in srgb, var(--accent) 15%, transparent);
    --soft: color-mix(in srgb, var(--primary-text-color) 8%, transparent);
    box-sizing: border-box;
    height: 100%;
    padding: 16px;
    overflow: hidden;
  }
  ha-card.s-off,
  ha-card.s-unavailable {
    --accent: var(--p3-off-color, var(--state-inactive-color, #9e9e9e));
  }
  ha-card.s-fan {
    --accent: var(--p3-fan-color, var(--green-color, #4caf50));
  }
  ha-card.s-clean_sleep,
  ha-card.s-clean_strong {
    --accent: var(--p3-clean-color, var(--purple-color, #9c27b0));
  }

  .icon {
    width: 24px;
    height: 24px;
    fill: currentColor;
    flex: none;
  }

  /* Header */
  .header {
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
  }
  .badge {
    display: grid;
    place-items: center;
    flex: none;
    width: 42px;
    height: 42px;
    border-radius: 50%;
    background: var(--tint);
    color: var(--accent);
    transition: background-color 0.4s, color 0.4s;
  }
  .cleaning .badge {
    animation: pulse 2.4s ease-in-out infinite;
  }
  .titles {
    flex: 1;
    min-width: 0;
  }
  .title {
    overflow: hidden;
    color: var(--primary-text-color);
    font-size: 16px;
    font-weight: 500;
    line-height: 1.3;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .status {
    overflow: hidden;
    color: var(--accent);
    font-size: 13px;
    line-height: 1.4;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: color 0.4s;
  }
  .s-off .status,
  .s-unavailable .status {
    color: var(--secondary-text-color);
  }
  .big {
    color: var(--primary-text-color);
    font-size: 32px;
    font-weight: 500;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  .big small,
  .ring-value small {
    margin-left: 1px;
    color: var(--secondary-text-color);
    font-size: 0.45em;
    font-weight: 400;
  }

  /* Ring layout */
  .ring-wrap {
    position: relative;
    width: 200px;
    max-width: 100%;
    margin: 10px auto 0;
  }
  .ring {
    display: block;
    width: 100%;
    overflow: visible;
  }
  .ring circle {
    fill: none;
    stroke-width: 11;
    stroke-linecap: round;
  }
  .ring .track {
    stroke: var(--soft);
  }
  .ring .value {
    stroke: var(--accent);
    transition: stroke-dasharray 0.8s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.4s;
  }
  .cleaning .ring .value {
    animation: breathe 2.4s ease-in-out infinite;
  }
  .ring .handle {
    fill: var(--card-background-color, var(--ha-card-background, #fff));
    stroke: var(--accent);
    stroke-width: 4;
    cursor: grab;
    touch-action: none;
  }
  .ring .handle-hit {
    fill: transparent;
    stroke: none;
    cursor: grab;
    touch-action: none;
  }
  .ring.dragging .handle,
  .ring.dragging .handle-hit {
    cursor: grabbing;
  }
  .ring-center {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding-top: 6px;
    pointer-events: none;
  }
  .ring-value {
    color: var(--primary-text-color);
    font-size: 44px;
    font-weight: 500;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  .ring-caption {
    margin-top: 6px;
    color: var(--secondary-text-color);
    font-size: 12px;
  }

  /* Compact layout */
  .bar {
    position: relative;
    height: 8px;
    margin-top: 18px;
    border-radius: 4px;
    background: var(--soft);
  }
  .bar-fill {
    height: 100%;
    border-radius: 4px;
    background: var(--accent);
    transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.4s;
  }
  .cleaning .bar-fill {
    animation: breathe 2.4s ease-in-out infinite;
  }
  .bar-target {
    position: absolute;
    top: -4px;
    width: 4px;
    height: 16px;
    margin-left: -2px;
    border-radius: 2px;
    background: var(--primary-text-color);
    transition: left 0.3s;
  }
  .bar-scale {
    display: flex;
    justify-content: space-between;
    margin-top: 6px;
    color: var(--secondary-text-color);
    font-size: 11px;
  }

  /* Tank layout */
  .tank-row {
    display: flex;
    align-items: stretch;
    gap: 16px;
  }
  .tank {
    position: relative;
    flex: none;
    width: 84px;
    min-height: 172px;
    overflow: hidden;
    border: 2px solid var(--accent);
    border-radius: 22px;
    cursor: pointer;
    transition: border-color 0.4s;
  }
  .water {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    background: color-mix(in srgb, var(--accent) 38%, transparent);
    transition: height 0.8s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.4s;
  }
  .wave {
    position: absolute;
    bottom: calc(100% - 1px);
    left: 0;
    width: 200%;
    height: 8px;
    fill: color-mix(in srgb, var(--accent) 38%, transparent);
    transition: fill 0.4s;
  }
  .active .wave {
    animation: wave 3.5s linear infinite;
  }
  .tank-target {
    position: absolute;
    right: 0;
    left: 0;
    border-top: 2px dashed var(--primary-text-color);
    transition: bottom 0.3s;
  }
  .tank-value {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: var(--primary-text-color);
    font-size: 24px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }
  .tank-info {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }
  .tank-info .header {
    align-items: flex-start;
  }
  .tank-info .chips {
    justify-content: flex-start;
    margin-top: auto;
    padding-top: 12px;
  }

  /* Target slider */
  .target {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 14px;
    color: var(--secondary-text-color);
    font-size: 13px;
  }
  .target input {
    flex: 1;
    min-width: 0;
    height: 24px;
    margin: 0;
    accent-color: var(--accent);
    cursor: pointer;
  }
  .target output {
    min-width: 38px;
    color: var(--primary-text-color);
    font-weight: 500;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  /* Mode buttons */
  .modes,
  .clean {
    display: flex;
    gap: 8px;
  }
  .modes {
    margin-top: 14px;
  }
  .clean {
    margin-top: 8px;
  }
  .mode {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    min-width: 0;
    padding: 10px 4px;
    border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.3));
    border-radius: 12px;
    background: transparent;
    color: var(--secondary-text-color);
    font: inherit;
    font-size: 12px;
    line-height: 1.2;
    cursor: pointer;
    transition: background-color 0.25s, border-color 0.25s, color 0.25s,
      transform 0.1s;
    -webkit-tap-highlight-color: transparent;
  }
  .mode span {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .mode:hover {
    background: var(--soft);
  }
  .mode:active {
    transform: scale(0.96);
  }
  .mode:focus-visible,
  .chip:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .mode.active {
    border-color: var(--accent);
    background: var(--tint);
    color: var(--accent);
  }
  .mode.wide {
    flex-direction: row;
    justify-content: center;
    gap: 8px;
    padding: 9px 6px;
  }
  .mode.wide .icon {
    width: 18px;
    height: 18px;
  }

  /* Chips */
  .chips {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
    margin-top: 14px;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border: 0;
    border-radius: 999px;
    background: var(--soft);
    color: var(--secondary-text-color);
    font: inherit;
    font-size: 12px;
    line-height: 1.4;
    white-space: nowrap;
  }
  .chip .icon {
    width: 14px;
    height: 14px;
  }
  button.chip {
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .chip.on {
    background: color-mix(in srgb, var(--primary-color) 16%, transparent);
    color: var(--primary-color);
  }
  .chip.warn {
    background: color-mix(in srgb, var(--warning-color, #ffa600) 22%, transparent);
    color: color-mix(
      in srgb,
      var(--warning-color, #ffa600) 65%,
      var(--primary-text-color)
    );
  }

  .missing {
    padding: 8px 0;
    color: var(--error-color, #db4437);
  }

  @keyframes pulse {
    50% {
      transform: scale(1.1);
    }
  }
  @keyframes breathe {
    50% {
      opacity: 0.45;
    }
  }
  @keyframes wave {
    to {
      transform: translateX(-50%);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    * {
      animation: none !important;
      transition: none !important;
    }
  }
`;
