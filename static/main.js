// ==========================================
// Vehicle Service Tracking - JavaScript
// Simple functions for the website
// ==========================================

// --- Close dropdown when clicking outside ---
document.addEventListener('click', function(e) {
    var dropdowns = document.querySelectorAll('.nav-dropdown.open');
    dropdowns.forEach(function(d) {
        if (!d.contains(e.target)) {
            d.classList.remove('open');
        }
    });
});


// --- OPEN A POPUP (modal) ---
// We call this when clicking "Add Record" or "Update Status"
function openModal(modalId) {
    var modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');  // show the popup
    }
}

// --- CLOSE A POPUP (modal) ---
function closeModal(modalId) {
    var modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');  // hide the popup
    }
}

// Close popup when clicking outside of it
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
    }
});

// Close popup when pressing Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        var modals = document.querySelectorAll('.modal-overlay.active');
        for (var i = 0; i < modals.length; i++) {
            modals[i].classList.remove('active');
        }
    }
});


// --- OPEN THE UPDATE STATUS POPUP ---
// This fills in the record ID and current status before showing the popup
function openUpdateModal(recordId, currentStatus) {
    document.getElementById('updateRecordId').value = recordId;
    document.getElementById('updateStatusSelect').value = currentStatus;
    openModal('updateStatusModal');
}


// --- OPEN THE EDIT RECORD POPUP ---
// Reads data attributes from the clicked button and fills the edit form
function openEditModal(button) {
    document.getElementById('editRecordId').value = button.dataset.id;
    document.getElementById('editVehicleName').value = button.dataset.vehicle;
    document.getElementById('editLicensePlate').value = button.dataset.plate;
    document.getElementById('editServiceType').value = button.dataset.service;
    document.getElementById('editStatus').value = button.dataset.status;
    document.getElementById('editCustomerName').value = button.dataset.customer;
    document.getElementById('editCustomerPhone').value = button.dataset.phone;
    document.getElementById('editEstimatedCompletion').value = button.dataset.completion;
    document.getElementById('editNotes').value = button.dataset.notes;
    openModal('editRecordModal');
}


// --- OPEN THE DELETE CONFIRMATION POPUP ---
// Shows the vehicle info and asks for confirmation
function openDeleteModal(button) {
    document.getElementById('deleteRecordId').value = button.dataset.id;
    document.getElementById('deleteRecordInfo').textContent =
        button.dataset.vehicle + ' (' + button.dataset.plate + ')';
    openModal('deleteRecordModal');
}


// --- AUTO-DISMISS FLASH MESSAGES ---
// Flash messages fade out after 4 seconds
document.addEventListener('DOMContentLoaded', function() {
    var alerts = document.querySelectorAll('.alert');
    for (var i = 0; i < alerts.length; i++) {
        (function(alert) {
            setTimeout(function() {
                alert.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                alert.style.opacity = '0';
                alert.style.transform = 'translateY(-10px)';
                setTimeout(function() {
                    alert.style.display = 'none';
                }, 500);
            }, 4000);
        })(alerts[i]);
    }
});


// --- SORT TABLE COLUMNS ---
// Click a column header to sort ascending/descending
function sortTable(columnIndex, type, headerElement) {
    var table = document.querySelector('.table-container table');
    if (!table) return;

    var tbody = table.querySelector('tbody');
    var rows = Array.prototype.slice.call(tbody.querySelectorAll('.record-row'));
    if (rows.length === 0) return;

    // Determine sort direction (toggle between asc and desc)
    var currentDir = headerElement.getAttribute('data-sort-dir') || 'none';
    var newDir = (currentDir === 'asc') ? 'desc' : 'asc';

    // Reset all sort arrows
    var allHeaders = document.querySelectorAll('th.sortable');
    for (var i = 0; i < allHeaders.length; i++) {
        allHeaders[i].setAttribute('data-sort-dir', 'none');
        var arrow = allHeaders[i].querySelector('.sort-arrow');
        if (arrow) arrow.textContent = '';
    }

    // Set current header
    headerElement.setAttribute('data-sort-dir', newDir);
    var arrow = headerElement.querySelector('.sort-arrow');
    if (arrow) arrow.textContent = (newDir === 'asc') ? ' ▲' : ' ▼';

    // Sort rows
    rows.sort(function(a, b) {
        var aText = a.cells[columnIndex].textContent.trim();
        var bText = b.cells[columnIndex].textContent.trim();

        if (type === 'date') {
            // Handle empty dates (—)
            var aDate = (aText === '—' || aText === '') ? 0 : new Date(aText).getTime();
            var bDate = (bText === '—' || bText === '') ? 0 : new Date(bText).getTime();
            return (newDir === 'asc') ? aDate - bDate : bDate - aDate;
        } else {
            // Text sort
            aText = aText.toLowerCase();
            bText = bText.toLowerCase();
            if (aText < bText) return (newDir === 'asc') ? -1 : 1;
            if (aText > bText) return (newDir === 'asc') ? 1 : -1;
            return 0;
        }
    });

    // Re-append sorted rows
    for (var i = 0; i < rows.length; i++) {
        tbody.appendChild(rows[i]);
    }
}


// --- FILTER TABLE ROWS ---
// When clicking "All", "In Progress", "Pending", or "Completed" buttons
function filterRecords(status, clickedButton) {
    // Highlight the clicked button
    var buttons = document.querySelectorAll('.filter-btn');
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].classList.remove('active');
    }
    if (clickedButton) {
        clickedButton.classList.add('active');
    }

    // Show/hide table rows based on status
    var rows = document.querySelectorAll('.record-row');
    for (var i = 0; i < rows.length; i++) {
        if (status === 'all' || rows[i].getAttribute('data-status') === status) {
            rows[i].style.display = '';  // show
        } else {
            rows[i].style.display = 'none';  // hide
        }
    }
}
