const OPEN_SHIFT_KEY = "openShiftRequests";
const SWAP_SHIFT_KEY = "swapShiftRequests";

let hospitalSchedules = [];

function getShiftRequests(key) {
    return JSON.parse(localStorage.getItem(key)) || [];
}

function saveShiftRequests(key, requests) {
    localStorage.setItem(key, JSON.stringify(requests));
}

function safeText(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function getShiftStaffName(staffID) {
    const member = staffMembers.find(person => person.id === staffID);
    return member ? member.name : staffID;
}

async function loadHospitalSchedules() {
    try {
        const response = await fetch("schedule.html");

        if (!response.ok) {
            throw new Error("Could not load schedule.html");
        }

        const html = await response.text();
        const parser = new DOMParser();
        const documentCopy = parser.parseFromString(html, "text/html");

        const rows = documentCopy.querySelectorAll(
            "#scheduleBody tr[data-staff-id]"
        );

        hospitalSchedules = Array.from(rows).map((row, index) => ({
            id: `${row.dataset.staffId}_${row.dataset.date}_${row.dataset.shift}_${index}`,
            staffID: row.dataset.staffId,
            date: row.dataset.date,
            shift: row.dataset.shift,
            shiftTime: row.cells[4]?.textContent.trim() || "",
            status: row.querySelector("[data-status-cell]")?.textContent.trim() || "Scheduled"
        }));

        populateShiftForms();
        displayMyShiftRequests();

    } catch (error) {
        console.error(error);

        document.getElementById("openMessage").textContent =
            "Unable to load the schedule. Please open this project using VS Code Live Server.";
    }
}

function showShiftTab(tab) {
    document.getElementById("openSection").classList.toggle(
        "hidden", tab !== "open"
    );

    document.getElementById("swapSection").classList.toggle(
        "hidden", tab !== "swap"
    );

    document.getElementById("openTab").classList.toggle(
        "active", tab === "open"
    );

    document.getElementById("swapTab").classList.toggle(
        "active", tab === "swap"
    );
}

function populateShiftForms() {
    const eligibleStaff = staffMembers.filter(
        person => !person.id.startsWith("HR")
    );

    const staffOptions = eligibleStaff.map(person =>
        `<option value="${safeText(person.id)}">
            ${safeText(person.id)} - ${safeText(person.name)}
        </option>`
    ).join("");

    document.getElementById("openStaff").innerHTML =
        '<option value="">Select your name</option>' + staffOptions;

    document.getElementById("swapStaff").innerHTML =
        '<option value="">Select your name</option>' + staffOptions;

    document.getElementById("targetStaff").innerHTML =
        '<option value="">Select another staff member</option>' + staffOptions;

    updateShiftDropdowns();
}

function getStaffSchedules(staffID) {
    return hospitalSchedules.filter(schedule =>
        schedule.staffID === staffID &&
        schedule.status.toLowerCase() === "scheduled"
    );
}

function fillShiftDropdown(selectID, staffID) {
    const select = document.getElementById(selectID);

    if (!staffID) {
        select.innerHTML = '<option value="">Select a staff member first</option>';
        return;
    }

    const schedules = getStaffSchedules(staffID);

    select.innerHTML = '<option value="">Select a schedule</option>';

    schedules.forEach(schedule => {
        const option = document.createElement("option");
        option.value = schedule.id;
        option.textContent =
            `${schedule.date} - ${schedule.shift} (${schedule.shiftTime})`;

        select.appendChild(option);
    });

    if (schedules.length === 0) {
        select.innerHTML = '<option value="">No scheduled shifts available</option>';
    }
}

function updateShiftDropdowns() {
    fillShiftDropdown(
        "openSchedule",
        document.getElementById("openStaff").value
    );

    fillShiftDropdown(
        "mySchedule",
        document.getElementById("swapStaff").value
    );

    fillShiftDropdown(
        "targetSchedule",
        document.getElementById("targetStaff").value
    );
}

function hasPendingOpenRequest(scheduleID) {
    return getShiftRequests(OPEN_SHIFT_KEY).some(request =>
        request.scheduleID === scheduleID &&
        request.status === "Pending"
    );
}

document.getElementById("openForm").addEventListener("submit", function(event) {
    event.preventDefault();

    const staffID = document.getElementById("openStaff").value;
    const scheduleID = document.getElementById("openSchedule").value;
    const reason = document.getElementById("openReason").value.trim();

    const selectedSchedule = hospitalSchedules.find(
        schedule => schedule.id === scheduleID
    );

    if (!selectedSchedule || selectedSchedule.staffID !== staffID) {
        document.getElementById("openMessage").textContent =
            "Please select a valid schedule.";
        return;
    }

    if (hasPendingOpenRequest(scheduleID)) {
        document.getElementById("openMessage").textContent =
            "This shift already has a pending Open Shift request.";
        return;
    }

    const requests = getShiftRequests(OPEN_SHIFT_KEY);

    requests.push({
        id: Date.now(),
        type: "Open Shift",
        scheduleID: selectedSchedule.id,
        staffID: staffID,
        date: selectedSchedule.date,
        shift: selectedSchedule.shift,
        shiftTime: selectedSchedule.shiftTime,
        reason: reason,
        status: "Pending"
    });

    saveShiftRequests(OPEN_SHIFT_KEY, requests);

    document.getElementById("openMessage").textContent =
        "Your Open Shift request has been submitted for HR approval.";

    this.reset();
    updateShiftDropdowns();
    displayMyShiftRequests();
});

document.getElementById("swapForm").addEventListener("submit", function(event) {
    event.preventDefault();

    const staffID = document.getElementById("swapStaff").value;
    const ownScheduleID = document.getElementById("mySchedule").value;
    const targetID = document.getElementById("targetStaff").value;
    const targetScheduleID = document.getElementById("targetSchedule").value;
    const reason = document.getElementById("swapReason").value.trim();

    const ownSchedule = hospitalSchedules.find(
        schedule => schedule.id === ownScheduleID
    );

    const targetSchedule = hospitalSchedules.find(
        schedule => schedule.id === targetScheduleID
    );

    if (!ownSchedule || !targetSchedule) {
        document.getElementById("swapMessage").textContent =
            "Please select both scheduled shifts.";
        return;
    }

    if (staffID === targetID) {
        document.getElementById("swapMessage").textContent =
            "Please select a different staff member.";
        return;
    }

    if (
        ownSchedule.staffID !== staffID ||
        targetSchedule.staffID !== targetID
    ) {
        document.getElementById("swapMessage").textContent =
            "The selected schedules do not match the selected staff members.";
        return;
    }

    const requests = getShiftRequests(SWAP_SHIFT_KEY);

    const duplicate = requests.some(request =>
        request.ownScheduleID === ownScheduleID &&
        request.targetScheduleID === targetScheduleID &&
        request.status === "Pending"
    );

    if (duplicate) {
        document.getElementById("swapMessage").textContent =
            "This swap request is already pending.";
        return;
    }

    requests.push({
        id: Date.now(),
        type: "Swap Shift",
        staffID: staffID,
        targetID: targetID,
        ownScheduleID: ownScheduleID,
        targetScheduleID: targetScheduleID,
        ownDate: ownSchedule.date,
        ownShift: ownSchedule.shift,
        targetDate: targetSchedule.date,
        targetShift: targetSchedule.shift,
        reason: reason,
        status: "Pending"
    });

    saveShiftRequests(SWAP_SHIFT_KEY, requests);

    document.getElementById("swapMessage").textContent =
        "Your Swap Shift request has been submitted for HR approval.";

    this.reset();
    updateShiftDropdowns();
    displayMyShiftRequests();
});

function displayMyShiftRequests() {
    const container = document.getElementById("myShiftRequests");

    if (!container) return;

    const openRequests = getShiftRequests(OPEN_SHIFT_KEY);
    const swapRequests = getShiftRequests(SWAP_SHIFT_KEY);

    const allRequests = [
        ...openRequests,
        ...swapRequests
    ].sort((a, b) => b.id - a.id);

    if (allRequests.length === 0) {
        container.innerHTML = "<p>No requests submitted yet.</p>";
        return;
    }

    container.innerHTML = allRequests.map(request => {
        const statusClass = request.status === "Approved"
            ? "request-approved"
            : request.status === "Rejected"
                ? "request-rejected"
                : "request-pending";

        let details = "";

        if (request.type === "Open Shift") {
            details = `
                <p>Staff: ${safeText(getShiftStaffName(request.staffID))}</p>
                <p>Date: ${safeText(request.date)}</p>
                <p>Shift: ${safeText(request.shift)}</p>
            `;
        } else {
            details = `
                <p>Requesting Staff: ${safeText(getShiftStaffName(request.staffID))}</p>
                <p>Other Staff: ${safeText(getShiftStaffName(request.targetID))}</p>
                <p>Your Shift: ${safeText(request.ownDate)} - ${safeText(request.ownShift)}</p>
                <p>Their Shift: ${safeText(request.targetDate)} - ${safeText(request.targetShift)}</p>
            `;
        }

        return `
            <div class="shift-request-item">
                <h3>${safeText(request.type)}</h3>
                ${details}
                <p>Reason: ${safeText(request.reason)}</p>
                <p>Status:
                    <span class="${statusClass}">
                        ${safeText(request.status)}
                    </span>
                </p>
            </div>
        `;
    }).join("");
}

window.addEventListener("storage", function(event) {
    if (
        event.key === OPEN_SHIFT_KEY ||
        event.key === SWAP_SHIFT_KEY
    ) {
        displayMyShiftRequests();
    }
});

document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("openStaff").addEventListener(
        "change", updateShiftDropdowns
    );

    document.getElementById("swapStaff").addEventListener(
        "change", updateShiftDropdowns
    );

    document.getElementById("targetStaff").addEventListener(
        "change", updateShiftDropdowns
    );

    loadHospitalSchedules();
});
