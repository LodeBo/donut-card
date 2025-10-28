/*!
 * Donut Metric Card — v0.1
 * Universele ringkaart met twee entiteiten
 * - entity_primary bepaalt vulling + kleur (via gradient)
 * - entity_secondary wordt als extra waarde getoond
 * - Volledig schaalbaar, theme-aware, en zonder extra iconen
 */

(() => {
  const TAG = "donut-card";
  const VERSION = "3.0";

  class DonutMetricCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._hass = null;
      this._config = null;
    }

    static getStubConfig() {
      return {
        entity_primary: "sensor.example_power",
        entity_secondary: "sensor.example_energy",
        min_value: 0,
        max_value: 100,
        unit_primary: "W",
        unit_secondary: "kWh",
        label_text: "Solar",
        font_scale_primary: 0.35,
        font_scale_secondary: 0.25,
        ring_radius: 80,
        ring_width: 8,
        color_stops: [
          [0, "#ff0000"],
          [0.25, "#fb923c"],
          [0.5, "#facc15"],
          [0.75, "#34d399"],
          [1.0, "#00bcd4"],
        ],
        background: "var(--card-background-color)",
        border_radius: "12px",
        border: "1px solid rgba(255,255,255,0.2)",
        box_shadow: "none",
        padding: "0px",
      };
    }

    setConfig(config) {
      this._config = { ...DonutMetricCard.getStubConfig(), ...config };
    }

    set hass(hass) {
      this._hass = hass;
      this.render();
    }

    _clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    _lerp(a, b, t) { return a + (b - a) * t; }
    _hex2rgb(h) {
      const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);
      return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 255, g: 255, b: 255 };
    }
    _rgb2hex(r, g, b) {
      const toHex = (x) => Math.round(x).toString(16).padStart(2, "0");
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
    _lerpColor(a, b, t) {
      const A = this._hex2rgb(a), B = this._hex2rgb(b);
      return this._rgb2hex(this._lerp(A.r, B.r, t), this._lerp(A.g, B.g, t), this._lerp(A.b, B.b, t));
    }
    _colorAtStops(stops, t) {
      t = this._clamp(t, 0, 1);
      for (let i = 0; i < stops.length - 1; i++) {
        const [posA, colA] = stops[i];
        const [posB, colB] = stops[i + 1];
        if (t >= posA && t <= posB) {
          const f = (t - posA) / Math.max(posB - posA, 1e-6);
          return this._lerpColor(colA, colB, f);
        }
      }
      return stops[stops.length - 1][1];
    }

    render() {
      if (!this._config || !this._hass) return;

      const c = this._config;
      const h = this._hass;
      const ent1 = h.states[c.entity_primary];
      const ent2 = c.entity_secondary ? h.states[c.entity_secondary] : null;

      if (!ent1) return;

      const val1 = parseFloat(ent1.state) || 0;
      const val2 = ent2 ? parseFloat(ent2.state) : null;

      const min = c.min_value ?? 0;
      const max = c.max_value ?? 100;
      const frac = this._clamp((val1 - min) / (max - min), 0, 1);

      const R = Number(c.ring_radius);
      const W = Number(c.ring_width);
      const cx = 130;
      const cy = 130;
      const rot = -90;
      const segs = 140;
      const span = frac * 360;
      const stops = c.color_stops;

      const arcSeg = (a0, a1, sw, color) => {
        const toRad = (d) => (d * Math.PI) / 180;
        const x0 = cx + R * Math.cos(toRad(a0));
        const y0 = cy + R * Math.sin(toRad(a0));
        const x1 = cx + R * Math.cos(toRad(a1));
        const y1 = cy + R * Math.sin(toRad(a1));
        const large = (a1 - a0) > 180 ? 1 : 0;
        return `<path d="M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1}"
                fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>`;
      };

      let svg = `
        <svg viewBox="0 0 260 260" xmlns="http://www.w3.org/2000/svg">
          <circle cx="${cx}" cy="${cy}" r="${R}" fill="none"
                  stroke="#000" stroke-width="${W}" opacity="0.3"/>
      `;

      const start = rot, end = rot + span;
      for (let i = 0; i < segs; i++) {
        const a0 = start + (i / segs) * span;
        const a1 = start + ((i + 1) / segs) * span;
        if (a1 > end) break;
        const mid = (a0 + a1) / 2;
        const t = (mid - rot) / 360;
        svg += arcSeg(a0, a1, W, this._colorAtStops(stops, t));
      }

      const fs1 = R * (c.font_scale_primary ?? 0.35);
      const fs2 = R * (c.font_scale_secondary ?? 0.25);
      const y1 = cy - R * 0.05;
      const y2 = cy + R * 0.35;
      const textColor = "#fff";

      svg += `
        <text x="${cx}" y="${y1}" text-anchor="middle"
              font-size="${fs1}" font-weight="400" fill="${textColor}">
              ${val1.toFixed(0)} ${c.unit_primary || ""}
        </text>
      `;
      if (ent2)
        svg += `
          <text x="${cx}" y="${y2}" text-anchor="middle"
                font-size="${fs2}" font-weight="300" fill="${textColor}">
                ${val2.toFixed(2)} ${c.unit_secondary || ""}
          </text>
        `;

      if (c.label_text)
        svg += `
          <text x="${cx}" y="${cy - R - 15}" text-anchor="middle"
                font-size="${R * 0.3}" font-weight="300" fill="#fff">
                ${c.label_text}
          </text>
        `;

      svg += `</svg>`;

      const style = `
        <style>
          ha-card {
            background: ${c.background};
            border-radius: ${c.border_radius};
            border: ${c.border};
            box-shadow: ${c.box_shadow};
            padding: ${c.padding};
            display: flex;
            align-items: center;
            justify-content: center;
          }
          svg { width: 100%; height: auto; }
        </style>
      `;

      this.shadowRoot.innerHTML = `
        ${style}
        <ha-card>${svg}</ha-card>
      `;
    }
  }

  if (!customElements.get(TAG)) customElements.define(TAG, DonutMetricCard);
})();
