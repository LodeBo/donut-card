# Donut Card

A small, beautiful donut chart Lovelace card for Home Assistant with multi-stop gradient coloring and support for two entities (primary + secondary). Designed to be lightweight, highly configurable and to work well in the Lovelace card picker.

<!-- Screenshot / preview images (place files in `docs/` folder) -->
<p align="center">
  <img src="docs/preview.png" alt="Donut Card preview" width="600"/>
</p>

---

Features
- Animated donut visualization using SVG.
- Multi-stop gradient color support (up to 5 stops).
- Two-entity support: primary value (main) and optional secondary value (sub).
- Configurable min/max, units and decimals for each entity.
- Customizable appearance: ring radius, width, gap, background, border, shadows, colors.
- Editor support with entity pickers and color pickers.
- Appears in Lovelace "Add Card" picker (registered for compatibility).

Status
- Stable rendering based on v1.7 implementation.
- Registration fixes included in v1.8.1 to ensure consistent visibility in the card picker.

---

Screenshots

Preview (card in a dashboard)
![Preview (dashboard)](docs/preview.png)

Editor (card editor with entity pickers and color stops)
![Editor (entity-picker)](docs/editor.png)

Card picker (Donut Card shown in "Add Card")
![Card picker](docs/picker.png)

> Replace the `docs/*.png` placeholders with your real screenshots (see below for how to add images).

---

Installation

HACS (recommended)
1. In Home Assistant, go to HACS → Frontend → Explore & Add Repositories.
2. Search for "donut-card" and install.
3. After install, ensure the resource is present in Settings → Dashboards → Resources:
   - Resource: `/hacsfiles/donut-card/donut-card.js?hacstag=<tag>`
   - Type: `JavaScript Module`
4. Hard-refresh your browser (Ctrl/Cmd+Shift+R) or open an incognito window.

Manual
1. Download `donut-card.js` and place it into your `/config/www/` folder.
2. Add the resource in Settings → Dashboards → Resources:
   - URL: `/local/donut-card.js?v=<version>`
   - Type: `JavaScript Module`
3. Hard-refresh your browser.

Note on mobile: the Home Assistant Companion App may cache JS heavily. If a newly published version doesn't appear immediately on mobile, try opening the UI in Safari private mode or reinstalling the Companion App to clear its webview cache.

---

Quick start examples

Minimal card
```yaml
type: custom:donut-card
entity_primary: sensor.example_power
```

Primary + secondary
```yaml
type: custom:donut-card
entity_primary: sensor.example_power
entity_secondary: sensor.example_energy
min_value: 0
max_value: 5000
unit_primary: W
unit_secondary: kWh
decimals_primary: 0
decimals_secondary: 2
```

Full example
```yaml
type: custom:donut-card
entity_primary: sensor.solar_power
entity_secondary: sensor.energy_total
min_value: 0
max_value: 5000
unit_primary: W
unit_secondary: kWh
decimals_primary: 0
decimals_secondary: 2
ring_radius: 65
ring_width: 8
ring_offset_y: 0
label_ring_gap: 17
background: 'var(--card-background-color)'
border_radius: '12px'
border: '1px solid rgba(255,255,255,0.2)'
box_shadow: 'none'
padding: '0px'
track_color: '#000000'
start_color: '#ff0000'
stop_2: 0.30
color_2: '#fb923c'
stop_3: 0.50
color_3: '#facc15'
stop_4: 0.75
color_4: '#34d399'
stop_5: 1.00
color_5: '#00bcd4'
```

---

Configuration reference

The card merges your configuration with sensible defaults. The key configuration options:

- entity_primary (string) — Primary entity (required). Example: `sensor.power`.
- entity_secondary (string) — Optional secondary entity shown under the primary value.
- min_value (number) — Minimum value for the gauge (default: 0).
- max_value (number) — Maximum value for the gauge (default: 100).
- unit_primary (string) — Unit text for primary value.
- unit_secondary (string) — Unit text for secondary value.
- decimals_primary (int) — Decimals for primary (default: 0).
- decimals_secondary (int) — Decimals for secondary (default: 2).
- ring_radius (number) — Radius of the donut ring (default: 65).
- ring_width (number) — Stroke width of the ring (default: 8).
- ring_offset_y (number) — Vertical offset of the donut center.
- label_ring_gap (number) — Extra gap above the ring for the top label.
- top_label_text (string) — Text displayed above the donut (optional).
- top_label_color (string) — Color for the top label text.
- top_label_weight (number) — Font weight for the top label.
- text_color_inside (string) — Color for numbers inside the donut.
- font_scale_ent1 / font_scale_ent2 (float) — Scales for the primary/secondary font size (relative to ring radius).
- background, border_radius, border, box_shadow, padding — Card styling.
- track_color — Color used for the empty track of the donut.
- start_color, color_2, color_3, color_4, color_5 — Hex colors for gradient stops.
- stop_2, stop_3, stop_4, stop_5 — Position (0..1) of additional color stops.

Aliases
- The card accepts several alias names for entities in legacy configs:
  - entity, primary_entity, primaryEntity, primary → entity_primary
  - secondary_entity, secondaryEntity, secondary → entity_secondary
  - If `entities:` array is provided, the first two entries map to primary and secondary.

Editor
- The card provides a UI editor with `ha-entity-picker` and color inputs.
- If the picker does not populate immediately in the editor, try refreshing the page; the editor includes logic to assign `hass` to pickers when available.

Card picker registration
- The card registers itself in `window.customCards` so it appears in the Lovelace "Add Card" dialog.
- The registration uses the bare element name `donut-card` (Home Assistant adds the `custom:` prefix in the picker).

---

Adding screenshots (how-to)

1) Recommended screenshot files and names:
   - `docs/preview.png` — dashboard preview (ideal size: ~1200×600 px)
   - `docs/editor.png` — editor view with entity pickers (ideal size: ~1200×800 px)
   - `docs/picker.png` — card picker screenshot (ideal size: ~800×600 px)
   Use PNG for crisp UI screenshots. Filenames are case-sensitive.

2) Upload screenshots via GitHub web (no git needed)
   - On GitHub: go to the repo → click "Add file" → "Upload files".
   - Create a folder named `docs/` if it doesn't exist and upload `preview.png`, `editor.png`, `picker.png` there.
   - Commit the changes to `main` with a message like "Add screenshots".
   - The README references `docs/preview.png` relative to the repo root, so GitHub will render the images.

3) Upload via git (local)
   - Copy screenshots into your local repo `docs/` folder.
   - Run:
     ```
     git add docs/preview.png docs/editor.png docs/picker.png
     git commit -m "Add screenshots for README"
     git push origin main
     ```

4) If you prefer to host screenshots on a release or use GitHub Releases, you can link to release assets or use raw GitHub URLs — but the `docs/` folder is easiest and works on GitHub pages and the repo README.

5) Alt text & captions are already included in the README. If you want different captions or additional examples, tell me which screenshots to show and I will update the README text accordingly.

---

Troubleshooting

- Image not showing in README on GitHub?
  - Confirm files are in `docs/` and committed to the `main` branch.
  - Use the exact relative path `docs/preview.png`.
  - Give GitHub a moment to process large images.

---

Contributing
- Bug reports and PRs are welcome. Please open issues on the repo with:
  - Steps to reproduce
  - Browser/HA/HACS versions
  - Any console/network logs showing failures
- If you'd like, open a PR that adds the screenshots and I can review.

License
- MIT License — see LICENSE file for details.

Acknowledgements
- Built with love for the Home Assistant community — contributions and tests are appreciated.
