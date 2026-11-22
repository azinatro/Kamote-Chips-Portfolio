(() => {
  const form = document.getElementById('trackForm');
  const input = document.getElementById('trackingInput');
  const button = document.getElementById('trackButton');
  const errorBox = document.getElementById('trackError');
  const resultBox = document.getElementById('trackResult');
  const statusTitle = document.getElementById('statusTitle');
  const statusDescription = document.getElementById('statusDescription');
  const orderMeta = document.getElementById('orderMeta');
  const configured = Boolean(
    window.supabase?.createClient &&
    window.SUPABASE_URL?.startsWith('https://') &&
    window.SUPABASE_PUBLISHABLE_KEY &&
    !window.SUPABASE_PUBLISHABLE_KEY.startsWith('YOUR_')
  );
  const client = configured
    ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_PUBLISHABLE_KEY)
    : null;
  const statusCopy = {
    needs_review: ['Payment being checked', 'We received your order and are checking the GCash payment.'],
    paid: ['Payment confirmed', 'Your payment is confirmed. Your order is in the queue.'],
    preparing: ['Preparing your order', 'We’re making your kamote chips now.'],
    ready: ['Ready for pickup or delivery', 'Your order is ready. Please check your messages for handoff details.'],
    cancelled: ['Order cancelled', 'This preorder was cancelled. Contact the shop if you have questions.']
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.textContent = '';
    resultBox.classList.remove('show');
    const code = input.value.trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(code)) {
      errorBox.textContent = 'That code doesn’t look right. Paste the full tracking code from your confirmation.';
      return;
    }
    if (!client) {
      errorBox.textContent = 'The order tracking system is not connected yet.';
      return;
    }
    button.disabled = true;
    button.textContent = 'Checking…';
    try {
      const { data, error } = await client.rpc('get_preorder_status', { p_tracking_code: code });
      if (error) throw error;
      const order = Array.isArray(data) ? data[0] : null;
      if (!order) {
        errorBox.textContent = 'We couldn’t find an order with that code. Check it and try again.';
        return;
      }
      const [title, description] = statusCopy[order.status] || ['Order update', 'Check back later for an update.'];
      statusTitle.textContent = title;
      statusDescription.textContent = description;
      orderMeta.textContent = `${order.flavor} · ${order.size} × ${order.quantity} · Total ₱${order.total_amount} · Placed ${new Date(order.created_at).toLocaleDateString()}`;
      resultBox.classList.add('show');
    } catch (error) {
      console.error('Status lookup failed:', error);
      errorBox.textContent = 'We couldn’t check the status right now. Please try again in a moment.';
    } finally {
      button.disabled = false;
      button.textContent = 'Check status';
    }
  });
})();
