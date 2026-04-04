/*!
 * 🟢 Donut Card v4.1.0 (Flawless Ring & Clean UI)
 * Optimized SVG rendering, smooth CSS animations, and a beautifully organized UI editor.
 */

(() => {
  const TAG = "donut-card";
  const VERSION = "4.1.0";

  function normalizeConfig(cfg = {}) {
    const list = Array.isArray(cfg.entities) ? cfg.entities : null;
    return {
      entity_primary: cfg.entity_primary ?? cfg.entity ?? cfg.primary_entity ?? cfg.primaryEntity ?? cfg.primary ?? (list?.[0]),
      entity_secondary: cfg.entity_secondary ?? cfg.secondary_entity ?? cfg.secondaryEntity ?? cfg.secondary ?? (list?.[1]),
    };
  }

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
        top_label_text: "Donut",
        max_value: 100,
        entity_primary: "",
        unit_primary: "W",
        decimals_primary: 0,
        entity_secondary: "",
        unit_secondary: "kWh",
        decimals_secondary: 2,
        start_color: "#ff0000",
        stop_2: 0.30, color_2: "#fb923c",
        stop_3: 0.50, color_3: "#facc15",
        stop_4: 0.75, color_4: "#34d399",
        stop_5: 1.00, color_5: "#00bcd4",
      };
    }

    setConfig(config) {
      const aliased = normalizeConfig(config);
      this._config = { ...DonutCard.getStubConfig(), ...config, ...aliased };
      this._buildDOM();
      if (this._hass) this._updateValues();
    }

    set hass(h) {
      if (!this._config) { this._hass = h; return; }
      const ent1Changed = this._hasStateChanged(this._hass, h, this._config.entity_primary);
      const ent2Changed = this._config.entity_secondary && this._hasStateChanged(this._hass, h, this._config.entity_secondary);
      this._hass = h;
      if (ent1Changed || ent2Changed) this._updateValues();
    }

    _hasStateChanged(oldHass, newHass, entityId) {
      if (!entityId) return false;
      return oldHass?.states[entityId]?.state !== newHass?.states[entityId]?.state;
    }

    getCardSize() { return 4; }
    getGridOptions() { return { columns: 4, rows: 4, min_columns: 2, min_rows: 2 }; }

    _clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    _lerp(a, b, t) { return a + (b - a) * t; }
    _hex2rgb(h) {
      const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(h).trim());
      return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 255, g: 255, b: 255 };
    }
    _rgb2hex(r, g, b) {
      const p = (v) => this._clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0");
      return `#${p(r)}${p(g)}${p(b)}`;
    }
    _lerpColor(a, b, t) {
      const A = this._hex2rgb(a), B = this._hex2rgb(b);
      return this._rgb2hex(this._lerp(A.r, B.r, t), this._lerp(A.g, B.g, t), this._lerp(A.b, B.b, t));
    }
    _colorAtStops(stops, t) {
      t = this._clamp(t, 0, 1);
      for (let i = 0; i < stops.length - 1; i++) {
        const [pa, ca] = stops[i], [pb, cb] = stops[i + 1];
        if (t >= pa && t <= pb) {
          const f = (t - pa) / Math.max(pb - pa, 1e-6);
          return this._lerpColor(ca, cb, f);
        }
      }
      return stops[stops.length - 1][1];
    }
    _sanitizeColor(color) {
      if (typeof color === "string" && /^#[0-9A-F]{6}$/i.test(color.trim())) return color.trim();
      if (typeof color === "string" && /^#[0-9A-F]{3}$/i.test(color.trim())) return "#" + color.substr(1).split("").map((s) => s + s).join("");
      return "#ff0000";
    }
    _buildStops(c) {
      return [
        [0.00, this._sanitizeColor(c.start_color)],
        [this._clamp(Number(c.stop_2 || 0), 0, 1), this._sanitizeColor(c.color_2)],
        [this._clamp(Number(c.stop_3 || 0), 0, 1), this._sanitizeColor(c.color_3)],
        [this._clamp(Number(c.stop_4 || 0), 0, 1), this._sanitizeColor(c.color_4)],
        [this._clamp(Number(c.stop_5 || 1), 0, 1), this._sanitizeColor(c.color_5)]
      ].sort((a, b) => a[0] - b[0]);
    }

    _buildDOM() {
      const c = this._config;
      
      // Hardcoded Visuals
      const R = 80;
      const W = 7;
      const cx = 130, cy = 130;
      const circumference = 2 * Math.PI * R;
      this._circumference = circumference;
      this._stops = this._buildStops(c);

      const segs = 140;
      const rot = -90;
      let gradientPaths = "";

      const arcSeg = (a0, a1, sw, color) => {
        const toRad = (d) => (d * Math.PI) / 180;
        const x0 = cx + R * Math.cos(toRad(a0)), y0 = cy + R * Math.sin(toRad(a0));
        const x1 = cx + R * Math.cos(toRad(a1)), y1 = cy + R * Math.sin(toRad(a1));
        return `<path d="M ${x0} ${y0} A ${R} ${R} 0 0 1 ${x1} ${y1}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="butt" />`;
      };

      for (let i = segs - 1; i >= 0; i--) {
        const a0 = rot + (i / segs) * 360;
        const a1 = rot + ((i + 1.2) / segs) * 360;
        gradientPaths += arcSeg(a0, a1, W, this._colorAtStops(this._stops, i / segs));
      }

      // Hardcoded Fonts & Positions
      const fs_top = R * 0.42;
      const y_top = (cy - R) - 15;
      const fs1 = R * 0.30;
      const fs2 = R * 0.30;
      const y1 = cy - R * 0.05, y2 = cy + R * 0.35;

      this.shadowRoot.innerHTML = `
        <style>
          :host { display: block; width: 100%; height: 100%; }
          ha-card { 
            background: var(--card-background-color); border-radius: 12px; 
            border: 1px solid rgba(255,255,255,0.2); box-sizing: border-box; padding: 12px;
            display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; overflow: hidden;
          }
          .wrap { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; position: relative; }
          svg { width: 100%; height: 100%; max-height: 100%; max-width: 100%; aspect-ratio: 1 / 1; display: block; object-fit: contain; }
          text { user-select: none; font-family: Inter, system-ui, sans-serif; fill: #ffffff; }
          .warning { color: #facc15; font-size: 14px; text-align: center; }
          #mask-circle { transition: stroke-dashoffset 0.5s ease-out; }
        </style>
        <ha-card>
          ${!c.entity_primary ? `<div class="warning">Selecteer een Primaire Entiteit in de editor.</div>` : `
          <div class="wrap">
            <svg viewBox="0 0 260 260">
              <defs>
                <mask id="donut-mask-${cx}">
                  <circle id="mask-circle" cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="white" stroke-width="${W}" 
                    stroke-linecap="butt" stroke-dasharray="${circumference} ${circumference + 1}" stroke-dashoffset="${circumference}" 
                    transform="rotate(-90 ${cx} ${cy})" />
                </mask>
              </defs>
              <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#000000" stroke-width="${W}" />
              <g mask="url(#donut-mask-${cx})">${gradientPaths}</g>
              
              <circle id="start-cap" cx="${cx}" cy="${cy - R}" r="${W / 2}" fill="${this._stops[0][1]}" stroke="none" />
              <g id="end-cap-group" style="transform-origin: ${cx}px ${cy}px; transition: transform 0.5s ease-out;">
                <circle id="end-cap" cx="${cx}" cy="${cy - R}" r="${W / 2}" fill="${this._stops[0][1]}" stroke="none" style="transition: fill 0.5s ease-out;" />
              </g>

              ${(c.top_label_text || "").trim() !== "" ? `<text x="${cx}" y="${y_top}" font-size="${fs_top}" font-weight="300" text-anchor="middle" dominant-baseline="middle">${c.top_label_text}</text>` : ""}
              <text id="val1-text" x="${cx}" y="${y1}" text-anchor="middle" font-size="${fs1}" font-weight="400">--</text>
              <text id="val2-text" x="${cx}" y="${y2}" text-anchor="middle" font-size="${fs2}" font-weight="300"></text>
            </svg>
          </div>`}
        </ha-card>
      `;

      if (c.entity_primary) {
        this._elements = {
          maskCircle: this.shadowRoot.getElementById("mask-circle"),
          startCap: this.shadowRoot.getElementById("start-cap"),
          endCapGroup: this.shadowRoot.getElementById("end-cap-group"),
          endCap: this.shadowRoot.getElementById("end-cap"),
          val1Text: this.shadowRoot.getElementById("val1-text"),
          val2Text: this.shadowRoot.getElementById("val2-text")
        };
      }
    }

    _updateValues() {
      const h = this._hass; const c = this._config; if (!h || !c.entity_primary || !this._elements.maskCircle) return;
      
      const ent1 = h.states[c.entity_primary];
      if (!ent1) return; 

      const val1 = Number(String(ent1.state).replace(",", ".")) || 0;
      const max = Number(c.max_value ?? 100);
      const frac = this._clamp(val1 / Math.max(max, 1e-9), 0, 1); // Min is altijd 0

      this._elements.val1Text.textContent = `${val1.toFixed(c.decimals_primary)} ${c.unit_primary || ""}`;

      if (c.entity_secondary && h.states[c.entity_secondary]) {
        const val2 = Number(String(h.states[c.entity_secondary].state).replace(",", ".")) || 0;
        this._elements.val2Text.textContent = `${val2.toFixed(c.decimals_secondary)} ${c.unit_secondary || ""}`;
      } else {
        this._elements.val2Text.textContent = "";
      }

      this._elements.maskCircle.style.strokeDashoffset = this._circumference - (frac * this._circumference);

      if (frac <= 0.001) {
        this._elements.startCap.style.opacity = "0";
        this._elements.endCapGroup.style.opacity = "0";
      } else {
        this._elements.startCap.style.opacity = "1";
        this._elements.endCapGroup.style.opacity = "1";
        const angle = frac * 360;
        const endColor = this._colorAtStops(this._stops, frac);
        this._elements.endCapGroup.style.transform = `rotate(${angle}deg)`;
        this._elements.endCap.style.fill = endColor;
      }
    }
  }

  /* -------- THE CLEAN UI EDITOR -------- */
  class DonutCardEditor extends HTMLElement {
    constructor() { super(); this._config = {}; this._rendered = false; this._hass = undefined; this._pickerInitAttempts = 0; }
    set hass(h) { this._hass = h; if (this._rendered) setTimeout(() => this._initializeEntityPickers(true), 0); }
    setConfig(config) { const aliased = normalizeConfig(config); this._config = { ...DonutCard.getStubConfig(), ...config, ...aliased }; if (this._rendered) this._updateFields(); }
    
    connectedCallback() {
      if (!this._rendered) {
        this._render(); this._rendered = true;
        setTimeout(() => { this._initializeEntityPickers(true); this._initEventHandlers(); this._updateFields(); }, 0);
      }
    }
    
    _sanitizeColor(color) {
      if (typeof color === "string" && /^#[0-9A-F]{6}$/i.test(color.trim())) return color.trim();
      if (typeof color === "string" && /^#[0-9A-F]{3}$/i.test(color.trim())) return "#" + color.substr(1).split("").map((s) => s + s).join("");
      return "#ff0000";
    }

    _render() {
      const c = this._config;

      const startColorRow = `
        <div class="segrow">
          <div class="color-wrap">
            <input type="color" value="${this._sanitizeColor(c.start_color)}" data-k="start_color">
            <span class="lbl">Start (0%)</span>
          </div>
        </div>
      `;

      const stopRest = [2, 3, 4, 5].map((i) => {
        const stopKey = "stop_" + i; const colorKey = "color_" + i; const pct = Math.round((c[stopKey] || 0) * 100);
        return `
          <div class="segrow">
            <ha-slider min="0" max="100" step="1" value="${pct}" data-k="${stopKey}"></ha-slider>
            <div class="color-wrap">
              <input type="color" value="${this._sanitizeColor(c[colorKey])}" data-k="${colorKey}">
              <span class="lbl">${pct}%</span>
            </div>
          </div>
        `;
      }).join("");

      this.innerHTML = `
        <style>
          .section { background: rgba(0,0,0,0.03); border-radius: 8px; padding: 12px; margin-bottom: 16px; border: 1px solid rgba(128,128,128,0.1); }
          .section-title { font-weight: bold; font-size: 14px; margin-bottom: 12px; opacity: 0.8; }
          ha-textfield, ha-entity-picker { width: 100%; margin-bottom: 12px; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .segrow { display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center; margin-bottom: 10px; }
          .color-wrap { display: flex; align-items: center; gap: 8px; }
          input[type="color"] { width: 36px; height: 32px; border: none; padding: 0; cursor: pointer; border-radius: 4px; }
          .lbl { font-size: 13px; min-width: 65px; font-weight: 500; }
        </style>
        <div class="editor">
          
          <div class="section">
            <div class="section-title">📊 Basis Instellingen</div>
            <ha-textfield label="Titel (boven de ring)" value="${c.top_label_text}" data-k="top_label_text"></ha-textfield>
            <ha-textfield label="Max Waarde (bijv. 100 voor %, 5000 voor W)" value="${c.max_value}" type="number" data-k="max_value"></ha-textfield>
          </div>

          <div class="section">
            <div class="section-title">⚡ Primaire Entiteit (Midden)</div>
            <ha-entity-picker label="Selecteer Entiteit" data-k="entity_primary" allow-custom-entity></ha-entity-picker>
            <div class="grid-2">
              <ha-textfield label="Eenheid (W, %...)" value="${c.unit_primary}" data-k="unit_primary"></ha-textfield>
              <ha-textfield label="Decimalen" value="${c.decimals_primary}" type="number" data-k="decimals_primary"></ha-textfield>
            </div>
          </div>

          <div class="section">
            <div class="section-title">📉 Secundaire Entiteit (Onder)</div>
            <ha-entity-picker label="Selecteer Entiteit (Optioneel)" data-k="entity_secondary" allow-custom-entity></ha-entity-picker>
            <div class="grid-2">
              <ha-textfield label="Eenheid (kWh...)" value="${c.unit_secondary}" data-k="unit_secondary"></ha-textfield>
              <ha-textfield label="Decimalen" value="${c.decimals_secondary}" type="number" data-k="decimals_secondary"></ha-textfield>
            </div>
          </div>

          <div class="section">
            <div class="section-title">🌈 Kleuren Verloop</div>
            ${startColorRow}
            ${stopRest}
          </div>

        </div>
      `;
    }

    _initializeEntityPickers() {
      const c = this._config; const focused = document.activeElement;
      const tryInit = () => {
        this._pickerInitAttempts = (this._pickerInitAttempts || 0) + 1;
        ["entity_primary", "entity_secondary"].forEach(k => {
          const p = this.querySelector(`[data-k="${k}"]`);
          if (p) { try { if (this._hass) p.hass = this._hass; if (c[k] && !p.value) p.value = c[k]; } catch (e) {} }
        });
        const pickers = Array.from(this.querySelectorAll("ha-entity-picker"));
        if (pickers.some(p => !p || !p.hass || p.value === "") && this._pickerInitAttempts < 8) setTimeout(tryInit, 250);
      };
      tryInit();
      this._updateFields();
    }

    _updateFields() {
      const c = this._config; const focused = document.activeElement;
      ["entity_primary", "entity_secondary"].forEach(key => {
        const el = this.querySelector(`[data-k="${key}"]`);
        if (el && el !== focused && !el.contains(focused)) { try { if (this._hass) el.hass = this._hass; } catch (e) {} if (c[key]) el.value = c[key]; }
      });
      const startEl = this.querySelector('[data-k="start_color"]');
      if (startEl && startEl !== focused) startEl.value = this._sanitizeColor(c.start_color);
      ["color_2", "color_3", "color_4", "color_5"].forEach(colorKey => {
        const el = this.querySelector(`[data-k="${colorKey}"]`); if (el && el !== focused) el.value = this._sanitizeColor(c[colorKey]);
      });
      [2, 3, 4, 5].forEach(i => {
        const stopKey = "stop_" + i; const el = this.querySelector(`[data-k="${stopKey}"]`);
        if (el && el !== focused) { const pct = Math.round((c[stopKey] || 0) * 100); el.value = pct; const span = el.parentElement?.querySelector(".lbl"); if (span) span.textContent = `${pct}%`; }
      });
      ["max_value", "unit_primary", "unit_secondary", "decimals_primary", "decimals_secondary", "top_label_text"].forEach(key => {
        const el = this.querySelector(`[data-k="${key}"]`); if (el && el !== focused) el.value = c[key] === undefined ? "" : c[key];
      });
    }

    _initEventHandlers() {
      this.querySelectorAll("[data-k]").forEach(el => {
        if (el._handlerSet) return; el._handlerSet = true;
        const handler = (ev) => this._processChange(el, ev);
        el.addEventListener("input", handler); el.addEventListener("change", handler); el.addEventListener("value-changed", handler);
      });
    }

    _processChange(el, ev) {
      const key = el.getAttribute("data-k");
      let val = (ev && ev.detail && ev.detail.value !== undefined) ? ev.detail.value : el.value;
      if (el.tagName === "HA-SLIDER" || (el.type === "number" && key.startsWith("stop_"))) val = Number(val) / 100;
      if (key === "start_color" || key.startsWith("color_")) { val = this._sanitizeColor(val); el.value = val; }
      this._config = { ...this._config, [key]: val }; this._updateFields();
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config } }));
    }
  }

  try {
    if (!customElements.get("donut-card-editor")) customElements.define("donut-card-editor", DonutCardEditor);
    if (!customElements.get("donut-card")) customElements.define("donut-card", DonutCard);
  } catch (e) { }

  // --- ROBUST CARD PICKER REGISTRATION ---
  (function registerDonutCardPicker() {
    const cardInfo = {
      type: "donut-card",
      name: "Generic Donut Card",
      description: "A generic donut chart card with smooth animations and dual entities",
      preview: true
    };
    function ensureRegistered() {
      try {
        window.customCards = Array.isArray(window.customCards) ? window.customCards.filter(Boolean) : [];
        if (!window.customCards.some(c => c.type === cardInfo.type)) window.customCards.push(cardInfo);
      } catch (e) {}
    }
    ensureRegistered();
    ["DOMContentLoaded", "load"].forEach(ev => window.addEventListener(ev, ensureRegistered, { once: true }));
    [100, 500, 1000, 3000, 6000].forEach(ms => setTimeout(ensureRegistered, ms));
    const periodic = setInterval(ensureRegistered, 30000);
    setTimeout(() => clearInterval(periodic), 10 * 60 * 1000);
    window.addEventListener("ll-rebuild", ensureRegistered);
    window.addEventListener("config-changed", ensureRegistered);
    if (typeof customElements !== "undefined" && customElements.whenDefined) {
      customElements.whenDefined("donut-card").then(ensureRegistered).catch(() => {});
    }
  })();
})();
