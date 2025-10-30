/*!
 * Donut Card — v3.5 (Final-style dual-entity)
 * Gebaseerd op Battery Donut Card — Final5
 * - Twee entiteiten: entiteit 1 bepaalt de ringkleur (gradient)
 * - entiteit 2 wordt getoond als extra waarde onder entiteit 1
 * - Alles schaalbaar, met instelbare labelafstand en volledige kleurcontrole
 */

(() => {
  const TAG = "donut-card";
  const VERSION = "7.0";

  class DonutCard extends HTMLElement {
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

        // 🎨 Kleurinstellingen
        background: "var(--card-background-color)",
        border_radius: "12px",
        border: "1px solid rgba(255,255,255,0.2)",
        box_shadow: "none",
        padding: "0px",
        track_color: "#000000",
        color_red: "#ff0000",
        color_orange: "#fb923c",
        color_yellow: "#facc15",
        color_green: "#34d399",
        color_cyan: "#00bcd4",
        stop_red_hold: 0.11,
        stop_orange: 0.25,
        stop_yellow: 0.45,
        stop_green: 0.7,

        // 🏷️ Labels & tekst
        top_label_text: "Donut",
        top_label_weight: 400,
        top_label_color: "#ffffff",
        text_color_inside: "#ffffff",
        font_scale_ent1: 0.30,
        font_scale_ent2: 0.30,

        // 🟢 Ring Layout
        ring_radius: 65,
        ring_width: 8,
        ring_offset_y: 0,
        label_ring_gap: 17,
      };
    }

    setConfig(config) {
      this._config = { ...DonutCard.getStubConfig(), ...config };
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
      const cy = 130 + Number(c.ring_offset_y || 0);
      const rot = -90;
      const segs = 140;
      const span = frac * 360;

      const stops = [
        [0.0, c.color_red],
        [c.stop_red_hold, c.color_red],
        [c.stop_orange, c.color_orange],
        [c.stop_yellow, c.color_yellow],
        [c.stop_green, c.color_green],
        [1.0, c.color_cyan],
      ];

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
                  stroke="${c.track_color}" stroke-width="${W}" stroke-linecap="round"/>
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

      // 🔹 Top label
      if ((c.top_label_text ?? "").trim() !== "") {
        const fs_top = R * 0.35;
        const y_top = (cy - R) - (W * 0.8) - fs_top * 0.25 - Number(c.label_ring_gap || 0);
        svg += `
          <text x="${cx}" y="${y_top}" font-size="${fs_top}"
                font-weight="${c.top_label_weight || 400}"
                fill="${c.top_label_color}" text-anchor="middle"
                dominant-baseline="middle">${c.top_label_text}</text>
        `;
      }

      // 🔹 Binnenste tekst
      const textColor = c.text_color_inside || "#fff";
      const fs1 = R * (c.font_scale_ent1 ?? 0.3);
      const fs2 = R * (c.font_scale_ent2 ?? 0.3);
      const y1 = cy - R * 0.05;
      const y2 = cy + R * 0.35;

      svg += `
        <text x="${cx}" y="${y1}" text-anchor="middle"
              font-size="${fs1}" font-weight="400"
              fill="${textColor}">
              ${val1.toFixed(0)} ${ent1.attributes.unit_of_measurement || ""}
        </text>
      `;
      if (ent2)
        svg += `
          <text x="${cx}" y="${y2}" text-anchor="middle"
                font-size="${fs2}" font-weight="300"
                fill="${textColor}">
                ${val2.toFixed(2)} ${ent2.attributes.unit_of_measurement || ""}
          </text>
        `;

      svg += `</svg>`;

      const style = `
        <style>
          :host { display:block; width:100%; height:100%; }
          ha-card {
            background:${c.background};
            border-radius:${c.border_radius};
            border:${c.border};
            box-shadow:${c.box_shadow};
            padding:${c.padding};
            display:flex; align-items:center; justify-content:center;
            width:100%; height:100%;
          }
          .wrap { width:100%; height:100%; max-width:520px;
            display:flex; align-items:center; justify-content:center; position:relative;
          }
          svg { width:100%; height:auto; display:block; }
          text { user-select:none; }
        </style>
      `;

      this.shadowRoot.innerHTML = `
        ${style}
        <ha-card>
          <div class="wrap">${svg}</div>
        </ha-card>
      `;
    }
  }

  try {
    if (!customElements.get("donut-card")) {
      customElements.define("donut-card", DonutCard);
      console.info(
        `%c ${TAG} %c v${VERSION}`,
        "background:#00bcd4;color:#000;padding:2px 6px;border-radius:3px 0 0 3px;font-weight:700",
        "background:#333;color:#fff;padding:2px 6px;border-radius:0 3px 3px 0"
      );
    }
  } catch (err) {
    console.error("❌ Fout bij registratie donut-card:", err);
  }
})();
