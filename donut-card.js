/*!
 * 🟢 Donut Card v28.0.0 (The Final Idiot Fix)
 * - Fix: Trendpijl in het midden gebruikt eindelijk de logische kleuren (Omhoog = Groen, Omlaag = Rood).
 * - Verder 100% identiek aan v27.0.0 (dikke letters, transparantie fix, etc.).
 */

(() => {
  const TAG = "donut-card";
  const VERSION = "28.0.0";

  console.info(
    `%c 🟢 DONUT-CARD %c v${VERSION} `,
    'color: white; background: #03a9f4; font-weight: 700; border-radius: 4px 0 0 4px; padding: 2px 4px;',
    'color: #03a9f4; background: white; font-weight: 700; border-radius: 0 4px 4px 0; padding: 2px 4px;'
  );

  class DonutCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._hass = null;
      this._config = null;
      this._elements = {};
      this._lastValue = null;
    }

    static getConfigElement() { return document.createElement("donut-card-editor"); }

    static getStubConfig() {
      return {
        type: "custom:donut-card",
        top_label_text: "Energie",
        max_value: 5000,
        entity_primary: "",
        unit_primary: "W",
        decimals_primary: 0,
        show_trend: true,
        start_color: "#00ff00",
        stop_5: 0.9, color_5: "#ff0000"
      };
    }

    getGridOptions() {
      return {
        columns: 4,
        rows: 4,
        min_columns: 2,
        min_rows: 2
      };
    }

    setConfig(config) {
      this._config = { ...DonutCard.getStubConfig(), ...config };
      this._buildDOM();
      if (this._hass) this._updateValues();
    }

    set hass(h) {
      if (!this._config) { this._hass = h; return; }
      const c = this._config;
      const ids = [c.entity_primary, c.entity_secondary, c.entity_min, c.entity_max];
      
      const changed = ids.some(id => id && this._hass?.states[id]?.state !== h.states[id]?.state);
      this._hass = h;
      if (changed) this._updateValues();
    }

    _clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    _toRad(d) { return (d * Math.PI) / 180; }
    
    _hex2rgb(h) {
      const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(h).trim());
      return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 255, g: 255, b: 255 };
    }
    
    _lerpColor(colorA, colorB, t) {
      const A = this._hex2rgb(colorA), B = this._hex2rgb(colorB);
      const lerp = (v0, v1, f) => Math.round(v0 + (v1 - v0) * f);
      const rHex = lerp(A.r, B.r, t).toString(16).padStart(2, "0");
      const gHex = lerp(A.g, B.g, t).toString(16).padStart(2, "0");
      const bHex = lerp(A.b, B.b, t).toString(16).padStart(2, "0");
      return `#${rHex}${gHex}${bHex}`;
    }

    _colorAtStops(stops, t) {
      t = this._clamp(t, 0, 1);
      for (let i = 0; i < stops.length - 1; i++) {
        const [pa, ca] = stops[i], [pb, cb] = stops[i + 1];
        if (t >= pa && t <= pb) return this._lerpColor(ca, cb, (t - pa) / (pb - pa || 1e-6));
      }
      return stops[stops.length - 1][1];
    }

    _buildDOM() {
      const c = this._config;
      const R = 80, W = 7, cx = 130, cy = 130;
      const circumference = 2 * Math.PI * R;
      this._circumference = circumference;

      const stops = [
        [0.0, c.start_color || "#0000ff"],
        [c.stop_2 || 0.25, c.color_2 || "#00ff00"],
        [c.stop_3 || 0.50, c.color_3 || "#ffff00"],
        [c.stop_4 || 0.75, c.color_4 || "#ff7f00"],
        [c.stop_5 || 1.0, c.color_5 || "#ff0000"]
      ].sort((a,b) => a[0] - b[0]);
      this._currentStops = stops;

      let gradientPaths = "";
      for (let i = 139; i >= 0; i--) {
        const a0 = -90 + (i / 140) * 360, a1 = -90 + ((i + 1.2) / 140) * 360;
        const x0 = cx + R * Math.cos(this._toRad(a0)), y0 = cy + R * Math.sin(this._toRad(a0));
        const x1 = cx + R * Math.cos(this._toRad(a1)), y1 = cy + R * Math.sin(this._toRad(a1));
        gradientPaths += `<path d="M ${x0} ${y0} A ${R} ${R} 0 0 1 ${x1} ${y1}" fill="none" stroke="${this._colorAtStops(stops, i / 140)}" stroke-width="${W}" />`;
      }

      this.shadowRoot.innerHTML = `
        <style>
          :host { display: block; width: 100%; height: 100%; }
          ha-card { display:flex; align-items:center; justify-content:center; width:100%; height:100%; box-sizing: border-box; padding: 12px; overflow: hidden; color: var(--primary-text-color, currentColor); }
          .wrap { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; position: relative; }
          svg { width: 100%; height: 100%; aspect-ratio: 1 / 1; display: block; max-width: 100%; overflow: visible; }
          text { user-select: none; font-family: Inter, system-ui, sans-serif; fill: currentColor; }
          .corner { font-size: 20px; font-weight: 500; }
          #mask-circle { transition: stroke-dashoffset 0.5s ease-out; }
        </style>
        <ha-card>
          <div class="wrap">
            <svg viewBox="0 0 260 260" preserveAspectRatio="xMidYMid meet">
              <defs>
                <mask id="m">
                  <circle id="mask-circle" cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="white" stroke-width="${W}" 
                    stroke-dasharray="${circumference} ${circumference + 1}" stroke-dashoffset="${circumference}" 
                    transform="rotate(-90 ${cx} ${cy})" />
                </mask>
              </defs>
              <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="rgba(150, 150, 150, 0.15)" stroke-width="${W}" />
              <g mask="url(#m)">${gradientPaths}</g>
              <circle id="start-cap" cx="${cx}" cy="${cy - R}" r="${W / 2}" fill="${stops[0][1]}" />
              <g id="end-cap-group" style="transform-origin: ${cx}px ${cy}px; transition: transform 0.5s ease-out;">
                <circle id="end-cap" cx="${cx}" cy="${cy - R}" r="${W / 2}" fill="${stops[0][1]}" style="transition: fill 0.5s ease-out;" />
              </g>
              
              <text x="${cx}" y="${cy - R - 32}" font-size="30" font-weight="400" text-anchor="middle">${c.top_label_text || ""}</text>
              <text id="val1" x="${cx}" y="${cy - 4}" font-size="24" text-anchor="middle" font-weight="600">--</text>
              <text id="trend" x="${cx + 45}" y="${cy - 4}" font-size="18" text-anchor="start" font-weight="600"></text>
              <text id="val2" x="${cx}" y="${cy + 24}" font-size="22" text-anchor="middle" font-weight="500"></text>
              
              <text id="min-val" x="10" y="245" class="corner" text-anchor="start"></text>
              <text id="max-val" x="250" y="245" class="corner" text-anchor="end"></text>
            </svg>
          </div>
        </ha-card>
      `;

      this._elements = {
        mask: this.shadowRoot.getElementById("mask-circle"),
        start: this.shadowRoot.getElementById("start-cap"),
        endG: this.shadowRoot.getElementById("end-cap-group"),
        endC: this.shadowRoot.getElementById("end-cap"),
        v1: this.shadowRoot.getElementById("val1"),
        v2: this.shadowRoot.getElementById("val2"),
        trend: this.shadowRoot.getElementById("trend"),
        min: this.shadowRoot.getElementById("min-val"),
        max: this.shadowRoot.getElementById("max-val")
      };
    }

    _updateValues() {
      const h = this._hass; const c = this._config; if (!h || !c.entity_primary || !this._elements.mask) return;
      const s1 = h.states[c.entity_primary]; if (!s1) return;
      
      const val1 = Number(s1.state.replace(",", ".")) || 0;
      const frac = this._clamp(val1 / (Number(c.max_value) || 100), 0, 1);
      
      // LOGISCHE KLEUREN: Omhoog = Groen, Omlaag = Rood
      if (c.show_trend && this._lastValue !== null) {
        const diff = val1 - this._lastValue;
        const threshold = val1 * 0.005;
        if (Math.abs(diff) > threshold) {
           this._elements.trend.textContent = diff > 0 ? "▲" : "▼";
           this._elements.trend.style.fill = diff > 0 ? "#00ff00" : "#ff4444";
        }
      } else {
        this._elements.trend.textContent = "";
      }
      this._lastValue = val1;

      this._elements.v1.textContent = `${val1.toFixed(c.decimals_primary)} ${c.unit_primary || ""}`;
      
      if (c.entity_secondary && h.states[c.entity_secondary]) {
        const val2 = Number(h.states[c.entity_secondary].state.replace(",", ".")) || 0;
        this._elements.v2.textContent = `${val2.toFixed(c.decimals_secondary)} ${c.unit_secondary || ""}`;
        this._elements.v1.setAttribute("y", "120");
        this._elements.trend.setAttribute("y", "120");
      } else {
        this._elements.v2.textContent = "";
        this._elements.v1
