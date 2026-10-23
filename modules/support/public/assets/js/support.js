// Progressive enhancement only. Every control this file touches already
// works without it: reordering is a pair of form buttons, selection is a
// set of checkboxes in a form, and both post to the same endpoints drag
// and drop uses.
(function () {
  'use strict';

  var list = document.querySelector('[data-support-list]');
  if (!list) return;

  var bulk = document.querySelector('[data-support-bulk]');
  var countLabel = bulk ? bulk.querySelector('[data-support-bulk-count]') : null;

  function selected() {
    return list.querySelectorAll('input[name="ticket_ids[]"]:checked');
  }

  function syncBulk() {
    if (!bulk) return;
    var count = selected().length;
    bulk.hidden = count === 0;
    if (countLabel) {
      countLabel.textContent = count === 1 ? '1 selected' : count + ' selected';
    }
    Array.prototype.forEach.call(list.querySelectorAll('tr[data-ticket-id]'), function (row) {
      var box = row.querySelector('input[name="ticket_ids[]"]');
      row.classList.toggle('is-selected', !!(box && box.checked));
    });
  }

  list.addEventListener('change', function (event) {
    if (event.target.name === 'ticket_ids[]') syncBulk();
  });
  syncBulk();

  // Drag to reorder. Only rendered for agents allowed to rerank, so the
  // absence of draggable rows is the permission check.
  var dragging = null;

  list.addEventListener('dragstart', function (event) {
    var row = event.target.closest('tr[draggable="true"]');
    if (!row) return;
    dragging = row;
    row.classList.add('is-dragging');
    try {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', row.dataset.ticketId);
    } catch (error) {
      // Safari refuses setData outside a user gesture in some versions.
    }
  });

  list.addEventListener('dragover', function (event) {
    if (!dragging) return;
    var row = event.target.closest('tr[data-ticket-id]');
    if (!row || row === dragging) return;
    event.preventDefault();
    clearDropMarks();
    row.classList.add('is-dropbefore');
  });

  list.addEventListener('drop', function (event) {
    if (!dragging) return;
    var row = event.target.closest('tr[data-ticket-id]');
    if (!row || row === dragging) return;
    event.preventDefault();
    submitMove(dragging.dataset.ticketId, row.dataset.priority, row.dataset.ticketId);
  });

  list.addEventListener('dragend', function () {
    if (dragging) dragging.classList.remove('is-dragging');
    clearDropMarks();
    dragging = null;
  });

  function clearDropMarks() {
    Array.prototype.forEach.call(list.querySelectorAll('.is-dropbefore'), function (row) {
      row.classList.remove('is-dropbefore');
    });
  }

  // Reuse the no-JS form so the server sees one kind of request.
  function submitMove(ticketId, priority, beforeId) {
    var form = document.querySelector('[data-support-move-form]');
    if (!form) return;
    form.querySelector('[name="ticket_id"]').value = ticketId;
    form.querySelector('[name="priority"]').value = priority;
    form.querySelector('[name="before_id"]').value = beforeId;
    form.submit();
  }
})();
