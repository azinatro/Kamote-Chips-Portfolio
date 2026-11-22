(() => {
  const form = document.getElementById('orderForm');
  const confirmation = document.getElementById('confirmation');
  const confirmationTitle = document.getElementById('confirmationTitle');
  const confirmationText = document.getElementById('confirmationText');
  const trackingResult = document.getElementById('trackingResult');
  const trackingCodeElement = document.getElementById('trackingCode');
  const sizeInput = document.getElementById('size');
  const quantityInput = document.getElementById('quantity');
  const totalPrice = document.getElementById('totalPrice');
  const submitButton = document.getElementById('submitOrder');
  const priceForSize = { Small: 15, Medium: 30, Large: 50 };
  const clientReady = Boolean(
    window.supabase?.createClient &&
    window.SUPABASE_URL?.startsWith('https://') &&
    window.SUPABASE_PUBLISHABLE_KEY &&
    !window.SUPABASE_PUBLISHABLE_KEY.startsWith('YOUR_')
  );
  const client = clientReady
    ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_PUBLISHABLE_KEY)
    : null;

  function selectedSize() {
    return Number(sizeInput.value) === 15 ? 'Small' : Number(sizeInput.value) === 30 ? 'Medium' : 'Large';
  }

  function updateTotal() {
    const quantity = Number(quantityInput.value) || 1;
    totalPrice.textContent = `₱${Number(sizeInput.value) * quantity}`;
  }

  function showMessage(text, success = false) {
    confirmationTitle.textContent = success ? 'Preorder received!' : 'We couldn’t save your preorder.';
    confirmationText.textContent = text;
    trackingResult.hidden = !success;
    confirmation.classList.add('show');
    confirmation.classList.toggle('success', success);
    confirmation.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  sizeInput.addEventListener('change', updateTotal);
  quantityInput.addEventListener('input', updateTotal);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!client) {
      showMessage('The order system is not connected yet. Finish the Supabase setup in SETUP-Supabase.md, then try again.');
      return;
    }

    const data = new FormData(form);
    const receipt = data.get('receipt');
    const quantity = Number(data.get('quantity'));
    const size = selectedSize();
    const unitPrice = priceForSize[size];
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
    if (!receipt || !allowedTypes.includes(receipt.type)) {
      showMessage('Please attach a JPG, PNG, WebP, HEIC, or PDF payment receipt.');
      return;
    }
    if (receipt.size > 5 * 1024 * 1024) {
      showMessage('The receipt file must be smaller than 5 MB.');
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      showMessage('Enter a whole number of packs.');
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Sending preorder…';
    confirmation.classList.remove('show');
    const extension = receipt.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const receiptPath = `${crypto.randomUUID()}.${extension}`;
    const trackingCode = crypto.randomUUID();

    try {
      const { error: uploadError } = await client.storage
        .from('order-receipts')
        .upload(receiptPath, receipt, { contentType: receipt.type, upsert: false });
      if (uploadError) throw uploadError;

      const { error: orderError } = await client.from('orders').insert({
        customer_name: data.get('customer').trim(),
        contact: data.get('contact').trim(),
        flavor: data.get('flavor'),
        size,
        quantity,
        notes: data.get('notes').trim() || null,
        receipt_path: receiptPath,
        tracking_code: trackingCode,
        status: 'needs_review'
      });
      if (orderError) {
        await client.storage.from('order-receipts').remove([receiptPath]);
        throw orderError;
      }

      form.reset();
      updateTotal();
      trackingCodeElement.textContent = trackingCode;
      trackingResult.hidden = false;
      showMessage('We’ll review your GCash payment. Save this code to check your order status later.', true);
    } catch (error) {
      console.error('Order submission failed:', error);
      const isLocalPreview = ['localhost', '127.0.0.1'].includes(window.location.hostname);
      showMessage(isLocalPreview && error?.message
        ? `Local preview error: ${error.message}`
        : 'We couldn’t save your preorder. Please check your connection and try again. If this keeps happening, contact us directly.');
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = 'Submit preorder&nbsp; ↗';
    }
  });

  document.getElementById('copyTrackingCode').addEventListener('click', async () => {
    const button = document.getElementById('copyTrackingCode');
    try {
      await navigator.clipboard.writeText(trackingCodeElement.textContent);
      button.textContent = 'Copied!';
    } catch {
      button.textContent = 'Select and copy the code';
    }
  });

  document.getElementById('year').textContent = new Date().getFullYear();
  updateTotal();
})();
