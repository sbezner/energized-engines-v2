# Stripe Checkout Integration

This site supports Stripe Checkout integration for processing payments. The checkout can operate in two modes:

## Demo Mode (Default)

When no `CHECKOUT_ENDPOINT` is configured in `config.js`, the site runs in demo mode:

- Cart functionality works normally
- Checkout page displays order summary
- "Pay" button shows a test confirmation message
- No real payment is processed
- User is redirected to order-confirmation.html with demo notice

## Live Stripe Mode

To enable real Stripe checkout:

### 1. Create a Serverless Function

Create a serverless function (Cloudflare Pages/Workers or Netlify) at `/functions/create-checkout-session.js`:

```javascript
// Example for Cloudflare Pages Functions
export async function onRequestPost(context) {
  const stripe = require('stripe')(context.env.STRIPE_SECRET_KEY);
  
  try {
    const { items } = await context.request.json();
    
    // Validate prices server-side by loading from your catalog
    // NEVER trust client-sent prices
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: items.map(item => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
            description: item.partNumber
          },
          unit_amount: Math.round(item.price * 100) // cents
        },
        quantity: item.quantity
      })),
      mode: 'payment',
      success_url: `${context.env.SITE_URL}/order-confirmation.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${context.env.SITE_URL}/cart.html`,
      automatic_tax: { enabled: true },
      shipping_address_collection: {
        allowed_countries: ['US']
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 0, currency: 'usd' },
            display_name: 'Free ground shipping',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 5 },
              maximum: { unit: 'business_day', value: 7 }
            }
          }
        }
      ]
    });
    
    return new Response(JSON.stringify({ id: session.id }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

### 2. Set Environment Variables

Add these environment variables to your hosting platform:

- `STRIPE_SECRET_KEY`: Your Stripe test or live secret key (sk_test_... or sk_live_...)
- `SITE_URL`: Your site URL (e.g., https://sbezner.github.io/energized-engines-v2)

### 3. Configure config.js

Update `/docs/config.js`:

```javascript
window.EEConfig = {
  CHECKOUT_ENDPOINT: '/functions/create-checkout-session',  // or full URL
  FREE_SHIPPING_THRESHOLD: 150,
  BASE_PATH: '/energized-engines-v2'
};
```

### 4. Test with Stripe Test Mode

Use Stripe test card numbers:
- Success: 4242 4242 4242 4242
- Decline: 4000 0000 0000 0002

Visit https://stripe.com/docs/testing for more test cards.

## Security Notes

- Never commit Stripe secret keys to the repository
- Always validate prices server-side from your catalog
- Never trust client-sent prices
- The checkout function reads prices from your catalog JSON, not from the client request
- Use Stripe webhooks to handle post-payment fulfillment

## Deployment Platforms

### Cloudflare Pages

1. Deploy to Cloudflare Pages
2. Add function at `/functions/create-checkout-session.js`
3. Set environment variables in Cloudflare dashboard
4. Function automatically deploys with your site

### Netlify

1. Deploy to Netlify
2. Add function at `/netlify/functions/create-checkout-session.js`
3. Set environment variables in Netlify dashboard
4. Configure redirects if needed

### Vercel

1. Deploy to Vercel
2. Add API route at `/api/create-checkout-session.js`
3. Set environment variables in Vercel dashboard
4. Update CHECKOUT_ENDPOINT to `/api/create-checkout-session`

## Current Status

The test site (GitHub Pages) runs in DEMO MODE because:
- GitHub Pages serves static files only (no serverless functions)
- No Stripe account is connected yet
- The red test banner warns users no payment is taken

To go live with Stripe, deploy to a platform that supports serverless functions (Cloudflare, Netlify, or Vercel) and follow the steps above.
