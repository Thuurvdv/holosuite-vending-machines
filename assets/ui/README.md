# Vending UI asset map

These SVGs are intentionally lightweight placeholders. The player-facing UI uses them as decorative backgrounds; buttons, labels, product art, and state indicators remain HTML/CSS so the machine stays accessible and functional if an asset is replaced or missing.

| File | Photoshop master size | UI role |
| --- | ---: | --- |
| `machine-shell.svg` | 1600 x 1400 | Outer chassis and side rails |
| `header-status.svg` | 1600 x 260 | Brand, machine identity, and telemetry header |
| `slot-frame.svg` | 420 x 620 | Normal reusable product slot |
| `slot-sold-out.svg` | 420 x 620 | Sold-out overlay |
| `slot-empty.svg` | 420 x 620 | Unused compartment insert |
| `control-panel.svg` | 700 x 1100 | Product detail and checkout terminal |
| `retrieval-tray.svg` | 1600 x 260 | Bottom collection bay |

Keep replacement SVG view boxes at the listed sizes. If filenames stay the same no CSS changes are needed. To use different filenames, update only the `--hsv-asset-*` variables near the top of `styles/vending.css`.

For Photoshop exports, preserve transparency and avoid text that must change at runtime. Export frames and panels as SVG when practical. Use PNG only for texture overlays or a decal atlas; avoid JPG compression in UI assets.
