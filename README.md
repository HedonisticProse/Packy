# Packy - Packing Streamlined

A cute, practical web-based packing assistant for organizing trip lists with less stress and fewer paper scraps.

![Packy Logo](img/Packy_Logo.png)

Hosted on GitHub Pages: [https://hedonisticprose.github.io/Packy/](https://hedonisticprose.github.io/Packy/)

**Disclaimer**: *Packy is currently in Open Beta for evaluation. If you encounter any issues or have features you would like to request, please use the Issues Page here to communicate them to me.*

## Table of Contents
- [Packy - Packing Streamlined](#packy---packing-streamlined)
  - [Table of Contents](#table-of-contents)
  - [Background](#background)
  - [AI Disclosure](#ai-disclosure)
  - [Features](#features)
  - [Getting Started](#getting-started)
  - [File Structure](#file-structure)
  - [Data Storage](#data-storage)
  - [Settings](#settings)
  - [Configuration Menu](#configuration-menu)
  - [Customization](#customization)
    - [Bags](#bags)
    - [Categories](#categories)
    - [Items](#items)
    - [Stages](#stages)
  - [Filtering](#filtering)
  - [Search](#search)
  - [Export Options](#export-options)
    - [JSON Export/Import](#json-exportimport)
  - [Privacy](#privacy)
  - [License](#license)

## Background

I travel a lot for work and got tired of using paper lists. Packy is the result: a simple, friendly tool that keeps everything tidy, reusable, and easy to update.

## AI Disclosure

Packy was created using Claude Code. The project currently stands as a "scaffold" of AI-generated code I will be trimming, refactoring, and editing once I am finished with the Open Beta.

I don’t know of another tool like this, but if AI-generated projects aren’t your thing, I totally understand.

## Features

- **Templates**: Start fast with built-in packing templates
- **Trip Creation**: Name your trip and set dates to get a tailored list
- **Bags & Categories**: Organize items by bag and category
- **Smart Quantities**: Use expressions like `d`, `d+1`, `2d`, and `d/2` where `d` = trip days
- **Packing Workflow**: Track progress and see packed percentages
- **Preparation Stages**: Add task checklists (night before, morning of, etc.)
- **Drag & Drop**: Move items between bags
- **Import/Export**: Save and restore lists as JSON
- **Undo**: Quick `Ctrl + Z` for the last action

## Getting Started

1. Open `index.html` in your web browser
2. Packy loads the template manifest from `./config/template-manifest.json`
3. Start a new trip or choose a template

## File Structure

- `index.html` - Main application page
- `style.css` - All styling and visual design
- `img/` - Images and logo assets
- `js/` - Application logic and UI rendering
- `config/` - Template configuration files
  - `template-manifest.json` - Template list and metadata
  - `templates/*.json` - Individual template files
- `User/` - Local files not intended for the repo

## Data Storage

Packy does not use browser storage. Your data is only saved when you export it. Remember to export your packing list before closing the browser!

- **Export**: Download your packing list as JSON
- **Import**: Load a previously saved list or template

## Settings

The **Settings** page includes:

- About Packy and current version
- Data management (export or clear the current list)
- Keyboard shortcuts
- Quantity expression guide
- Links to GitHub and Issues

## Configuration Menu

Use the top navigation to switch between:

- **My Lists**: Your active trip and packing workflow
- **Templates**: Browse templates, import templates, or export your current list as a template
- **Settings**: App details and data management tools

## Customization

### Bags

- Add, edit, and delete bags
- Choose bag type and color for quick visual cues
- Drag items between bags as needed

### Categories

- Create custom categories for your trip
- Assign default bags to categories

### Items

- Add items with quantity types:
  - **Single**: Always 1
  - **Fixed**: Always a specific number
  - **Dependent**: Expressions based on trip days (`d`)

### Stages

- Create preparation stages (e.g., "Night Before")
- Add checklist tasks and mark them complete

## Filtering

Filtering is not available yet. It’s on the wishlist for a future update.

## Search

Search is not available yet. It’s on the wishlist for a future update.

## Export Options

### JSON Export/Import

- Export your packing list to a JSON file for backup or sharing
- Import a JSON list to restore your trip
- Export your current list as a reusable template

**File Naming**: Exports follow this format:

```
packy-trip-name-YYYY-MM-DD.json
```

## Privacy

All data stays in your browser unless you export it. Nothing is sent to any server.

## License

MIT License. See `LICENSE` for details.
