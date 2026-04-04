/*!
 * 🟢 Donut Card v9.0.0 (The Visual Polish)
 * - Lettergroottes 100% gematcht met de Batterij-kaart.
 * - Colorpicker UI volledig vernieuwd (ronde swatches, HA-styling).
 * - Rest van de logica (v6.0.1) onaangetast gebleven.
 */

(() => {
  const TAG = "donut-card";
  const VERSION = "9.0.0";

  class DonutCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._hass = null;
      this._config = null;
      this._elements = {};
    }

    static getConfigElement() { return document.createElement("donut-card-editor"); }

    static getStubConfig() {
      return {
        type: "custom:donut-card",
        top_label_text: "Zonnepanelen",
        max_value: 4100,
        entity_primary: "",
        unit_primary: "W",
        decimals_primary: 0,
        entity_secondary: "",
        unit_secondary: "kWh",
        decimals_secondary: 2,
        start_color: "#0000ff",
        stop_2: 0.38, color_2: "#008000",
        stop_3: 0.57, color_3: "#ff007f",
        stop_4: 0.72, color_4: "#000033",
        stop_5: 0.89, color_5: "#cc3300",
      };
    }

    setConfig(config) {
      this._config = { ...DonutCard.getStubConfig(), ...config };
      this._buildDOM();
      if (this._hass) this._updateValues();
    }

    set hass(h) {
      if (!this._config) { this._hass = h; return; }
      const ent1 = this._config.entity_primary;
      const ent2 = this._config.entity_secondary;
      const changed = (oldH, newH, id) => id && oldH?.states[id]?.state !== newH?.states[id]?.state;
      
      const updateNeeded = changed(this._hass, h, ent1) || changed(this._hass, h, ent2);
      this._hass = h;
      if (updateNeeded) this._updateValues();
    }

    getCardSize() { return 4; }
    getGridOptions() { return { columns: 4, rows: 4, min_columns: 2, min_rows: 2 }; }

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
        if (t >= pa && t <= pb) {
          return this._lerpColor(ca, cb, (t - pa) / (pb - pa || 1e-6));
        }
      }
      return stops[stops.length - 1][1];
    }

    _buildDOM() {
      const c = this._config;
      
      const R = 80, W = 7, cx = 130, cy = 130;
      const circumference = 2 * Math.PI * R;
      this._circumference = circumference;

      const stops = [
        [0.00, c.start_color],
        [c.stop_2, c.color_2],
        [c.stop_3, c.color_3],
        [c.stop_4, c.color_4],
        [c.stop_5, c.color_5]
      ].sort((a,b) => a[0] - b[0]);
      this._currentStops = stops;

      let gradientPaths = "";
      for (let i = 139; i >= 0; i--) {
        const a0 = -90 + (i / 140) * 360, a1 = -90 + ((i + 1.2) / 140) * 360;
        const x0 = cx + R * Math.cos(this._toRad(a0)), y0 = cy + R * Math.sin(this._toRad(a0));
        const x1 = cx + R * Math.cos(this._toRad(a1)), y1 = cy + R * Math.sin(this._toRad(a1));
        gradientPaths += `<path d="M ${x0} ${y0} A ${R} ${R} 0 0 1 ${x1} ${y1}" fill="none" stroke="${this._colorAtStops(stops, i / 140)}" stroke-width="${W}" />`;
      }

      const titleText = c.top_label_text || "";
      // FIX: Basisgrootte flink omhoog naar 28 (was 24) om te matchen met Batterij-kaart.
      let topFontSize = 28; 
      if (titleText.length > 12) topFontSize = 28 * (12 / titleText.length);
      topFontSize = Math.max(topFontSize, 14); 

      this.shadowRoot.innerHTML = `
        <style>
          :host { display: block; width: 100%; height: 100%; }
          ha-card { background: var(--card-background-color); border-radius: 12px; border: 1px solid rgba(255,255,255,0.2); display:flex; align-items:center; justify-content:center; width:100%; height:100%; box-sizing: border-box; padding: 12px; overflow: hidden; }
          .wrap { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; position: relative; }
          svg { width: 100%; height: 100%; aspect-ratio: 1 / 1; display: block; max-width: 100%; }
          text { user-select: none; font-family: Inter, system-ui, sans-serif; fill: var(--primary-text-color, #ffffff); }
          #mask-circle { transition: stroke-dashoffset 0.5s ease-out; }
        </style>
        <ha-card>
          <div class="wrap">
            <svg viewBox="-20 0 300 260" preserveAspectRatio="xMidYMid meet">
              <defs>
                <mask id="m">
                  <circle id="mask-circle" cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="white" stroke-width="${W}" 
                    stroke-dasharray="${circumference} ${circumference + 1}" stroke-dashoffset="${circumference}" 
                    transform="rotate(-90 ${cx} ${cy})" />
                </mask>
              </defs>
              <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#222222" stroke-width="${W}" />
              <g mask="url(#m)">${gradientPaths}</g>
              <circle id="start-cap" cx="${cx}" cy="${cy - R}" r="${W / 2}" fill="${stops[0][1]}" />
              <g id="end-cap-group" style="transform-origin: ${cx}px ${cy}px; transition: transform 0.5s ease-out;">
                <circle id="end-cap" cx="${cx}" cy="${cy - R}" r="${W / 2}" fill="${stops[0][1]}" style="transition: fill 0.5s ease-out;" />
              </g>
              
              <text x="${cx}" y="${cy - R - 32}" font-size="${topFontSize}" font-weight="400" text-anchor="middle" dominant-baseline="middle">${titleText}</text>
              <text id="val1" x="${cx}" y="${cy - 4}" font-size="26" text-anchor="middle" font-weight="400">--</text>
              <text id="val2" x="${cx}" y="${cy + 24}" font-size="20" text-anchor="middle" font-weight="300"></text>
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
        v2: this.shadowRoot.getElementById("val2")
      };
    }

    _updateValues() {
      const h = this._hass; const c = this._config; if (!h || !c.entity_primary || !this._elements.mask) return;
      const s1 = h.states[c.entity_primary]; if (!s1) return;
      
      const val1 = Number(s1.state.replace(",", ".")) || 0;
      const frac = this._clamp(val1 / (Number(c.max_value) || 100), 0, 1);
      
      this._elements.v1.textContent = `${val1.toFixed(c.decimals_primary)} ${c.unit_primary || ""}`;
      
      if (c.entity_secondary && h.states[c.entity_secondary]) {
        const val2 = Number(h.states[c.entity_secondary].state.replace(",", ".")) || 0;
        this._elements.v2.textContent = `${val2.toFixed(c.decimals_secondary)} ${c.unit_secondary || ""}`;
        this._elements.v2.style.display = "block";
        this._elements.v1.setAttribute("y", "124");
      } else {
        this._elements.v2.style.display = "none";
        this._elements.v1.setAttribute("y", "138");
      }

      this._elements.mask.style.strokeDashoffset = this._circumference - (frac * this._circumference);
      this._elements.start.style.opacity = frac <= 0.001 ? "0" : "1";
      this._elements.endG.style.opacity = frac <= 0.001 ? "0" : "1";
      this._elements.endG.style.transform = `rotate(${frac * 360}deg)`;
      this._elements.endC.style.fill = this._colorAtStops(this._currentStops, frac);
    }
  }

  /* --- HYBRID EDITOR --- */
  class DonutCardEditor extends HTMLElement {
    setConfig(config) { this._config = config; if (this._f) this._f.data = config; }
    set hass(h) { this._hass = h; if (!this._f) this._build(); this._f.hass = h; }
    
    _build() {
      if (!this.shadowRoot) this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = ''; 

      const wrapper = document.createElement("div");
      wrapper.style.display = "flex";
      wrapper.style.flexDirection = "column";
      wrapper.style.gap = "24px";

      const c = this._config || {};

      const f = document.createElement("ha-form");
      f.schema = [
        { name: "top_label_text", label: "Titel (schaalt automatisch)", selector: { text: {} } },
        { name: "max_value", label: "Max Waarde", selector: { number: { mode: "box" } } },
        { name: "entity_primary", label: "Hoofd Entiteit", selector: { entity: {} } },
        { type: "grid", name: "", schema: [{ name: "unit_primary", label: "Eenheid (W, kWh...)", selector: { text: {} } }, { name: "decimals_primary", label: "Decimalen", selector: { number: { mode: "box" } } }] },
        { name: "entity_secondary", label: "Sub Entiteit (Optioneel)", selector: { entity: {} } },
        { type: "grid", name: "", schema: [{ name: "unit_secondary", label: "Eenheid (W, kWh...)", selector: { text: {} } }, { name: "decimals_secondary", label: "Decimalen", selector: { number: { mode: "box" } } }] }
      ];
      f.computeLabel = s => s.label;
      f.data = c;
      f.addEventListener("value-changed", ev => {
        this._config = { ...this._config, ...ev.detail.value };
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
      });

      // FIX: Compleet nieuwe, strakke styling voor de Colorpicker met ronde swatches
      const cp = document.createElement("div");
      cp.innerHTML = `
        <style>
          .cp-panel { background: var(--secondary-background-color, rgba(120,120,120,0.05)); padding: 16px; border-radius: 12px; border: 1px solid var(--divider-color, rgba(200,200,200,0.2)); }
          .cp-title { font-weight: 500; margin-bottom: 16px; display: flex; align-items: center; font-size: 16px; color: var(--primary-text-color); }
          .cp-row { display: flex; align-items: center; gap: 16px; margin-bottom: 12px; }
          .cp-color { width: 32px; height: 32px; border: 1px solid var(--divider-color, rgba(150,150,150,0.4)); border-radius: 50%; cursor: pointer; padding: 0; background: none; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .cp-color::-webkit-color-swatch-wrapper { padding: 0; }
          .cp-color::-webkit-color-swatch { border: none; border-radius: 50%; }
          .cp-color::-moz-color-swatch { border: none; border-radius: 50%; }
          .cp-slider { flex-grow: 1; accent-color: var(--primary-color, #03a9f4); cursor: pointer; }
          .cp-label { font-size: 13px; width: 36px; text-align: right; color: var(--primary-text-color); font-family: var(--paper-font-body1_-_font-family, sans-serif); }
        </style>
        <div class="cp-panel">
          <div class="cp-title">🌈 Kleuren Verloop</div>
          <div class="cp-row" style="margin-bottom: 20px;">
            <input type="color" class="cp-color" data-key="start_color" value="${c.start_color || '#0000ff'}">
            <span class="cp-label" style="width: auto;">Start (0%)</span>
          </div>
          ${[2,3,4,5].map(i => `
            <div class="cp-row">
              <input type="range" class="cp-slider" data-key="stop_${i}" min="1" max="99" value="${Math.round((c['stop_'+i]||0)*100)}">
              <input type="color" class="cp-color" data-key="color_${i}" value="${c['color_'+i] || '#ffffff'}">
              <span id="perc_${i}" class="cp-label">${Math.round((c['stop_'+i]||0)*100)}%</span>
            </div>
          `).join('')}
        </div>
      `;

      cp.querySelectorAll('input[type="color"]').forEach(el => {
        el.addEventListener('input', e => {
          this._config = { ...this._config, [e.target.dataset.key]: e.target.value };
          this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
        });
      });
      cp.querySelectorAll('input[type="range"]').forEach(el => {
        el.addEventListener('input', e => {
          const val = parseInt(e.target.value, 10);
          cp.querySelector(`#perc_${e.target.dataset.key.split('_')[1]}`).textContent = val + '%';
          this._config = { ...this._config, [e.target.dataset.key]: val / 100 };
          this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
        });
      });

      wrapper.appendChild(f);
      wrapper.appendChild(cp);
      this.shadowRoot.appendChild(wrapper);
      this._f = f;
    }
  }

  customElements.define("donut-card-editor", DonutCardEditor);
  customElements.define(TAG, DonutCard);

  window.customCards = window.customCards || [];
  if (!window.customCards.some(c => c.type === "donut-card")) {
    window.customCards.push({ 
      type: "donut-card", 
      name: "Donut Card", 
      description: "Algemene donut kaart met sliders en custom tekst", 
      preview: true 
    });
  }
})();
