# From Lag to Lightning

## Singapore Internet History (2000–2026)

## Project Structure

```
project/
├── index.html           # Homepage (static content)
├── 2000s.html           # 2000–2009 era page (Mustache template)
├── 2010s.html           # 2010–2019 era page (Mustache template)
├── 2020s.html           # 2020–2026 era page (Mustache template)
├── style.css            # Shared stylesheet for all pages
├── script.js            # Shared JavaScript for all era pages
├── data/
│   ├── 2000s-data.json  # JSON data for the 2000s page
│   ├── 2010s-data.json  # JSON data for the 2010s page
│   └── 2020s-data.json  # JSON data for the 2020s page
├── images/              # Images used on the site
└── README.md            # This file
```

## How to Run

### Option 1: VS Code Live Server (Recommended)

1. Install the "Live Server" extension in VS Code
2. Right-click `index.html`
3. Select "Open with Live Server"

### Option 2: Python

```bash
python -m http.server 3000
```

Then open: http://localhost:3000

### Option 3: Node.js

```bash
node -e "require('http').createServer(require('fs').readFile.bind(null)).listen(3000)"
```

Then open: http://localhost:3000

## How the Template Engine Works

1. Each era page sets a `DATA_FILE` variable pointing to its JSON file in `data/`
2. `script.js` fetches that file and parses the JSON
3. The JSON is validated — missing fields show warnings or an error on the page
4. Mustache.js fills in the `<script id="tmpl">` template with the JSON data
5. The rendered HTML is inserted into `<div id="page-content">`

## Public API Used

The homepage uses the **Wayback Machine Availability API** (Internet Archive):

- Endpoint: `https://archive.org/wayback/available?url=<site>&timestamp=<ts>`
- No API key required — free and open
- Fetches the closest archived snapshot of Singapore ISP homepages from the dial-up era
- Docs: https://archive.org/help/wayback_api.php

## Data Sources

- IMDA (Infocomm Media Development Authority)
- IDA Annual Reports
- Ookla Speedtest Global Index
- Singapore government digital infrastructure reports
