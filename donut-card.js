/*!
 * 🟢 Donut Card v1.1 (kleurpicker fix: value wordt altijd gezet en gesanitized)
 */
(() => {
  const TAG = "donut-card";
  const VERSION = "1.0.3";

  class DonutCard extends HTMLElement {
    constructor(){
      super();
      this.attachShadow({mode:"open"});
      this._hass=null; this._config=null;
    }
    static getConfigElement(){ return document.createElement("donut-card-editor"); }
    static getStubConfig(){
      return {
        entity_primary: "sensor.example_power",
        entity_secondary: "sensor.example_energy",
        min_value: 0, max_value: 100,
        top_label_text: "Donut", top_label_weight: 400,
        top_label_color: "#ffffff", text_color_inside: "#ffffff",
        font_scale_ent1: 0.30, font_scale_ent2: 0.30,
        unit_primary: "W", unit_secondary: "kWh",
        decimals_primary: 0, decimals_secondary: 2,
        ring_radius: 65, ring_width: 8, ring_offset_y: 0, label_ring_gap: 17,
        background: "var(--card-background-color)",
        border_radius: "12px",
        border: "1px solid rgba(255,255,255,0.2)",
        box_shadow: "none", padding: "0px",
        track_color: "#000000",
        stop_1: 0.00, color_1: "#ff0000",
        stop_2: 0.30, color_2: "#fb923c",
        stop_3: 0.50, color_3: "#facc15",
        stop_4: 0.75, color_4: "#34d399",
        stop_5: 1.00, color_5: "#00bcd4",
      };
    }
    setConfig(config){ this._config = { ...DonutCard.getStubConfig(), ...config }; }
    set hass(h){ this._hass=h; this.render(); }

    _clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
    _lerp(a,b,t){ return a+(b-a)*t; }
    _hex2rgb(h){
      const m=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(h).trim());
      return m?{r:parseInt(m[1],16),g:parseInt(m[2],16),b:parseInt(m[3],16)}:{r:255,g:255,b:255};
    }
    _rgb2hex(r,g,b){ const p=v=>this._clamp(Math.round(v),0,255).toString(16).padStart(2,"0"); return `#${p(r)}${p(g)}${p(b)}`; }
    _lerpColor(a,b,t){ const A=this._hex2rgb(a),B=this._hex2rgb(b); return this._rgb2hex(this._lerp(A.r,B.r,t),this._lerp(A.g,B.g,t),this._lerp(A.b,B.b,t)); }
    _colorAtStops(stops,t){
      t=this._clamp(t,0,1);
      for(let i=0;i<stops.length-1;i++){
        const [pa,ca]=stops[i], [pb,cb]=stops[i+1];
        if(t>=pa && t<=pb){
          const f=(t-pa)/Math.max(pb-pa,1e-6);
          return this._lerpColor(ca,cb,f);
        }
      }
      return stops[stops.length-1][1];
    }
    _sanitizeColor(color) {
      // geldige hex value: #RRGGBB, anders standaard rood
      if (typeof color === 'string' && /^#[0-9A-F]{6}$/i.test(color.trim()))
        return color.trim();
      if (typeof color === 'string' && /^#[0-9A-F]{3}$/i.test(color.trim()))
        return '#' + color.substr(1).split('').map(s => s+s).join('');
      return "#ff0000";
    }
    _buildStops(c){
      // Stop 1 altijd op 0, rest uit config
      return [
        [ 0.00, this._sanitizeColor(c['color_1']) ],
        [ this._clamp(Number(c['stop_2']),0,1), this._sanitizeColor(c['color_2']) ],
        [ this._clamp(Number(c['stop_3']),0,1), this._sanitizeColor(c['color_3']) ],
        [ this._clamp(Number(c['stop_4']),0,1), this._sanitizeColor(c['color_4']) ],
        [ this._clamp(Number(c['stop_5']),0,1), this._sanitizeColor(c['color_5']) ]
      ].sort((a,b)=>a[0]-b[0]);
    }
    render(){
      if(!this._config || !this._hass) return;
      const c=this._config, h=this._hass;
      const ent1=h.states?.[c.entity_primary];
      const ent2=c.entity_secondary ? h.states?.[c.entity_secondary] : null;
      if(!ent1) return;

      const val1=Number(String(ent1.state).replace(",", ".")) || 0;
      const val2=ent2 ? Number(String(ent2.state).replace(",", ".")) : null;
      const min=Number(c.min_value??0), max=Number(c.max_value??100);
      const frac=this._clamp((val1-min)/Math.max(max-min,1e-9),0,1);

      const R=Number(c.ring_radius), W=Number(c.ring_width);
      const cx=130, cy=130+Number(c.ring_offset_y||0), rot=-90, segs=140;
      const span=frac*360, stops=this._buildStops(c);

      const arcSeg=(a0,a1,sw,color)=>{
        const toRad=d=>(d*Math.PI)/180;
        const x0=cx+R*Math.cos(toRad(a0)), y0=cy+R*Math.sin(toRad(a0));
        const x1=cx+R*Math.cos(toRad(a1)), y1=cy+R*Math.sin(toRad(a1));
        const large=(a1-a0)>180?1:0;
        return `<path d="M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>`;
      };

      let svg = `
        <svg viewBox="0 0 260 260" xmlns="http://www.w3.org/2000/svg">
          <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${c.track_color}" stroke-width="${W}" opacity="0.3"/>
      `;
      const start=rot, end=rot+span;
      for(let i=0;i<segs;i++){
        const a0=start+(i/segs)*span, a1=start+((i+1)/segs)*span;
        if(a1>end) break;
        const mid=(a0+a1)/2, t=(mid-rot)/360;
        svg += arcSeg(a0,a1,W,this._colorAtStops(stops,t));
      }
      if((c.top_label_text??"").trim()!==""){
        const fs_top=R*0.35;
        const y_top=(cy-R)-(W*0.8)-fs_top*0.25-Number(c.label_ring_gap||0);
        svg += `<text x="${cx}" y="${y_top}" font-size="${fs_top}" font-weight="${c.top_label_weight}" fill="${c.top_label_color}" text-anchor="middle" dominant-baseline="middle">${c.top_label_text}</text>`;
      }
      const textColor=c.text_color_inside || "#ffffff";
      const fs1=R*(c.font_scale_ent1??0.30);
      const fs2=R*(c.font_scale_ent2??0.30);
      const y1=cy-R*0.05, y2=cy+R*0.35;
      svg += `<text x="${cx}" y="${y1}" text-anchor="middle" font-size="${fs1}" font-weight="400" fill="${textColor}">${val1.toFixed(c.decimals_primary)} ${c.unit_primary}</text>`;
      if(ent2){
        svg += `<text x="${cx}" y="${y2}" text-anchor="middle" font-size="${fs2}" font-weight="300" fill="${textColor}">${val2.toFixed(c.decimals_secondary)} ${c.unit_secondary}</text>`;
      }
      svg += `</svg>`;

      const style=`
        <style>
          :host{display:block;width:100%;height:100%;}
          ha-card{background:${c.background};border-radius:${c.border_radius};
          border:${c.border};box-shadow:${c.box_shadow};padding:${c.padding};
          display:flex;align-items:center;justify-content:center;width:100%;height:100%;}
          .wrap{width:100%;height:100%;max-width:520px;display:flex;align-items:center;justify-content:center;position:relative;}
          svg{width:100%;height:auto;display:block;} text{user-select:none;}
        </style>`;
      this.shadowRoot.innerHTML = `${style}<ha-card><div class="wrap">${svg}</div></ha-card>`;
    }
  }

  class DonutCardEditor extends HTMLElement {
    constructor() {
      super();
      this._config = {};
      this._initDone = false;
    }
    setConfig(config) {
      this._config = { ...DonutCard.getStubConfig(), ...config };
      this._render();
      this._updateFields(); // colors worden ZEKER gezet op value (en gesanitized!)
    }
    _sanitizeColor(color) {
      // altijd geldige hex
      if (typeof color === 'string' && /^#[0-9A-F]{6}$/i.test(color.trim()))
        return color.trim();
      if (typeof color === 'string' && /^#[0-9A-F]{3}$/i.test(color.trim()))
        return '#' + color.substr(1).split('').map(s => s + s).join('');
      return "#ff0000";
    }
    _render() {
      const c = this._config;
      // Stop 1: kleurpicker, 0%
      const stopOne = `
        <div class="segrow">
          <div class="color">
            <input type="color" value="${this._sanitizeColor(c.color_1)}" data-k="color_1">
            <span class="lbl">stop_1: 0%</span>
          </div>
        </div>
      `;
      // Stops 2-5: percentage slider + kleurpicker
      const stopRest = [2,3,4,5].map(i => {
        const stopKey = 'stop_' + i;
        const colorKey = 'color_' + i;
        const pct = Math.round((c[stopKey] || 0) * 100);
        return (
          `<div class="segrow">
            <ha-slider min="0" max="100" step="1" value="${pct}" data-k="${stopKey}"></ha-slider>
            <div class="color">
              <input type="color" value="${this._sanitizeColor(c[colorKey])}" data-k="${colorKey}">
              <span class="lbl">${stopKey}: ${pct}%</span>
            </div>
          </div>`
        );
      }).join("");
      this.innerHTML = `
        <style>
          ha-textfield, ha-slider, ha-entity-picker{width:100%;}
          .segrow{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;}
          .color input[type=color]{width:42px;height:28px;border:none;padding:0;}
          .lbl{font-size:12px;opacity:.8;}
        </style>
        <div class="editor">
          <ha-entity-picker label="Entity primary" value="${c.entity_primary}" data-k="entity_primary" allow-custom-entity></ha-entity-picker>
          <ha-entity-picker label="Entity secondary" value="${c.entity_secondary}" data-k="entity_secondary" allow-custom-entity></ha-entity-picker>
          <ha-textfield label="Min" value="${c.min_value}" type="number" data-k="min_value"></ha-textfield>
          <ha-textfield label="Max" value="${c.max_value}" type="number" data-k="max_value"></ha-textfield>
          <ha-textfield label="Unit primary" value="${c.unit_primary}" data-k="unit_primary" type="text"></ha-textfield>
          <ha-textfield label="Unit secondary" value="${c.unit_secondary}" data-k="unit_secondary" type="text"></ha-textfield>
          <ha-textfield label="Decimals primary" value="${c.decimals_primary}" type="number" data-k="decimals_primary"></ha-textfield>
          <ha-textfield label="Decimals secondary" value="${c.decimals_secondary}" type="number" data-k="decimals_secondary"></ha-textfield>
          <ha-textfield label="Top label" value="${c.top_label_text}" data-k="top_label_text" type="text"></ha-textfield>
          <ha-textfield label="Top label color" value="${c.top_label_color}" data-k="top_label_color" type="text"></ha-textfield>
          <ha-textfield label="Top label weight" value="${c.top_label_weight}" type="number" data-k="top_label_weight"></ha-textfield>
          <div class="lbl">Kleurstops</div>
          ${stopOne}
          ${stopRest}
        </div>
      `;
      this._initEventHandlers();
      this._initDone = true;
    }
    _updateFields() {
      const c = this._config;
      ["color_1","color_2","color_3","color_4","color_5"].forEach(colorKey=>{
        const el = this.querySelector(`[data-k="${colorKey}"]`);
        if(el){
          el.value = this._sanitizeColor(c[colorKey]);
        }
      });
      [2,3,4,5].forEach(i => {
        const stopKey = "stop_" + i;
        const el = this.querySelector(`[data-k="${stopKey}"]`);
        if(el){
          el.setAttribute("value", Math.round((c[stopKey]||0)*100));
          const span = el.parentElement?.querySelector(".lbl");
          if(span) span.textContent = `${stopKey}: ${Math.round((c[stopKey]||0)*100)}%`;
        }
      });
    }
    _initEventHandlers() {
      this.querySelectorAll("[data-k]").forEach(el => {
        el.oninput = el.onchange = (ev) => {
          const key = el.getAttribute("data-k");
          let val = el.value;
          if (el.tagName === "HA-SLIDER") {
            val = Number(val) / 100;
          }
          if (el.type === "number" && key.startsWith("stop_")) {
            val = Number(val) / 100;
          }
          if (key.startsWith("color_")) {
            val = this._sanitizeColor(val);
          }
          this._config = { ...this._config, [key]: val };
          this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:this._config}}));
          if(key.startsWith("stop_")){
            const span = el.parentElement?.querySelector(".lbl");
            if(span) span.textContent = `${key}: ${Math.round(val * 100)}%`;
          }
          if(key.startsWith("color_")){
            el.value = this._sanitizeColor(val);
          }
        };
        el.addEventListener("value-changed", (ev) => {
          const key = el.getAttribute("data-k");
          let val = (ev.detail && ev.detail.value !== undefined) ? ev.detail.value : el.value;
          if (el.tagName === "HA-SLIDER") {
            val = Number(val) / 100;
          }
          if (el.type === "number" && key.startsWith("stop_")) {
            val = Number(val) / 100;
          }
          if (key.startsWith("color_")) {
            val = this._sanitizeColor(val);
          }
          this._config = { ...this._config, [key]: val };
          this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:this._config}}));
          if(key.startsWith("stop_")){
            const span = el.parentElement?.querySelector(".lbl");
            if(span) span.textContent = `${key}: ${Math.round(val * 100)}%`;
          }
          if(key.startsWith("color_")){
            el.value = this._sanitizeColor(val);
          }
        });
      });
    }
    connectedCallback() {
      this._render();
      this._updateFields();
    }
  }

  try{
    if(!customElements.get("donut-card")) customElements.define("donut-card", DonutCard);
    if(!customElements.get("donut-card-editor")) customElements.define("donut-card-editor", DonutCardEditor);
    console.info(`🟢 ${TAG} v${VERSION} geladen`);
  }catch(e){
    console.error("❌ Fout bij registratie donut-card:", e);
  }
})();
