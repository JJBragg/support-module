// Progressive enhancement only. Every control this file touches already
// works without it: reordering is a pair of form buttons, selection is a
// set of checkboxes in a form, and both post to the same endpoints drag
// and drop uses.
(function () {
  'use strict';

  // Properties panel: submit on change, and drop the Apply buttons that
  // exist for people without JavaScript.
  Array.prototype.forEach.call(document.querySelectorAll('[data-support-noscript]'), function (el) {
    el.hidden = true;
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-support-autosubmit]'), function (field) {
    field.addEventListener('change', function () {
      field.form.submit();
    });
  });

  // Settings: copy the inbound endpoint. The field is readable and
  // selectable without this, so losing the clipboard API costs a
  // keystroke, not the feature.
  Array.prototype.forEach.call(document.querySelectorAll('[data-support-copy]'), function (button) {
    button.addEventListener('click', function () {
      var source = document.querySelector('[data-support-copy-source]');
      if (!source) return;

      var done = function () {
        var original = button.textContent;
        button.textContent = button.getAttribute('data-copied') || original;
        window.setTimeout(function () {
          button.textContent = original;
        }, 1600);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(source.value).then(done, function () {
          source.select();
        });
      } else {
        source.select();
      }
    });
  });

  // Board: drag a card to another column to change its status. Every card
  // also carries a Move to menu that posts to the same endpoint, so losing
  // this script costs the gesture and not the feature.
  var board = document.querySelector('[data-support-board]');
  if (board) {
    var card = null;
    var overColumn = null;

    var clearColumn = function () {
      if (overColumn) overColumn.classList.remove('is-over');
      overColumn = null;
    };

    // A card carries its own status as well, so the column is found by its
    // own class rather than by the attribute both of them have.
    var columnOf = function (event) {
      var column = event.target.closest ? event.target.closest('.pos-support-bcol') : null;
      if (!column || !card) return null;
      if (column.dataset.statusId === card.dataset.statusId) return null;
      return column;
    };

    board.addEventListener('dragstart', function (event) {
      var found = event.target.closest('.pos-support-bcard[draggable="true"]');
      if (!found) return;
      card = found;
      found.classList.add('is-dragging');
      try {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', found.dataset.ticketId);
      } catch (error) {
        // Safari refuses setData outside a user gesture in some versions.
      }
    });

    board.addEventListener('dragover', function (event) {
      var column = columnOf(event);
      if (!column) return;
      event.preventDefault();
      if (overColumn === column) return;
      clearColumn();
      overColumn = column;
      column.classList.add('is-over');
    });

    board.addEventListener('drop', function (event) {
      var column = columnOf(event);
      if (!column) return;
      event.preventDefault();
      var form = document.querySelector('[data-support-board-move-form]');
      if (!form) return;
      form.querySelector('[name="ticket_id"]').value = card.dataset.ticketId;
      form.querySelector('[name="status_id"]').value = column.dataset.statusId;
      form.submit();
    });

    board.addEventListener('dragend', function () {
      if (card) card.classList.remove('is-dragging');
      clearColumn();
      card = null;
    });
  }

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
      // Wording comes from the translation file, with %count% as the slot,
      // so this never builds a sentence out of English word order.
      var one = countLabel.getAttribute('data-one');
      var other = countLabel.getAttribute('data-other') || '%count%';
      countLabel.textContent = count === 1 ? one : other.replace('%count%', count);
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
