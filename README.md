# My Weight Tracker

A responsive, offline weight tracker built with plain HTML, CSS, and JavaScript. Entries, target weight, and preferred input unit are saved in the browser's localStorage. No account, backend, build step, or external assets are required.

The progress dashboard has its own saved display unit setting. Choose kilograms, pounds, or stones + pounds without changing your entry unit or the kilograms stored for each entry.

Use **Export CSV** above Weight history to download dated entries with their exact stored kilogram values and converted pound and stone values. Export works offline.

Use **Reset app** in the footer to clear all saved entries, the target weight, unit preferences, and form inputs. The app asks for confirmation because reset cannot be undone. Download a JSON backup first if you may want to restore your data.

Use **Backup JSON** in the footer to download all weight entries, the target weight, and both unit preferences. Use **Restore JSON** to load that file on this or another browser. Restore checks the file and asks before replacing the data currently saved in the browser. Keep the JSON file if you want to restore settings as well as history; CSV is for reading your history in a spreadsheet.

## Use locally

Open `index.html` in a browser. You can also serve this folder with any static file server.

## Deploy to Cloudflare Pages

Connect the GitHub repository to Cloudflare Pages as a static site. Leave the build command empty and set the output directory to `/` (the repository root). The app uses relative asset paths and needs no environment variables.

Each browser and device has its own localStorage data. Clearing browser site data removes saved entries. Publishing or redeploying the site does not transfer entries between devices.

## Tests

Run `node --test tests/app.test.js` with Node.js. The tests cover conversions, validation, saving entries and targets, unit preference, editing, deletion, CSV export, reset, and JSON backup and restore.

