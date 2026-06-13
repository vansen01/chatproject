const chatRoot = document.querySelector('[data-chat]');

if (chatRoot) {
  const currentUserId = Number(chatRoot.dataset.userId);
  const companionId = chatRoot.dataset.companionId;
  const list = chatRoot.querySelector('[data-messages]');
  const form = chatRoot.querySelector('[data-message-form]');
  const textarea = form.querySelector('textarea');

  const formatDate = (value) =>
    new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value));

  const escapeHtml = (value) =>
    value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');

  const renderMessages = (messages) => {
    if (!messages.length) {
      list.innerHTML = '<div class="empty-state" data-empty>История переписки пуста.</div>';
      return;
    }

    list.innerHTML = messages
      .map((message) => {
        const ownClass = message.sender_id === currentUserId ? 'message-own' : 'message-other';
        return `
          <article class="message ${ownClass}">
            <p>${escapeHtml(message.body)}</p>
            <time datetime="${escapeHtml(message.created_at)}">${formatDate(message.created_at)}</time>
          </article>
        `;
      })
      .join('');

    list.scrollTop = list.scrollHeight;
  };

  const loadMessages = async () => {
    const response = await fetch(`/api/chat/${companionId}/messages`, {
      headers: { Accept: 'application/json' }
    });

    if (!response.ok) {
      return;
    }

    const data = await response.json();
    renderMessages(data.messages);
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const body = textarea.value.trim();
    if (!body) {
      return;
    }

    const response = await fetch(form.action, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ body })
    });

    if (!response.ok) {
      form.submit();
      return;
    }

    const data = await response.json();
    textarea.value = '';
    renderMessages(data.messages);
  });

  list.scrollTop = list.scrollHeight;
  window.setInterval(loadMessages, 5000);
}
