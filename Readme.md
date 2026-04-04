# Donut Card for Home Assistant

A small, beautiful donut chart Lovelace card for Home Assistant with multi-stop gradient coloring and support for two entities (primary + secondary). Designed to be lightweight, highly configurable, and to work seamlessly in the Lovelace visual editor.

<p align="center">
  <img src="docs/preview.png" alt="Donut Card preview" width="600"/>
</p>
https://github.com/LodeBo/donut-card/blob/main/donut.png
---

## ✨ Features
- **Animated SVG rendering:** Smooth, high-performance donut visualization.
- **Multi-stop gradients:** Full control over color transitions (up to 5 stops).
- **Dual-entity support:** Display a primary value (main) and an optional secondary value (sub).
- **Fully configurable:** Customize min/max values, units, and decimals for each entity.
- **Visual Editor:** Full support for the Home Assistant UI card picker, including entity dropdowns and visual color pickers.

---

## ⚙️ Installation

### HACS (Recommended)
1. In Home Assistant, navigate to **HACS** → **Frontend** → **Explore & Add Repositories**.
2. Search for `donut-card` and click install.
3. After installation, ensure the resource is loaded in **Settings** → **Dashboards** → **Resources**:
   - **URL:** `/hacsfiles/donut-card/donut-card.js`
   - **Type:** `JavaScript Module`
4. Hard-refresh your browser (`Ctrl/Cmd + Shift + R`) or open the Companion App settings to clear the frontend cache.

### Manual Installation
1. Download `donut-card.js` and place it in your `/config/www/` folder.
2. Add the resource in **Settings** → **Dashboards** → **Resources**:
   - **URL:** `/local/donut-card.js`
   - **Type:** `JavaScript Module`
3. Hard-refresh your browser.

> **Note on mobile:** The Home Assistant Companion App caches JavaScript files heavily. If a newly installed version doesn't appear immediately on mobile, try clearing the app cache or pulling down to refresh.

---

## 🚀 Quick Start Examples

**Minimal setup**
```yaml
type: custom:donut-card
entity_primary: sensor.example_power
