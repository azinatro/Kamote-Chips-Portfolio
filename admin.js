(() => {
  const configured = Boolean(
    window.supabase?.createClient &&
    window.SUPABASE_URL?.startsWith('https://') &&
    window.SUPABASE_PUBLISHABLE_KEY &&
    !window.SUPABASE_PUBLISHABLE_KEY.startsWith('YOUR_')
  );
  const loginPanel = document.getElementById('loginPanel');
  const dashboard = document.getElementById('dashboard');
  const loginNotice = document.getElementById('loginNotice');
  const dashboardNotice = document.getElementById('dashboardNotice');
  const ordersBody = document.getElementById('ordersBody');
  if (!configured) {
    loginNotice.textContent = 'Add your Supabase project details to supabase-config.js and finish the SQL setup first.';
    return;
  }

  const client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_PUBLISHABLE_KEY);
  let orderChannel;
  const statuses = ['needs_review', 'paid', 'preparing', 'ready', 'cancelled'];
  const statusLabels = { needs_review: 'Needs review', paid: 'Paid', preparing: 'Preparing', ready: 'Ready', cancelled: 'Cancelled' };

  function showDashboard(show) {
    loginPanel.hidden = show;
    dashboard.hidden = !show;
  }

  async function loadOrders() {
    dashboardNotice.textContent = 'Loading orders…';
    const { data, error } = await client.from('orders')
      .select('id,tracking_code,created_at,customer_name,contact,flavor,size,quantity,total_amount,notes,receipt_path,status')
      .order('created_at', { ascending: false });
    if (error) {
      dashboardNotice.textContent = 'Could not load orders. Check the admin email in your Supabase SQL setup.';
      console.error(error);
      return;
    }
    dashboardNotice.textContent = `${data.length} preorder${data.length === 1 ? '' : 's'}`;
    ordersBody.replaceChildren();
    if (!data.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 7;
      cell.className = 'empty-row';
      cell.textContent = 'No preorders yet.';
      row.append(cell);
      ordersBody.append(row);
      return;
    }
    for (const order of data) {
      const row = document.createElement('tr');
      const date = document.createElement('td');
      date.textContent = new Date(order.created_at).toLocaleString();
      const buyer = document.createElement('td');
      const buyerName = document.createElement('strong');
      buyerName.textContent = order.customer_name;
      const contact = document.createElement('span');
      contact.className = 'order-notes';
      contact.textContent = order.contact;
      buyer.append(buyerName, contact);
      const detail = document.createElement('td');
      detail.textContent = `${order.flavor} · ${order.size} × ${order.quantity}`;
      if (order.notes) {
        const note = document.createElement('span');
        note.className = 'order-notes';
        note.textContent = order.notes;
        detail.append(note);
      }
      const total = document.createElement('td');
      total.textContent = `₱${order.total_amount}`;
      const code = document.createElement('td');
      code.textContent = order.tracking_code;
      const receiptCell = document.createElement('td');
      const receiptLink = document.createElement('a');
      receiptLink.href = '#';
      receiptLink.textContent = 'Open receipt';
      receiptLink.addEventListener('click', async (event) => {
        event.preventDefault();
        const { data: signed, error: fileError } = await client.storage.from('order-receipts').createSignedUrl(order.receipt_path, 120);
        if (fileError) {
          dashboardNotice.textContent = 'Could not open this receipt.';
          return;
        }
        window.open(signed.signedUrl, '_blank', 'noopener');
      });
      receiptCell.append(receiptLink);
      const statusCell = document.createElement('td');
      const statusSelect = document.createElement('select');
      statusSelect.setAttribute('aria-label', `Status for ${order.customer_name}`);
      for (const status of statuses) {
        const option = document.createElement('option');
        option.value = status;
        option.textContent = statusLabels[status];
        option.selected = status === order.status;
        statusSelect.append(option);
      }
      statusSelect.addEventListener('change', async () => {
        statusSelect.disabled = true;
        const { error: updateError } = await client.from('orders').update({ status: statusSelect.value }).eq('id', order.id);
        statusSelect.disabled = false;
        if (updateError) {
          dashboardNotice.textContent = 'Could not update this order. Please refresh and try again.';
          console.error(updateError);
        } else {
          dashboardNotice.textContent = 'Order status updated.';
        }
      });
      statusCell.append(statusSelect);
      row.append(date, buyer, detail, total, code, receiptCell, statusCell);
      ordersBody.append(row);
    }
  }

  function startLiveAlerts() {
    if (orderChannel) client.removeChannel(orderChannel);
    orderChannel = client.channel('kamote-order-alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        loadOrders();
        dashboardNotice.textContent = `New preorder received: ${payload.new.customer_name}`;
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('New Kamote Chips preorder', { body: `${payload.new.customer_name} placed an order.` });
        }
      })
      .subscribe();
  }

  document.getElementById('loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    loginNotice.textContent = 'Signing in…';
    const { error } = await client.auth.signInWithPassword({
      email: document.getElementById('adminEmail').value.trim(),
      password: document.getElementById('adminPassword').value
    });
    if (error) {
      loginNotice.textContent = 'Sign-in failed. Check your email and password.';
      return;
    }
    showDashboard(true);
    await loadOrders();
    startLiveAlerts();
  });

  document.getElementById('refreshOrders').addEventListener('click', loadOrders);
  document.getElementById('signOut').addEventListener('click', async () => {
    await client.auth.signOut();
    if (orderChannel) client.removeChannel(orderChannel);
    showDashboard(false);
    loginNotice.textContent = '';
  });
  document.getElementById('enableNotifications').addEventListener('click', async () => {
    if (!('Notification' in window)) {
      dashboardNotice.textContent = 'This browser does not support desktop notifications.';
      return;
    }
    const permission = await Notification.requestPermission();
    dashboardNotice.textContent = permission === 'granted'
      ? 'Alerts enabled while this admin page is open.'
      : 'Notifications are off. New orders will still appear on this page.';
  });

  client.auth.getSession().then(({ data }) => {
    if (data.session) {
      showDashboard(true);
      loadOrders().then(startLiveAlerts);
    }
  });
})();
