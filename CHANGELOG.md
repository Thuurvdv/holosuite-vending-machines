# Changelog

## 1.3.0 - 2026-08-24

### Added

- Four selectable vending-machine styles: Alien Market, Neon, Executive Terminal, and Corporate Kiosk.
- Replaceable SVG artwork for the Alien Market and Neon chassis.
- HoloSuite launcher icon with version-compatible registration for Foundry v12, v13, and v14.
- Experimental Credit Transformer option with contextual configuration help.
- Persisted editor scroll positions when products are added or reordered.

### Changed

- Reduced each machine to six active product slots and preserved overflow inventory safely.
- Refined the Corporate Kiosk with a warm ivory retro-future palette and light product displays.
- Improved terminal layout, button sizing, queue overflow handling, contrast, scrolling, and decorative artwork alignment.
- Made linked-Region presence required by default for new and previously unset machines.
- Filtered the player machine browser using live token Region membership and enforced the same check when opening or purchasing.
- Replaced the header connection text with a compact status indicator.
- Made the custom close control independent of icon-font differences across supported Foundry versions.

### Removed

- Legacy Tile compatibility and Tile attachment APIs.
- Required Actor Item access restrictions.
- Per-machine offline and sold-out image upload fields.
- Unused vent and side-service-panel SVG files.

### Fixed

- Foundry v12 machine creation failing when assigning a read-only application ID.
- Configuration window scrolling, label contrast, and linked-Region button contrast.
- Checkout controls disappearing when the queue contains several items.
- Restricted machines remaining visible to players outside their linked Regions.
- Decorative SVG layers failing to fill their intended frames.
- Close control visibility and centering across Foundry v12, v13, and v14.
