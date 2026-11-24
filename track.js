(() => {
  const form = document.getElementById('trackForm');
  const recoveryForm = document.getElementById('recoveryForm');
  const input = document.getElementById('trackingInput');
  const button = document.getElementById('trackButton');
  const errorBox = document.getElementById('trackError');
  const resultBox = document.getElementById('trackResult');
  const statusTitle = document.getElementById('statusTitle');
  const statusDescription = document.getElementById('statusDescription');
  const orderMeta = document.getElementById('orderMeta');
  const recoveryButton = document.getElementById('recoveryButton');
  const recoveryError = document.getElementById('recoveryError');
  const recoveryResult = document.getElementById('recoveryResult');
  const recoveryCode = document.getElementById('recoveryCode');
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
    delivered: ['Order delivered', 'Your order has been delivered. Thank you for ordering with us!'],
    picked_up: ['Order picked up', 'Your order has been picked up. Thank you for ordering with us!'],
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

  recoveryForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    recoveryError.textContent = '';
    recoveryResult.classList.remove('show');
    if (!client) {
      recoveryError.textContent = 'The order system is not connected yet.';
      return;
    }

    const name = document.getElementById('recoveryName').value.trim();
    const contact = document.getElementById('recoveryContact').value.trim();
    if (!name || !contact) {
      recoveryError.textContent = 'Enter the name and phone number from your preorder.';
      return;
    }

    recoveryButton.disabled = true;
    recoveryButton.textContent = 'Creating new code…';
    try {
      const { data, error } = await client.rpc('recover_preorder_tracking_code', {
        p_customer_name: name,
        p_contact: contact
      });
      if (error) throw error;
      const code = typeof data === 'string' ? data : Array.isArray(data) ? data[0] : null;
      if (!code) {
        recoveryError.textContent = 'We couldn’t find a preorder matching that name and phone number. Check the details or contact the shop through its official page.';
        return;
      }
      recoveryCode.textContent = code;
      recoveryResult.classList.add('show');
    } catch (error) {
      console.error('Tracking code recovery failed:', error);
      recoveryError.textContent = 'We couldn’t create a new code right now. Please try again or contact the shop through its official page.';
    } finally {
      recoveryButton.disabled = false;
      recoveryButton.textContent = 'Create a new tracking code';
    }
  });
})();
