
const staffMembers = [
    { id: "DOC001", name: "Ryza", position: "Doctor" },
    { id: "NUR001", name: "Susej", position: "Nurse" },
    { id: "NUR002", name: "Angel", position: "Nurse" },
    { id: "NUR003", name: "Eugene", position: "Nurse" },
    { id: "DOC002", name: "Carlo", position: "Doctor" },
    { id: "HR001", name: "Lisa", position: "HR" },
    { id: "HR002", name: "Cedric", position: "HR" },
    { id: "DOC003", name: "Sandy", position: "Doctor" },
    { id: "DOC004", name: "Alyanna", position: "Doctor" }
];

function getData(key) {
    try {
        return JSON.parse(localStorage.getItem(key)) || [];
    } catch (error) {
        return [];
    }
}

function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function getToday() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function normalizeShift(shift) {
    const value = String(shift || "").trim().toLowerCase();

    if (value === "midnight" || value === "night") {
        return "night";
    }

    return value;
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[character]));
}

function getStaff(staffID) {
    return staffMembers.find(staff => staff.id === staffID);
}

function normalizeAccount(account) {
    const value = String(account || "").trim().toLowerCase();

    if (value === "hr") return "HR";
    if (value === "admin" || value === "administrator") return "Admin";
    if (value === "nurse") return "Nurse";
    if (value === "doctor") return "Doctor";

    return "";
}

function loginUser(event) {
    event.preventDefault();

    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const accountInput = document.getElementById("account");
    const message = document.getElementById("message");

    const username = usernameInput ? usernameInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value.trim() : "";
    const account = normalizeAccount(accountInput ? accountInput.value : "");

    if (!username || !password || !account) {
        if (message) {
            message.textContent = "Please enter your username, password, and select a valid account type.";
            message.style.color = "#dc2626";
        }
        return;
    }
    sessionStorage.clear();
    sessionStorage.setItem("loggedIn", "true");
    sessionStorage.setItem("username", username);
    sessionStorage.setItem("account", account);

    if (message) {
        message.textContent = "Login successful! Welcome, " + account + ".";
        message.style.color = "#059669";
    }

    setTimeout(() => {
        window.location.href = "schedule.html";
    }, 800);
}

function logoutUser() {
    sessionStorage.removeItem("loggedIn");
    sessionStorage.removeItem("username");
    sessionStorage.removeItem("account");

    window.location.href = "index.html";
}

function updateNavigation() {
    const loggedIn = sessionStorage.getItem("loggedIn");
    const loginLink = document.getElementById("loginLink");
    const logoutBtn = document.getElementById("logoutBtn");

    if (loginLink) {
        loginLink.style.display =
            loggedIn === "true" ? "none" : "inline-block";
    }

    if (logoutBtn) {
        logoutBtn.style.display =
            loggedIn === "true" ? "inline-block" : "none";
    }
}

function initializeStaffPage() {
    const form = document.getElementById("leaveForm");

    if (!form) return;

    const dateInput = document.getElementById("requestDate");

    if (dateInput) {
        dateInput.min = getToday();
    }

    form.addEventListener("submit", function(event) {
        event.preventDefault();

        const staffID = document.getElementById("requestStaff").value;
        const reason = document.getElementById("requestReason").value.trim();
        const leaveDate = document.getElementById("requestDate").value;
        const shift = document.getElementById("requestShift").value;

        const staff = getStaff(staffID);

        if (!staff || !reason || !leaveDate || !shift) {
            alert("Please complete all leave request fields.");
            return;
        }

        if (leaveDate < getToday()) {
            alert("Please select today or a future date.");
            return;
        }

        const requests = getData("leaveRequests");

        const duplicate = requests.some(request =>
            request.staffID === staffID &&
            request.leaveDate === leaveDate &&
            normalizeShift(request.shift) === normalizeShift(shift) &&
            request.status !== "Rejected"
        );

        if (duplicate) {
            alert("A request already exists for this staff member, date, and shift.");
            return;
        }

        requests.push({
            id: Date.now(),
            staffID: staff.id,
            staffName: staff.name,
            position: staff.position,
            reason: reason,
            leaveDate: leaveDate,
            shift: shift,
            status: "Pending"
        });

        saveData("leaveRequests", requests);

        form.reset();

        if (dateInput) {
            dateInput.min = getToday();
        }

        displayMyRequests();
        updateStaffStatuses();

        alert("Your leave request has been submitted. Status: Waiting for Approval.");
    });

    displayMyRequests();
    updateStaffStatuses();
}

function displayMyRequests() {
    const container = document.getElementById("myRequests");

    if (!container) return;

    const requests = getData("leaveRequests");

    if (requests.length === 0) {
        container.innerHTML = "<p>No leave requests submitted yet.</p>";
        return;
    }

    container.innerHTML = requests.map(request => {

        const statusText = request.status === "Pending"
            ? "Waiting for Approval"
            : request.status === "Approved"
                ? "Request Approved"
                : "Request Rejected";

        return `
            <div class="request-card">

                <h3>
                    ${escapeHTML(request.staffName)}
                    (${escapeHTML(request.staffID)})
                </h3>

                <p><b>Date:</b> ${escapeHTML(request.leaveDate)}</p>

                <p><b>Shift:</b> ${escapeHTML(request.shift)}</p>

                <p><b>Reason:</b> ${escapeHTML(request.reason)}</p>

                <p><b>Status:</b>
                    <span class="status-${escapeHTML(String(request.status || "Pending").toLowerCase())}">
                        ${statusText}
                    </span>
                </p>

                <button class="delete-request"
                    type="button"
                    onclick="deleteLeaveRequest(${Number(request.id)})"
                    aria-label="Delete leave request">×</button>

            </div>
        `;
    }).join("");
}


function initializeApprovalPage() {
    if (!checkApprovalAccess()) return;
    displayApprovalRequests();
}

function displayApprovalRequests() {
    const container = document.getElementById("approvalRequests");

    if (!container) return;

    const requests = getData("leaveRequests");

    if (requests.length === 0) {
        container.innerHTML = "<p>No leave requests submitted yet.</p>";
        return;
    }

    container.innerHTML = requests.map(request => {

        let statusText = "Waiting for Approval";

        if (request.status === "Approved") {
            statusText = "Request Approved";
        } else if (request.status === "Rejected") {
            statusText = "Request Rejected";
        }

        let buttons = "";

        if (request.status === "Pending") {
            buttons = `
                <button class="approve-btn"
                    onclick="decideRequest(${Number(request.id)}, 'Approved')">
                    Approve
                </button>

                <button class="reject-btn"
                    onclick="decideRequest(${Number(request.id)}, 'Rejected')">
                    Reject
                </button>
            `;
        }

        return `
            <div class="request-card">

                <h3>${escapeHTML(request.staffName)}
                    (${escapeHTML(request.staffID)})</h3>

                <p><b>Position:</b> ${escapeHTML(request.position)}</p>

                <p><b>Reason for Leave:</b>
                    ${escapeHTML(request.reason)}</p>

                <p><b>Leave Date:</b>
                    ${escapeHTML(request.leaveDate)}</p>

                <p><b>Shift:</b> ${escapeHTML(request.shift)}</p>

                <p><b>Status:</b>
                    <strong>${statusText}</strong>
                </p>

                ${buttons}

            </div>
        `;
    }).join("");
}

function decideRequest(requestID, decision) {

    if (!checkApprovalAccess()) return;

    if (decision !== "Approved" && decision !== "Rejected") {
        return;
    }

    const requests = getData("leaveRequests");

    const request = requests.find(item =>
        Number(item.id) === Number(requestID)
    );

    if (!request || request.status !== "Pending") {
        alert("This request has already been processed.");
        return;
    }

    request.status = decision;

    saveData("leaveRequests", requests);

    displayApprovalRequests();
    displayMyRequests();
    updateStaffStatuses();
    displayUpdatedSchedule();

    alert(decision === "Approved"
        ? "Leave request approved!"
        : "Leave request rejected!");
}

let pendingReplacement = null;

const replacementMap = {
    "NUR001": "NUR002",
    "NUR002": "NUR003",
    "NUR003": "NUR001",
    "DOC001": "DOC004",
    "DOC003": "DOC001",
    "DOC004": "DOC003"
};

function initializeReplacementPage() {

    const dateInput = document.getElementById("replacementDate");

    if (dateInput) {
        dateInput.min = getToday();

        if (!dateInput.value) {
            dateInput.value = getToday();
        }
    }
}

function isStaffUnavailable(staffID, date, shift) {

    const requests = getData("leaveRequests");
    const absences = getData("shiftAbsences");

    const approvedLeave = requests.some(request =>
        request.staffID === staffID &&
        request.status === "Approved" &&
        request.leaveDate === date &&
        normalizeShift(request.shift) === normalizeShift(shift)
    );

    const sickAbsence = absences.some(absence =>
        absence.staffID === staffID &&
        absence.date === date &&
        normalizeShift(absence.shift) === normalizeShift(shift)
    );

    const alreadyReplacing = getData("shiftReplacements").some(item =>
        item.replacementID === staffID &&
        item.date === date &&
        normalizeShift(item.shift) === normalizeShift(shift)
    );

    return approvedLeave || sickAbsence || alreadyReplacing;
}

function findReplacement() {

    const staffID = document.getElementById("staff").value;
    const reason = document.getElementById("reason").value;
    const shift = document.getElementById("shift").value;
    const date = document.getElementById("replacementDate").value;
    const result = document.getElementById("result");

    const staff = getStaff(staffID);

    if (!staff || !date) {
        result.innerHTML = "<p>Please complete all fields.</p>";
        return;
    }

    if (date < getToday()) {
        result.innerHTML = "<p>Please select today or a future date.</p>";
        return;
    }

    if (reason === "Leave Request") {

        const requests = getData("leaveRequests");

        let request = requests.find(item =>
            item.staffID === staffID &&
            item.leaveDate === date &&
            normalizeShift(item.shift) === normalizeShift(shift)
        );

        if (!request) {

            request = {
                id: Date.now(),
                staffID: staff.id,
                staffName: staff.name,
                position: staff.position,
                reason: "Leave Request",
                leaveDate: date,
                shift: shift,
                status: "Pending"
            };

            requests.push(request);
            saveData("leaveRequests", requests);

            displayApprovalRequests();

            result.innerHTML = `
                <h3>Leave Request Submitted!</h3>
                <p><b>Staff:</b> ${escapeHTML(staff.name)}</p>
                <p><b>Reason:</b> Leave Request</p>
                <p><b>Date:</b> ${escapeHTML(date)}</p>
                <p><b>Shift:</b> ${escapeHTML(shift)}</p>
                <p><b>Status:</b> Waiting for Approval</p>
            `;

            return;
        }

        if (request.status === "Pending") {

            result.innerHTML = `
                <h3>Waiting for Approval</h3>
                <p>Your leave request has been submitted.</p>
                <p>Please wait for the HR/Admin decision.</p>
            `;

            return;
        }

        if (request.status === "Rejected") {

            result.innerHTML = `
                <h3>Request Rejected</h3>
                <p>Your leave request was rejected.</p>
                <p>You cannot proceed with shift replacement.</p>
            `;

            return;
        }
    }

    const candidates = staffMembers.filter(candidate =>
        candidate.id !== staffID &&
        candidate.position === staff.position &&
        !isStaffUnavailable(candidate.id, date, shift)
    );

    if (candidates.length === 0) {

        result.innerHTML = `
            <h3>No Available Replacement</h3>
            <p>There are no available staff members for this shift.</p>
        `;

        return;
    }

    pendingReplacement = {
        staffID: staffID,
        staffName: staff.name,
        reason: reason,
        date: date,
        shift: shift,
        requestID: reason === "Leave Request"
            ? getData("leaveRequests").find(item =>
                item.staffID === staffID &&
                item.leaveDate === date &&
                normalizeShift(item.shift) === normalizeShift(shift) &&
                item.status === "Approved"
            )?.id
            : null
    };

    result.innerHTML = `
        <h3>Request Approved!</h3>

        <p><b>Staff on Leave:</b> ${escapeHTML(staff.name)}</p>
        <p><b>Reason:</b> ${escapeHTML(reason)}</p>
        <p><b>Date:</b> ${escapeHTML(date)}</p>
        <p><b>Shift:</b> ${escapeHTML(shift)}</p>

        <h3>Available Replacement Staff</h3>

        <p>Select a staff member to take this shift.</p>

        ${candidates.map(candidate => `
            <div class="request-card">
                <h4>${escapeHTML(candidate.name)}</h4>
                <p><b>Staff ID:</b> ${escapeHTML(candidate.id)}</p>
                <p><b>Position:</b> ${escapeHTML(candidate.position)}</p>

                <button onclick="selectReplacement('${candidate.id}')">
                    Select This Staff
                </button>
            </div>
        `).join("")}
    `;
}

function selectReplacement(replacementID) {

    if (!pendingReplacement) {
        alert("Please find an approved request first.");
        return;
    }

    const candidate = getStaff(replacementID);

    if (!candidate) {
        alert("Staff member not found.");
        return;
    }

    const data = pendingReplacement;

    if (isStaffUnavailable(candidate.id, data.date, data.shift)) {
        alert("This staff member is no longer available.");
        findReplacement();
        return;
    }

    pendingReplacement.replacementID = candidate.id;
    pendingReplacement.replacementName = candidate.name;

    document.getElementById("result").innerHTML = `
        <h3>Replacement Selected!</h3>

        <p><b>Staff on Leave:</b>
            ${escapeHTML(data.staffName)}</p>

        <p><b>Replacement:</b>
            ${escapeHTML(candidate.name)}</p>

        <p><b>Date:</b> ${escapeHTML(data.date)}</p>

        <p><b>Shift:</b> ${escapeHTML(data.shift)}</p>

        <button onclick="confirmReplacement()">
            Confirm Replacement
        </button>
    `;
}

function confirmReplacement() {

    if (!pendingReplacement) {
        alert("Please find a replacement first.");
        return;
    }

    const data = pendingReplacement;

    if (data.reason === "Leave Request") {

        const stillApproved = getData("leaveRequests").some(request =>
            Number(request.id) === Number(data.requestID) &&
            request.staffID === data.staffID &&
            request.status === "Approved" &&
            request.leaveDate === data.date &&
            normalizeShift(request.shift) === normalizeShift(data.shift)
        );

        if (!stillApproved) {
            alert("The leave request is no longer approved.");
            pendingReplacement = null;
            return;
        }
    }

    if (isStaffUnavailable(data.replacementID, data.date, data.shift)) {
        alert("The recommended replacement is no longer available.");
        pendingReplacement = null;
        return;
    }

    const replacements = getData("shiftReplacements");

    const alreadyExists = replacements.some(item =>
        item.staffID === data.staffID &&
        item.date === data.date &&
        normalizeShift(item.shift) === normalizeShift(data.shift)
    );

    if (alreadyExists) {
        alert("A replacement has already been confirmed for this shift.");
        pendingReplacement = null;
        return;
    }

    if (data.reason === "Call in Sick") {

        const absences = getData("shiftAbsences");

        absences.push({
            staffID: data.staffID,
            date: data.date,
            shift: data.shift,
            reason: "Call in Sick"
        });

        saveData("shiftAbsences", absences);
    }

    replacements.push({
        staffID: data.staffID,
        staffName: data.staffName,
        replacementID: data.replacementID,
        replacementName: data.replacementName,
        date: data.date,
        shift: data.shift,
        reason: data.reason
    });

    saveData("shiftReplacements", replacements);

    const result = document.getElementById("result");

    if (result) {

        result.innerHTML = `
            <h3>Replacement Confirmed!</h3>

            <p>
                ${escapeHTML(data.replacementName)}
                will replace
                ${escapeHTML(data.staffName)}.
            </p>

            <p><b>Date:</b> ${escapeHTML(data.date)}</p>

            <p><b>Shift:</b> ${escapeHTML(data.shift)}</p>

            <p>The replacement information has been saved.</p>
        `;
    }

    pendingReplacement = null;

    updateStaffStatuses();
    displayUpdatedSchedule();
}

function updateStaffStatuses() {

    const leaveRequests = getData("leaveRequests");

    staffMembers.forEach(staff => {

        const statusCell = document.getElementById(`status-${staff.id}`);

        if (!statusCell) return;

        const approvedLeave = leaveRequests.some(request =>
            request.staffID === staff.id &&
            request.status === "Approved"
        );

        if (approvedLeave) {
            statusCell.textContent = "On Leave";
            statusCell.className = "staff-status on-leave";
        } else {
            statusCell.textContent = "Active";
            statusCell.className = "staff-status active";
        }
    });
}

function activateStaff(staffID) {

    const inactiveStaff = getData("inactiveStaff");

    saveData(
        "inactiveStaff",
        inactiveStaff.filter(id => id !== staffID)
    );

    updateStaffStatuses();
}

function displayUpdatedSchedule() {

    const scheduleBody = document.getElementById("scheduleBody");

    if (!scheduleBody) return;

    const rows = scheduleBody.querySelectorAll("tr");

    const leaveRequests = getData("leaveRequests");
    const absences = getData("shiftAbsences");
    const replacements = getData("shiftReplacements");

    rows.forEach(row => {

        const staffID = row.dataset.staffId;
        const date = row.dataset.date;
        const shift = row.dataset.shift;

        const statusCell = row.querySelector("[data-status-cell]");

        if (!statusCell) return;

        const approvedLeave = leaveRequests.some(request =>
            request.staffID === staffID &&
            request.leaveDate === date &&
            normalizeShift(request.shift) === normalizeShift(shift) &&
            request.status === "Approved"
        );

        const absent = absences.some(absence =>
            absence.staffID === staffID &&
            absence.date === date &&
            normalizeShift(absence.shift) === normalizeShift(shift)
        );

        const replacement = replacements.some(item =>
            item.staffID === staffID &&
            item.date === date &&
            normalizeShift(item.shift) === normalizeShift(shift)
        );

        if (approvedLeave) {
            statusCell.textContent = "On Leave";
            statusCell.className = "schedule-status on-leave";
        } else if (absent) {
            statusCell.textContent = "Absent";
            statusCell.className = "schedule-status absent";
        } else if (replacement) {
            statusCell.textContent = "Replacement Assigned";
            statusCell.className = "schedule-status replacement";
        } else {
            statusCell.textContent = "Scheduled";
            statusCell.className = "schedule-status scheduled";
        }
    });
}
document.addEventListener("DOMContentLoaded", function() {

    const currentPage = document.body.dataset.page || "";
    const isApprovalPage = currentPage === "approval" ||
        document.getElementById("approvalRequests");

    if (isApprovalPage && !checkApprovalAccess()) {
        return;
    }

    updateNavigation();
    updateApprovalLink();

   if (currentPage === "approval" || document.getElementById("approvalRequests")) {

    if (!checkApprovalAccess()) {
        return;
    }

    initializeApprovalPage();
}

    if (isApprovalPage) {
        initializeApprovalPage();
    }

    if (currentPage === "replacement" || document.getElementById("result")) {
        initializeReplacementPage();
    }

    if (currentPage === "staff" || document.getElementById("staffTable")) {
        updateStaffStatuses();
    }

    if (currentPage === "schedule" || document.getElementById("scheduleBody")) {
        displayUpdatedSchedule();
    }
});

window.addEventListener("storage", function(event) {
    if (["leaveRequests", "shiftAbsences", "shiftReplacements"].includes(event.key)) {
        displayApprovalRequests();
        displayMyRequests();
        updateStaffStatuses();
        displayUpdatedSchedule();
    }
});

function checkApprovalAccess() {
    const account = normalizeAccount(sessionStorage.getItem("account"));
    const loggedIn = sessionStorage.getItem("loggedIn") === "true";

    if (!loggedIn) {
        alert("Please log in first.");
        window.location.replace("login.html");
        return false;
    }

    if (account !== "HR" && account !== "Admin") {
        alert("Access Denied! Only HR and Admin can access the Approval page.");

        window.location.replace("schedule.html");

        return false;
    }

    return true;
}

function deleteLeaveRequest(requestID) {
    const confirmDelete = confirm("Are you sure you want to delete this leave request?");
    if (!confirmDelete) return;

    const leaveRequests = getData("leaveRequests");

    const updatedRequests = leaveRequests.filter(request =>
        Number(request.id) !== Number(requestID)
    );

    if (updatedRequests.length === leaveRequests.length) {
        alert("Leave request could not be found.");
        return;
    }

    saveData("leaveRequests", updatedRequests);

    displayMyRequests();
    displayApprovalRequests();
    updateStaffStatuses();
    displayUpdatedSchedule();

    alert("Leave request deleted successfully!");
}

function getApprovalShiftRequests(key) {
    return JSON.parse(localStorage.getItem(key)) || [];
}

function saveApprovalShiftRequests(key, requests) {
    localStorage.setItem(key, JSON.stringify(requests));
}

function approvalSafeText(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function approvalStaffName(staffID) {
    const staff = staffMembers.find(person => person.id === staffID);
    return staff ? staff.name : staffID;
}

function displayOpenShiftApprovals() {
    const container = document.getElementById("openShiftApprovalRequests");

    if (!container) return;

    const requests = getApprovalShiftRequests("openShiftRequests");

    if (requests.length === 0) {
        container.innerHTML = "<p>No open shift requests submitted yet.</p>";
        return;
    }

    container.innerHTML = requests.map(request => `
        <div class="approval-card">
            <h3>Open Shift Request</h3>

            <p><strong>Staff:</strong>
                ${approvalSafeText(approvalStaffName(request.staffID))}
            </p>

            <p><strong>Date:</strong>
                ${approvalSafeText(request.date)}
            </p>

            <p><strong>Shift:</strong>
                ${approvalSafeText(request.shift)}
            </p>

            <p><strong>Reason:</strong>
                ${approvalSafeText(request.reason)}
            </p>

            <p><strong>Status:</strong>
                ${approvalSafeText(request.status)}
            </p>

            ${request.status === "Pending" ? `
                <button class="approve-btn"
                    onclick="decideShiftApproval('open', ${Number(request.id)}, 'Approved')">
                    Approve
                </button>

                <button class="reject-btn"
                    onclick="decideShiftApproval('open', ${Number(request.id)}, 'Rejected')">
                    Reject
                </button>
            ` : ""}
        </div>
    `).join("");
}
function displaySwapShiftApprovals() {
    const container = document.getElementById("swapApprovalRequests");

    if (!container) return;

    const requests = getApprovalShiftRequests("swapShiftRequests");

    if (requests.length === 0) {
        container.innerHTML = "<p>No swap shift requests submitted yet.</p>";
        return;
    }

    container.innerHTML = requests.map(request => `
        <div class="approval-card">
            <h3>Swap Shift Request</h3>

            <p><strong>Requesting Staff:</strong>
                ${approvalSafeText(approvalStaffName(request.staffID))}
            </p>

            <p><strong>Other Staff:</strong>
                ${approvalSafeText(approvalStaffName(request.targetID))}
            </p>

            <p><strong>Requesting Staff Shift:</strong>
                ${approvalSafeText(request.ownDate)} -
                ${approvalSafeText(request.ownShift)}
            </p>

            <p><strong>Other Staff Shift:</strong>
                ${approvalSafeText(request.targetDate)} -
                ${approvalSafeText(request.targetShift)}
            </p>

            <p><strong>Reason:</strong>
                ${approvalSafeText(request.reason)}
            </p>

            <p><strong>Status:</strong>
                ${approvalSafeText(request.status)}
            </p>

            ${request.status === "Pending" ? `
                <button class="approve-btn"
                    onclick="decideShiftApproval('swap', ${Number(request.id)}, 'Approved')">
                    Approve
                </button>

                <button class="reject-btn"
                    onclick="decideShiftApproval('swap', ${Number(request.id)}, 'Rejected')">
                    Reject
                </button>
            ` : ""}
        </div>
    `).join("");
}


function decideShiftApproval(type, requestID, decision) {

  
    const account = normalizeAccount(sessionStorage.getItem("account"));

    if (
        sessionStorage.getItem("loggedIn") !== "true" ||
        (account !== "HR" && account !== "Admin")
    ) {
        alert("Access Denied! Only HR and Admin can approve requests.");
        return;
    }

    const key = type === "open"
        ? "openShiftRequests"
        : "swapShiftRequests";

    const requests = getApprovalShiftRequests(key);

    const request = requests.find(item =>
        Number(item.id) === Number(requestID)
    );

    if (!request) {
        alert("Request not found.");
        return;
    }

    if (request.status !== "Pending") {
        alert("This request has already been reviewed.");
        return;
    }

    const action = decision === "Approved" ? "approve" : "reject";

    if (!confirm(`Are you sure you want to ${action} this request?`)) {
        return;
    }

    request.status = decision;

    saveApprovalShiftRequests(key, requests);

    displayOpenShiftApprovals();
    displaySwapShiftApprovals();

    alert(`Request ${decision.toLowerCase()} successfully!`);
}


function displayAllShiftApprovals() {
    displayOpenShiftApprovals();
    displaySwapShiftApprovals();
}
