/*!
 * Battery Donut Card — Final5
 * Smooth multi-stop battery donut (SoC + kWh) + Wi-Fi bars + Power arrow
 * - Offsets (wifi/power) in % van ringradius (schalen mee op elk scherm)
 * - Pijl omhoog (groen) bij laden (negatief), omlaag (oranje) bij ontladen (positief)
 * - Tekst en pijl delen baseline
 * - Achtergrond volgt theme (var(--card-background-color))
 * - Pijl dunner (stroke 1.4 / 0.18), tekst naast pijl dunner (font-weight 300)
 * MIT License
 */

(() => {
  const TAG = "battery-donut-card";
  const VERSION = "1.0.60";

  class BatteryDonutCard extends HTMLElement {
    constructor() {
      super();
      if (!this.shadowRoot) this.attachShadow({ mode: "open" });
      this._hass = null;
      this._config = null;
      this._renderQueued = false;
    }

    static getStubConfig() {
      return {
        entity: "sensor.battery_soc",
        cap_kwh: 5.12,
        segments: 140,

        // Ring & layout
        ring_radius: 80,
        ring_width: 8,
        ring_offset_y: 0,
        label_ring_gap: 20, // afstand tussen ring en top label

        // Kleuren
        track_color: "#000000",
        color_red: "#ff0000",
        color_orange: "#fb923c",
        color_yellow: "#facc15",
        color_green: "#34d399",
        color_cyan: "#00bcd4",

        // Gradient stop-posities (0..1)
        stop_red_hold: 0.11,
        stop_orange: 0.25,
        stop_yellow: 0.45,
        stop_green: 0.70,

        // Tekst
        top_label_text: "Battery",
        top_label_weight: 300,
        top_label_color: "#ffffff",
        text_color_inside: "#ffffff",
        font_scale_kwh: 0.30,
        font_scale_soc: 0.30, // SoC altijd 0 decimalen

        // Wi-Fi (in % van ringradius)
        wifi_enabled: true,
        wifi_always_show: false,
        wifi_entity: "sensor.lilygo_rs485_wifi_signal_strength", // dBm (negatief)
        wifi_size_pct: 9,   // % van diameter
        wifi_offset_x: 0,   // % van R (positief = rechts)
        wifi_offset_y: 0,   // % van R (positief = beneden)

        // Power (pijl + W) — offsets ook in % van R
        power_enabled: true,
        power_always_show: false,
        power_entity: "sensor.inverter_active_power",
        power_size_pct: 16, // % van diameter
        power_offset_x: 0,  // % van R
        power_offset_y: 0,  // % van R

        // Kaartstijl
        background: "var(--card-background-color)",
        border_radius: "12px",
        border: "1px solid rgba(255,255,255,0.2)",
        box_shadow: "none",
        padding: "0px",
      };
    }

    static getConfigElement() {
      // mini stub zodat de picker weet "heeft editor"
      return document.createElement("battery-donut-card-editor");
    }

    setConfig(config) {
      if (!config || !config.entity) {
        throw new Error('Set an "entity" (0..100%) in the card config.');
      }
      // defaults + user
      this._config = Object.assign({}, BatteryDonutCard.getStubConfig(), config);

      // alias: name -> top_label_text als niet gezet
      if (this._config.name && !this._config.top_label_text) {
        this._config.top_label_text = this._config.name;
      }

      if (!this._logged) {
        this._logged = true;
        console.info(
          `%c ${TAG} %c ${VERSION}`,
          "background:#00bcd4;color:#000;padding:2px 6px;border-radius:3px 0 0 3px;font-weight:700",
          "background:#333;color:#fff;padding:2px 6px;border-radius:0 3px 3px 0"
        );
      }
      this._render();
    }

    set hass(hass) {
      this._hass = hass;
      this._render();
    }

    getCardSize() { return 3; }

    // ---------- helpers ----------
    _clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
    _toRad(d) { return (d * Math.PI) / 180; }
    _hex2rgb(h) {
      const m=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(h).trim());
      return m?{r:parseInt(m[1],16),g:parseInt(m[2],16),b:parseInt(m[3],16)}:{r:255,g:255,b:255};
    }
    _rgb2hex(r,g,b){ const p=v=>this._clamp(Math.round(v),0,255).toString(16).padStart(2,"0"); return `#${p(r)}${p(g)}${p(b)}`; }
    _lerp(a,b,t){ return a+(b-a)*t; }
    _lerpColor(a,b,t){ const A=this._hex2rgb(a),B=this._hex2rgb(b); return this._rgb2hex(this._lerp(A.r,B.r,t),this._lerp(A.g,B.g,t),this._lerp(A.b,B.b,t)); }
    _colorAtStops(stops,t){
      t=this._clamp(t,0,1);
      for(let i=0;i<stops.length-1;i++){
        const A=stops[i],B=stops[i+1];
        if(t>=A.pos && t<=B.pos){
          const f=(t-A.pos)/Math.max(B.pos-A.pos,1e-6);
          return this._lerpColor(A.col,B.col,f);
        }
      }
      return stops[stops.length-1].col;
    }

    // ---------- render ----------
    _render() {
      if (!this._config || !this._hass) return;
      if (!this.shadowRoot) this.attachShadow({ mode: "open" });
      if (this._renderQueued) return;
      this._renderQueued = true;

      Promise.resolve().then(() => {
        this._renderQueued = false;

        const c = this._config;
        const h = this._hass;

        // SoC ophalen
        let soc = 0;
        if (h && c.entity && h.states && h.states[c.entity]) {
          const raw = String(h.states[c.entity].state ?? "0");
          soc = this._clamp(
            parseFloat(raw.replace(",", ".").replace(/[^0-9.]/g, "")) || 0,
            0, 100
          );
        }
        const cap = Number(c.cap_kwh || 5.12);
        const kwh = (soc / 100) * cap;

        // Geometrie
        const R  = Number(c.ring_radius || 80);
        const W  = Number(c.ring_width  || 8);
        const cx = 130;
        const cy = 130 + Number(c.ring_offset_y || 0);
        const rot = -90;
        const segs = Math.max(12, Number(c.segments || 140));
        const span = (soc / 100) * 360;

        // Gradient stops
        const sRH=this._clamp(Number(c.stop_red_hold),0,1);
        const sO =this._clamp(Number(c.stop_orange ),0,1);
        const sY =this._clamp(Number(c.stop_yellow ),0,1);
        const sG =this._clamp(Number(c.stop_green  ),0,1);
        const stops=[
          {pos:0.0,col:c.color_red||"#ff0000"},
          {pos:Math.max(0,Math.min(sRH,1)),col:c.color_red||"#ff0000"},
          {pos:Math.max(sRH,Math.min(sO,1)),col:c.color_orange||"#fb923c"},
          {pos:Math.max(sO,Math.min(sY,1)),col:c.color_yellow||"#facc15"},
          {pos:Math.max(sY,Math.min(sG,1)),col:c.color_green||"#34d399"},
          {pos:1.0,col:c.color_cyan||"#00bcd4"},
        ];

        // Tekstgroottes
        const fs_kwh = R * (Number(c.font_scale_kwh) || 0.30);
        const fs_soc = R * (Number(c.font_scale_soc) || 0.30); // SoC: 0 decimalen
        const y_kwh = cy - R * 0.08;
        const y_soc = cy + R * 0.40;

        const arcSeg=(a0,a1,sw,color)=>{
          const x0=cx+R*Math.cos(this._toRad(a0)), y0=cy+R*Math.sin(this._toRad(a0));
          const x1=cx+R*Math.cos(this._toRad(a1)), y1=cy+R*Math.sin(this._toRad(a1));
          const large=(a1-a0)>180?1:0;
          return `<path d="M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1}"
                  fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>`;
        };

        // SVG start
        let svg = `
          <svg viewBox="0 0 260 260" xmlns="http://www.w3.org/2000/svg" aria-label="Battery donut">
            <!-- track -->
            <circle cx="${cx}" cy="${cy}" r="${R}" fill="none"
                    stroke="${c.track_color || "#000"}"
                    stroke-width="${W}" stroke-linecap="round"/>
        `;

        // actieve boog in segmenten
        const start=rot, end=rot+span;
        for(let i=0;i<segs;i++){
          const a0=start+(i/segs)*span, a1=start+((i+1)/segs)*span;
          if(a1> end) break;
          const mid=(a0+a1)/2, t_abs=(mid-rot)/360; // 0..1 over volledige cirkel
          svg += arcSeg(a0,a1,W,this._colorAtStops(stops,t_abs));
        }

        // Top label met instelbare gap
        if ((c.top_label_text ?? "").trim() !== "") {
          const fs_top = R * 0.35;
          const y_top = (cy - R) - (W*0.8) - fs_top*0.25 - Number(c.label_ring_gap || 0);
          svg += `
            <text x="${cx}" y="${y_top}" font-size="${fs_top}" font-weight="${c.top_label_weight || 300}"
                  fill="${c.top_label_color || "var(--primary-text-color)"}"
                  text-anchor="middle" dominant-baseline="middle">${c.top_label_text}</text>
          `;
        }

        // Binnenste teksten (kWh + %)
        const innerColor = c.text_color_inside || "var(--primary-text-color)";
        svg += `
          <g text-anchor="middle" font-family="Inter,system-ui,Segoe UI,Roboto,Arial">
            <text x="${cx}" y="${y_kwh}" font-size="${fs_kwh}" font-weight="300"
                  fill="${innerColor}">${kwh.toFixed(2)} kWh</text>
            <text x="${cx}" y="${y_soc}" font-size="${fs_soc}" font-weight="300"
                  fill="${innerColor}">${soc.toFixed(0)} %</text>
          </g>
        `;

        // ===================
        // Wi-Fi indicator (bars + unavailable-slash)
        // ===================
        (() => {
          if (!c.wifi_enabled) return;

          let raw = "", val = NaN;
          const we = c.wifi_entity;
          if (we && h && h.states && h.states[we]) {
            raw = String(h.states[we].state ?? "");
            val = Number(String(raw).replace(",", ".")); // dBm (negatief)
          }
          const connected = !(raw === "" || raw === "unavailable" || raw === "unknown" || Number.isNaN(val));
          if (!connected && !c.wifi_always_show) return;

          // bars op basis van dBm
          let bars = 0;
          if (connected) {
            if (val >= -50) bars = 4;
            else if (val >= -60) bars = 3;
            else if (val >= -70) bars = 2;
            else if (val >= -85) bars = 1;
            else bars = 0;
          }

          // positie: offsets in % van R
          const size = (Number(c.wifi_size_pct)||9) * (2*R) / 100;
          const px = (cx - R) + (Number(c.wifi_offset_x)||0) * (R/100) + R; // basis op ringcentrum
          const py = (cy + R) + (Number(c.wifi_offset_y)||0) * (R/100);

          const okCol   = "#22c55e";
          const downCol = "#ef4444";
          const color = connected ? okCol : downCol;

          const t = Math.max(1.6, size * 0.20);
          const r1 = size * 0.60;
          const r2 = size * 0.80;
          const r3 = size * 1.00;
          const r4 = size * 1.20;
          const dot = t*0.9;

          const arc = (r) => {
            const a0 = -135 * Math.PI/180, a1 = -45 * Math.PI/180;
            const x0 = px + r*Math.cos(a0), y0 = py + r*Math.sin(a0);
            const x1 = px + r*Math.cos(a1), y1 = py + r*Math.sin(a1);
            return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`;
          };

          svg += `<g stroke="${color}" fill="none" stroke-linecap="round" stroke-linejoin="round">`;
          if (connected) {
            if (bars >= 1) svg += `<path d="${arc(r1)}" stroke-width="${t}"/>`;
            if (bars >= 2) svg += `<path d="${arc(r2)}" stroke-width="${t}"/>`;
            if (bars >= 3) svg += `<path d="${arc(r3)}" stroke-width="${t}"/>`;
            if (bars >= 4) svg += `<path d="${arc(r4)}" stroke-width="${t}"/>`;
            svg += `<circle cx="${px}" cy="${py}" r="${dot}" fill="${color}" stroke="none"/>`;
          } else {
            svg += `
              <path d="${arc(r1)}" stroke-width="${t}"/>
              <path d="${arc(r2)}" stroke-width="${t}"/>
              <path d="${arc(r3)}" stroke-width="${t}"/>
              <path d="${arc(r4)}" stroke-width="${t}"/>
              <circle cx="${px}" cy="${py}" r="${dot}" fill="${color}" stroke="none"/>
              <path d="M ${px - r4*0.95} ${py - r4*0.95} L ${px + r4*0.95} ${py + r4*0.95}"
                    stroke="${color}" stroke-width="${t}"/>
            `;
          }
          svg += `</g>`;
        })();

        // ===================
        // Power-indicator (pijl + W)
        // ===================
        (() => {
          if (!c.power_enabled) return;

          let raw = "", val = NaN;
          const pe = c.power_entity;
          if (pe && h && h.states && h.states[pe]) {
            raw = String(h.states[pe].state ?? "");
            val = Number(String(raw).replace(",", "."));
          }
          const hasValue = !Number.isNaN(val);
          if (!hasValue && !c.power_always_show) return;

          const absW = hasValue ? Math.abs(val) : 0;

          // positie (offsets in % van R)
          const pSize = (Number(c.power_size_pct)||16) * (2*R) / 100;
          const px = (cx - R) + (Number(c.power_offset_x)||0) * (R/100) + R;
          const py = (cy + R) + (Number(c.power_offset_y)||0) * (R/100);

          // DUNNER: stroke 15% lichter + absolute minimum 1.4
          const stroke = Math.max(1.4, pSize * 0.18);

          const arrowUp   = "#22c55e"; // laden (negatief)
          const arrowDown = "#f59e0b"; // ontladen (positief)
          const isUp = hasValue ? (val < 0) : true;
          const arrowColor = isUp ? arrowUp : arrowDown;
          const rotationDeg = isUp ? 0 : 180; // 0 = omhoog, 180 = omlaag

          // Subtiele chevron (steel + hoedje), compacte pijl
          const half = pSize * 0.26;         // helft van pijllengte
          const head = half * 0.55;          // lengte van hoedje
          const halfW = stroke * 0.85;       // half breedte hoedje
          const ax = px;                     // anker x (gemeenschappelijke baseline)
          const ay = py;                     // anker y

          const yTop = ay - half;
          const yBot = ay + half;

          const yTip      = yTop;            // tip van pijl
          const yHeadHalf = yTop + head*0.55;
          const yHeadTop  = yTop + head;

          // Tekst naast pijl — DUNNER: font-weight 300 (voorzichtige finesse)
          const tSize = Math.max(10, pSize * 0.90);
          const textDX = pSize * 0.45;

          svg += `
            <g transform="rotate(${rotationDeg} ${ax} ${ay})"
              stroke="${arrowColor}" fill="none"
              stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">
              <!-- steel -->
              <line x1="${ax}" y1="${yBot}" x2="${ax}" y2="${yHeadTop}" />
              <!-- hoedje -->
              <path d="M ${ax - halfW} ${yHeadHalf} L ${ax} ${yTip} L ${ax + halfW} ${yHeadHalf}" />
            </g>
            <text x="${ax + textDX}" y="${ay}" font-size="${tSize}" font-weight="300"
                  fill="#ffffff" text-anchor="start" dominant-baseline="middle">
              ${absW.toFixed(0)} W
            </text>
          `;
        })();

        // sluit SVG
        svg += `</svg>`;

        // Styles & card
        const style = `
          <style>
            :host { display:block; width:100%; height:100%; }
            ha-card {
              background:${c.background};
              border-radius:${c.border_radius};
              box-shadow:${c.box_shadow};
              border:${c.border};
              padding:${c.padding};
              display:flex; align-items:center; justify-content:center;
              width:100%; height:100%;
            }
            .wrap {
              width:100%; height:100%; max-width:520px;
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
      });
    }
  }

  // mini editor stub
  class BatteryDonutCardEditor extends HTMLElement { setConfig(c){ this._config=c; } }
  if (!customElements.get("battery-donut-card-editor")) customElements.define("battery-donut-card-editor", BatteryDonutCardEditor);

  if (!customElements.get(TAG)) customElements.define(TAG, BatteryDonutCard);

  // Registratie voor kaartkiezer
  try {
    window.customCards = window.customCards || [];
    window.customCards = window.customCards.filter((c) => c.type !== TAG);
    window.customCards.push({
      type: TAG,
      name: "Battery Donut Card",
      description: "Smooth multi-stop battery donut (SoC + kWh) met Wi-Fi bars en power arrow.",
      preview: true,
      documentationURL: "https://github.com/lodebo/battery-donut-card#readme",
      version: VERSION,
    });
    window.dispatchEvent(new Event("ll-rebuild"));
  } catch (e) {
    // stil falen
  }
})();
