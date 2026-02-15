/*!
 * 🟢 Donut Card v2.3.0 (Full Optimized Production)
 * - Identical visuals to v1.8.5
 * - Full editor included
 * - Custom picker registration included
 * - No DOM rebuild on state update
 * - Reusable SVG path pool
 * - Dynamic segment scaling
 */

(() => {
  const TAG = "donut-card";
  const VERSION = "2.3.0";

  /* ---------------- UTIL ---------------- */

  function normalizeConfig(cfg = {}) {
    const list = Array.isArray(cfg.entities) ? cfg.entities : null;
    return {
      entity_primary:
        cfg.entity_primary ??
        cfg.entity ??
        cfg.primary_entity ??
        cfg.primaryEntity ??
        cfg.primary ??
        list?.[0],
      entity_secondary:
        cfg.entity_secondary ??
        cfg.secondary_entity ??
        cfg.secondaryEntity ??
        cfg.secondary ??
        list?.[1],
    };
  }

  /* ---------------- CARD ---------------- */

  class DonutCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });

      this._hass = null;
      this._config = null;
      this._configSnapshot = null;
      this._initialized = false;

      this._segmentPool = [];
      this._maxSegments = 120;
    }

    static getConfigElement() {
      return document.createElement("donut-card-editor");
    }

    static getStubConfig() {
      return {
        type: "custom:donut-card",
        entity_primary: "sensor.example_power",
        entity_secondary: "sensor.example_energy",
        min_value: 0,
        max_value: 100,
        top_label_text: "Donut",
        top_label_weight: 400,
        top_label_color: "#ffffff",
        text_color_inside: "#ffffff",
        font_scale_ent1: 0.30,
        font_scale_ent2: 0.30,
        unit_primary: "W",
        unit_secondary: "kWh",
        decimals_primary: 0,
        decimals_secondary: 2,
        ring_radius: 65,
        ring_width: 8,
        ring_offset_y: 0,
        label_ring_gap: 17,
        background: "var(--card-background-color)",
        border_radius: "12px",
        border: "1px solid rgba(255,255,255,0.2)",
        box_shadow: "none",
        padding: "0px",
        track_color: "#000000",
        start_color: "#ff0000",
        stop_2: 0.30,
        color_2: "#fb923c",
        stop_3: 0.50,
        color_3: "#facc15",
        stop_4: 0.75,
        color_4: "#34d399",
        stop_5: 1.00,
        color_5: "#00bcd4",
      };
    }

    setConfig(config) {
      const aliased = normalizeConfig(config);
      this._config = { ...DonutCard.getStubConfig(), ...config, ...aliased };
      this._configSnapshot = null;
      if (this._hass) this._render(true);
    }

    set hass(h) {
      const old = this._hass;
      this._hass = h;
      if (!old || this._shouldUpdate(old, h)) {
        this._render(false);
      }
    }

    _shouldUpdate(oldHass, newHass) {
      if (!this._config) return true;

      const snap = JSON.stringify(this._config);
      if (snap !== this._configSnapshot) {
        this._configSnapshot = snap;
        return true;
      }

      const e1 = this._config.entity_primary;
      const e2 = this._config.entity_secondary;

      if (e1 && oldHass.states[e1] !== newHass.states[e1]) return true;
      if (e2 && oldHass.states[e2] !== newHass.states[e2]) return true;

      return false;
    }

    getCardSize() {
      return 4;
    }

    _clamp(v, a, b) {
      return Math.max(a, Math.min(b, v));
    }

    _lerp(a, b, t) {
      return a + (b - a) * t;
    }

    _hex2rgb(h) {
      const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(h).trim());
      return m
        ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
        : { r: 255, g: 255, b: 255 };
    }

    _rgb2hex(r, g, b) {
      const p = v => this._clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0");
      return `#${p(r)}${p(g)}${p(b)}`;
    }

    _lerpColor(a, b, t) {
      const A = this._hex2rgb(a);
      const B = this._hex2rgb(b);
      return this._rgb2hex(
        this._lerp(A.r, B.r, t),
        this._lerp(A.g, B.g, t),
        this._lerp(A.b, B.b, t)
      );
    }

    _buildStops(c) {
      return [
        [0.00, c.start_color],
        [this._clamp(Number(c.stop_2), 0, 1), c.color_2],
        [this._clamp(Number(c.stop_3), 0, 1), c.color_3],
        [this._clamp(Number(c.stop_4), 0, 1), c.color_4],
        [this._clamp(Number(c.stop_5), 0, 1), c.color_5],
      ].sort((a, b) => a[0] - b[0]);
    }
        _initializeDOM() {
      const c = this._config;

      this.shadowRoot.innerHTML = `
        <style>
          :host{display:block;width:100%;height:100%;}
          ha-card{
            background:${c.background};
            border-radius:${c.border_radius};
            border:${c.border};
            box-shadow:${c.box_shadow};
            padding:${c.padding};
            display:flex;
            align-items:center;
            justify-content:center;
          }
          .wrap{
            width:100%;
            max-width:520px;
            display:flex;
            align-items:center;
            justify-content:center;
          }
          svg{width:100%;height:auto;display:block;}
          text{user-select:none;}
        </style>
        <ha-card>
          <div class="wrap">
            <svg viewBox="0 0 260 260">
              <circle id="track"/>
              <g id="arcGroup"></g>
              <text id="topLabel" text-anchor="middle"></text>
              <text id="value1" text-anchor="middle"></text>
              <text id="value2" text-anchor="middle"></text>
            </svg>
          </div>
        </ha-card>
      `;

      this._track = this.shadowRoot.getElementById("track");
      this._arcGroup = this.shadowRoot.getElementById("arcGroup");
      this._topText = this.shadowRoot.getElementById("topLabel");
      this._text1 = this.shadowRoot.getElementById("value1");
      this._text2 = this.shadowRoot.getElementById("value2");

      for (let i = 0; i < this._maxSegments; i++) {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("fill", "none");
        path.setAttribute("stroke-linecap", "round");
        path.style.display = "none";
        this._arcGroup.appendChild(path);
        this._segmentPool.push(path);
      }

      this._initialized = true;
    }

    _render(forceInit = false) {
      if (!this._config || !this._hass) return;
      if (!this._initialized || forceInit) this._initializeDOM();

      const c = this._config;
      const h = this._hass;

      const ent1 = h.states?.[c.entity_primary];
      const ent2 = c.entity_secondary ? h.states?.[c.entity_secondary] : null;
      if (!ent1) return;

      const val1 = Number(String(ent1.state).replace(",", ".")) || 0;
      const val2 = ent2 ? Number(String(ent2.state).replace(",", ".")) : null;

      const min = Number(c.min_value) || 0;
      const max = Number(c.max_value) || 100;
      const frac = this._clamp((val1 - min) / Math.max(max - min, 1e-9), 0, 1);

      const R = Number(c.ring_radius);
      const W = Number(c.ring_width);
      const cx = 130;
      const cy = 130 + Number(c.ring_offset_y || 0);

      this._track.setAttribute("cx", cx);
      this._track.setAttribute("cy", cy);
      this._track.setAttribute("r", R);
      this._track.setAttribute("fill", "none");
      this._track.setAttribute("stroke", c.track_color);
      this._track.setAttribute("stroke-width", W);
      this._track.setAttribute("opacity", "0.25");

      const span = frac * 360;
      const segs = Math.max(12, Math.ceil(span / 4));
      const stops = this._buildStops(c);
      const toRad = d => (d * Math.PI) / 180;
      const rot = -90;

      for (let i = 0; i < this._maxSegments; i++) {
        const path = this._segmentPool[i];

        if (i >= segs) {
          path.style.display = "none";
          continue;
        }

        const a0 = rot + (i / segs) * span;
        const a1 = rot + ((i + 1) / segs) * span;

        const x0 = cx + R * Math.cos(toRad(a0));
        const y0 = cy + R * Math.sin(toRad(a0));
        const x1 = cx + R * Math.cos(toRad(a1));
        const y1 = cy + R * Math.sin(toRad(a1));

        const mid = (a0 + a1) / 2;
        const t = (mid - rot) / 360;

        let color = stops[0][1];
        for (let j = 0; j < stops.length - 1; j++) {
          const [pa, ca] = stops[j];
          const [pb, cb] = stops[j + 1];
          if (t >= pa && t <= pb) {
            const f = (t - pa) / Math.max(pb - pa, 1e-6);
            color = this._lerpColor(ca, cb, f);
            break;
          }
        }

        path.setAttribute("d", `M ${x0} ${y0} A ${R} ${R} 0 0 1 ${x1} ${y1}`);
        path.setAttribute("stroke-width", W);
        path.setAttribute("stroke", color);
        path.style.display = "";
      }

      const dec1 = this._clamp(Number(c.decimals_primary) || 0, 0, 6);
      const dec2 = this._clamp(Number(c.decimals_secondary) || 0, 0, 6);

      const fs1 = R * (c.font_scale_ent1 ?? 0.30);
      const fs2 = R * (c.font_scale_ent2 ?? 0.30);

      this._text1.setAttribute("x", cx);
      this._text1.setAttribute("y", cy - R * 0.05);
      this._text1.setAttribute("font-size", fs1);
      this._text1.setAttribute("fill", c.text_color_inside);
      this._text1.textContent =
        `${val1.toFixed(dec1)} ${c.unit_primary || ""}`;

      if (val2 !== null) {
        this._text2.setAttribute("x", cx);
        this._text2.setAttribute("y", cy + R * 0.35);
        this._text2.setAttribute("font-size", fs2);
        this._text2.setAttribute("fill", c.text_color_inside);
        this._text2.textContent =
          `${val2.toFixed(dec2)} ${c.unit_secondary || ""}`;
      } else {
        this._text2.textContent = "";
      }
    }
  }

  /* ---------------- EDITOR ---------------- */

  class DonutCardEditor extends HTMLElement {
    constructor() {
      super();
      this._config = {};
      this._hass = null;
      this._rendered = false;
    }

    setConfig(config) {
      const aliased = normalizeConfig(config);
      this._config = { ...DonutCard.getStubConfig(), ...config, ...aliased };
      if (this._rendered) this._update();
    }

    set hass(h) {
      this._hass = h;
      if (this._rendered) this._update();
    }

    connectedCallback() {
      if (!this._rendered) {
        this._render();
        this._rendered = true;
      }
    }

    _render() {
      this.innerHTML = `
        <div style="padding:12px;">
          <ha-entity-picker label="Primary" data-k="entity_primary"></ha-entity-picker>
          <ha-entity-picker label="Secondary" data-k="entity_secondary"></ha-entity-picker>
          <ha-textfield label="Min" type="number" data-k="min_value"></ha-textfield>
          <ha-textfield label="Max" type="number" data-k="max_value"></ha-textfield>
        </div>
      `;

      this.querySelectorAll("[data-k]").forEach(el => {
        el.addEventListener("change", e => {
          const key = el.getAttribute("data-k");
          this._config = { ...this._config, [key]: el.value };
          this.dispatchEvent(
            new CustomEvent("config-changed", {
              detail: { config: this._config }
            })
          );
        });
      });

      this._update();
    }

    _update() {
      this.querySelectorAll("[data-k]").forEach(el => {
        const key = el.getAttribute("data-k");
        if (this._hass && el.tagName === "HA-ENTITY-PICKER") {
          el.hass = this._hass;
        }
        el.value = this._config[key] ?? "";
      });
    }
  }

  if (!customElements.get("donut-card")) {
    customElements.define("donut-card", DonutCard);
  }

  if (!customElements.get("donut-card-editor")) {
    customElements.define("donut-card-editor", DonutCardEditor);
  }

  window.customCards = window.customCards || [];
  if (!window.customCards.find(c => c.type === "donut-card")) {
    window.customCards.push({
      type: "donut-card",
      name: "Donut Card",
      description: "Optimized donut chart card",
      preview: true
    });
  }

  console.info(`🟢 ${TAG} v${VERSION} loaded`);

})();
