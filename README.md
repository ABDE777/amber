# MWOA — 3anber 7out

A React + Vite conversion of the MWOA landing page for **3anber 7out**
(عنبر الحوت / ambergris) — one product, sold by the gram, weighed by hand.

This started life as a single Claude **Design Canvas** file (`MWOA Amber.dc.html`,
kept in the repo for reference) and has been rebuilt as a standalone React
single-page app.

## Getting started

```bash
npm install
npm run dev        # start the dev server (http://localhost:5173)
npm run build      # production build into dist/
npm run preview    # preview the production build
```

## Project structure

```
index.html            App entry + Google Fonts + favicon
src/
  main.jsx            React bootstrap
  App.jsx             All page sections (Nav, Hero, WhatIs, Origin,
                      Gallery, Authenticity, Order, Testimonials, Faq, Footer)
  config.js           Editable content: price, contacts, testimonials toggle, FAQ
  index.css           Reset, fonts, keyframes, hover states, responsive rules
public/assets/        logo, whale, flourish, frame images
```

## Editing content

All the values that were editable props in the original Design Canvas now live
in **`src/config.js`**:

| Field              | Meaning                                  |
| ------------------ | ---------------------------------------- |
| `price`            | Flat rate in MAD per gram (default 199)  |
| `whatsapp`         | WhatsApp number (drives the wa.me link)  |
| `email`            | Contact email (drives the mailto link)   |
| `showTestimonials` | Show/hide the testimonials section       |
| `faqs`             | The FAQ accordion questions and answers  |

The WhatsApp deep-link and mailto link are derived automatically from those
values.

## Still to fill in

The design intentionally leaves a few placeholders for the real business:

- **Gallery** — four empty photo slots for real product shots.
- **Testimonials** — three placeholder quotes to swap for real buyer messages.
- **Contact** — replace the placeholder WhatsApp number and email in `config.js`.
