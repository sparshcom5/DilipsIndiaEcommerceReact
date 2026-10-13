/**
 * Cashfree web checkout (JS SDK v3).
 *
 * The SDK is loaded from Cashfree's CDN on first use rather than bundled: it
 * is PCI-scoped code they update on their side, and an npm pin would only
 * mean shipping a stale copy that then loads the live one anyway.
 *
 * The server never trusts anything this returns. Whether the payment went
 * through is read back from GET /checkout/payment/:orderNumber, which asks
 * Cashfree directly — the modal's result only decides what to show next.
 *
 * Docs: https://www.cashfree.com/docs/payments/online/web
 */

const SDK_URL = 'https://sdk.cashfree.com/js/v3/cashfree.js';

let loading = null;

function loadSdk() {
  if (window.Cashfree) return Promise.resolve(window.Cashfree);
  if (loading) return loading;

  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => {
      if (window.Cashfree) resolve(window.Cashfree);
      else reject(new Error('The payment SDK did not initialise.'));
    };
    script.onerror = () => {
      loading = null;
      reject(new Error('Could not load the payment page. Check your connection and try again.'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/**
 * Opens Cashfree checkout in a modal over the current page.
 *
 * `payment` is the object the API returns on the order (`order.payment`) or
 * from createPaymentSession(): { paymentSessionId, mode }.
 *
 * Resolves when the modal closes, with one of:
 *   { paymentDetails }  the shopper completed a payment (verify server-side!)
 *   { redirect: true }  the bank needed a full-page redirect; Cashfree will
 *                       bring the shopper back to return_url on its own
 *   { error }           closed early, or the SDK reported a problem
 */
export async function openCashfreeCheckout(payment) {
  if (!payment?.paymentSessionId) throw new Error('No payment session to open.');

  const Cashfree = await loadSdk();
  const cashfree = Cashfree({ mode: payment.mode === 'production' ? 'production' : 'sandbox' });

  const result = await cashfree.checkout({
    paymentSessionId: payment.paymentSessionId,
    redirectTarget: '_modal',
  });
  return result || {};
}
