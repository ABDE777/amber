# MWOA order automation (n8n)

When a customer places an order on the site, the app POSTs the order as JSON to
your **n8n** webhook. The workflow then:

1. **Saves the order** to a Google Sheet — your *suivi des commandes* (order tracking).
2. **Messages the customer on WhatsApp** to confirm and ask for a payment method.
3. Returns `200` to the site.

You already get the order by email/WhatsApp from the app itself; n8n adds the
**automatic customer contact** and the **tracking sheet**.

```
Site order ──POST──► n8n Webhook ──► Save to Google Sheet (tracking)
                                └──► WhatsApp message to the customer
```

---

## ⚠️ One thing to know about WhatsApp
You **cannot** auto-message customers from your personal WhatsApp app (and tools
that fake it can get your number banned). Automatic outbound messaging needs the
official **WhatsApp Business Cloud API** (Meta, free tier). Because the customer
filled a form (they didn't message you first), the **first** message must use a
**pre-approved message template**. After the customer replies, you have a 24h
window to send free text.

Easiest alternatives if Meta setup is too much: **Wati** or **360dialog** (paid,
but they wrap WhatsApp with a ready dashboard) — both have n8n nodes too.

---

## Setup — step by step

### 1. Get n8n
- **n8n Cloud** (easiest): sign up at https://n8n.io → free trial. OR
- **Self-host** (free): `docker run -it --rm -p 5678:5678 n8nio/n8n` and open http://localhost:5678
  (self-host works, but the webhook must be reachable from the internet — use the
  n8n Cloud, or a tunnel like `cloudflared`/`ngrok`, so Vercel can reach it).

### 2. Import the workflow
In n8n: top-right **⋯ → Import from File** → choose `automation/n8n-workflow.json`.
You'll see 5 nodes: **Order Webhook → Normalize Order → (Save to Google Sheet + WhatsApp to Customer) → Respond 200**.

### 3. Connect Google Sheets (the tracking sheet)
1. Create a Google Sheet named e.g. **MWOA Commandes** with a first header row:
   `name | qty | email | phone | country_residence | country_delivery | lang | status | createdAt`
2. Open the **Save to Google Sheet** node → **Credential → Connect** (Google OAuth) → allow.
3. Pick your spreadsheet and the sheet/tab. Mapping is **auto** (columns match the
   header names above), so nothing else to configure.
   > This sheet is your live order tracker. Change `status` (new → confirmed →
   > paid → shipped) as you handle each order.

### 4. Connect WhatsApp Business Cloud
1. Create a Meta app + WhatsApp Business number at https://developers.facebook.com
   (WhatsApp → API Setup). Note the **Phone Number ID** and create an access token.
2. In n8n, open **WhatsApp to Customer** node → **Credential → Connect** → paste the token.
3. Set **Phone Number ID** to your number's ID.
4. **First contact = template.** In Meta → WhatsApp Manager → Message Templates,
   create & submit a template (e.g. `order_confirmation`) in Arabic/English. Once
   approved, switch the node's **Message Type** to **Template**, pick your template,
   and map its variables to `{{$json.name}}`, `{{$json.qty}}`, etc.
   (The imported node is set to plain **text** for testing; text only works once
   the customer has messaged you within the last 24h.)

### 5. Activate & copy the webhook URL
1. Toggle the workflow **Active** (top-right).
2. Click the **Order Webhook** node → copy the **Production URL**
   (looks like `https://<your-n8n>/webhook/mwoa-order`).

### 6. Point the site at n8n
In **Vercel → your project → Settings → Environment Variables** add:
- `N8N_WEBHOOK_URL` = the Production URL from step 5
- `N8N_WEBHOOK_SECRET` = any random string (optional). If you set it, also turn on
  **Header Auth** in the Webhook node with header `x-webhook-secret` = the same value.

Then **Redeploy**. Done — every new order now flows into n8n.

### 7. Test
Place a test order on the site (or from n8n, click **Order Webhook → Listen for test event**,
then submit an order). You should see a new row in the sheet and a WhatsApp message.

---

## Optional: reply handling + AI agent (two-way chat)
To let the customer's WhatsApp replies be answered automatically:
1. Add a second **Webhook** (Meta calls it when a message arrives — set it as the
   WhatsApp **callback URL** in the Meta app).
2. Feed the reply into an **AI Agent** node (you can use your **Groq** key) with the
   same product facts + payment options, and have it update the order's `status`
   in the Google Sheet.

This part is workflow-only (no app change) — tell me if you want a second
importable file for it.

---

## Payload the site sends (for reference)
```json
{
  "event": "order.created",
  "createdAt": "2026-08-30T22:00:00.000Z",
  "lang": "ar",
  "name": "محمد العلوي",
  "qty": 12,
  "unit": "g",
  "email": "customer@email.com",
  "phone": "+212612345678",
  "country_residence": "المغرب",
  "country_delivery": "المغرب",
  "status": "new"
}
```
