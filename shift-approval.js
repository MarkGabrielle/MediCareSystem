const OPEN_SHIFT_KEY = "openShiftRequests";
const SWAP_SHIFT_KEY = "swapShiftRequests";

function getShiftApprovalData(key) {
    try {
        return JSON.parse(localStorage.getItem(key)) || [];
    } catch (error) {
        return [];
    }
}

function saveShiftApprovalData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function shiftApprovalText(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function shiftApprovalStaffName(staffID) {
    const staff = staffMembers.find(person => person.id === staffID);
    return staff ? staff.name : staffID;
}


function checkApprovalAccess() {
    const loggedIn = sessionStorage.getItem("loggedIn") === "true";
    const account = (sessionStorage.getItem("account") || "")
        .trim()
        .toLowerCase();

    if (!loggedIn) {
        alert("Please log in first.");
        window.location.replace("login.html");
        return false;
    }

    if (account !== "hr" && account !== "admin") {
        alert("Access Denied! Only HR and Admin can access the Approval page.");
        window.location.replace("schedule.html");
        return false;
    }

    return true;
}


function displayOpenShiftApprovals() {
    const container = document.getElementById("openShiftApprovalRequests");

    if (!container) return;

    const requests = getShiftApprovalData(OPEN_SHIFT_KEY);

    if (requests.length === 0) {
        container.innerHTML = "<p>No open shift requests submitted yet.</p>";
        return;
    }

    container.innerHTML = requests
        .sort((a, b) => Number(b.id) - Number(a.id))
        .map(request => {
            const buttons = request.status === "Pending" ? `
                <button class="approve-btn"
                    onclick="decideShiftRequest('open', ${Number(request.id)}, 'Approved')">
                    Approve
                </button>

                <button class="reject-btn"
                    onclick="decideShiftRequest('open', ${Number(request.id)}, 'Rejected')">
                    Reject
                </button>
            ` : "";

            return `
                <div class="approval-card">

                    <h3>Open Shift Request</h3>

                    <p><strong>Staff:</strong>
                        ${shiftApprovalText(shiftApprovalStaffName(request.staffID))}
                    </p>

                    <p><strong>Staff ID:</strong>
                        ${shiftApprovalText(request.staffID)}
                    </p>

                    <p><strong>Date:</strong>
                        ${shiftApprovalText(request.date)}
                    </p>

                    <p><strong>Shift:</strong>
                        ${shiftApprovalText(request.shift)}
                    </p>

                    <p><strong>Shift Time:</strong>
                        ${shiftApprovalText(request.shiftTime || "Not specified")}
                    </p>

                    <p><strong>Reason:</strong>
                        ${shiftApprovalText(request.reason)}
                    </p>

                    <p><strong>Status:</strong>
                        <span class="status-${shiftApprovalText(request.status.toLowerCase())}">
                            ${shiftApprovalText(request.status)}
                        </span>
                    </p>

                    ${buttons}

                </div>
            `;
        }).join("");
}



function displaySwapShiftApprovals() {
    const container = document.getElementById("swapApprovalRequests");

    if (!container) return;

    const requests = getShiftApprovalData(SWAP_SHIFT_KEY);

    if (requests.length === 0) {
        container.innerHTML = "<p>No swap shift requests submitted yet.</p>";
        return;
    }

    container.innerHTML = requests
        .sort((a, b) => Number(b.id) - Number(a.id))
        .map(request => {
            const buttons = request.status === "Pending" ? `
                <button class="approve-btn"
                    onclick="decideShiftRequest('swap', ${Number(request.id)}, 'Approved')">
                    Approve
                </button>

                <button class="reject-btn"
                    onclick="decideShiftRequest('swap', ${Number(request.id)}, 'Rejected')">
                    Reject
                </button>
            ` : "";

            return `
                <div class="approval-card">

                    <h3>Swap Shift Request</h3>

                    <p><strong>Requesting Staff:</strong>
                        ${shiftApprovalText(shiftApprovalStaffName(request.staffID))}
                    </p>

                    <p><strong>Other Staff:</strong>
                        ${shiftApprovalText(shiftApprovalStaffName(request.targetID))}
                    </p>

                    <p><strong>Requesting Staff Shift:</strong>
                        ${shiftApprovalText(request.ownDate)}
                        - ${shiftApprovalText(request.ownShift)}
                    </p>

                    <p><strong>Other Staff Shift:</strong>
                        ${shiftApprovalText(request.targetDate)}
                        - ${shiftApprovalText(request.targetShift)}
                    </p>

                    <p><strong>Reason:</strong>
                        ${shiftApprovalText(request.reason)}
                    </p>

                    <p><strong>Status:</strong>
                        <span class="status-${shiftApprovalText(request.status.toLowerCase())}">
                            ${shiftApprovalText(request.status)}
                        </span>
                    </p>

                    ${buttons}

                </div>
            `;
        }).join("");
}



function decideShiftRequest(type, requestID, decision) {
    if (!checkApprovalAccess()) return;

    if (decision !== "Approved" && decision !== "Rejected") return;

    const key = type === "open"
        ? OPEN_SHIFT_KEY
        : SWAP_SHIFT_KEY;

    const requests = getShiftApprovalData(key);

    const request = requests.find(item =>
        Number(item.id) === Number(requestID)
    );

    if (!request) {
        alert("Request not found.");
        return;
    }

    if (request.status !== "Pending") {
        alert("This request has already been processed.");
        return;
    }

    if (type === "swap" && decision === "Approved") {
        if (request.ownScheduleID === request.targetScheduleID) {
            alert("The two selected schedules are the same. This request cannot be approved.");
            return;
        }

        const openRequests = getShiftApprovalData(OPEN_SHIFT_KEY);

        const shiftAlreadyOpened = openRequests.some(item =>
            item.status === "Approved" &&
            (
                item.scheduleID === request.ownScheduleID ||
                item.scheduleID === request.targetScheduleID
            )
        );

        if (shiftAlreadyOpened) {
            alert("One of these shifts has already been approved as an Open Shift. Please review the requests.");
            return;
        }
    }

    const action = decision === "Approved" ? "approve" : "reject";

    if (!confirm(`Are you sure you want to ${action} this request?`)) {
        return;
    }

    request.status = decision;

    saveShiftApprovalData(key, requests);

    displayOpenShiftApprovals();
    displaySwapShiftApprovals();

    alert(
        type === "open"
            ? `Open Shift request ${decision.toLowerCase()} successfully!`
            : `Swap Shift request ${decision.toLowerCase()} successfully!`
    );
}


function updateApprovedShiftChanges() {
    const scheduleBody = document.getElementById("scheduleBody");

    if (!scheduleBody) return;

   
    const rows = Array.from(
        scheduleBody.querySelectorAll("tr[data-staff-id]")
    ).filter(row => !row.classList.contains("generated-replacement-row"));

    const scheduleMap = new Map();

    
    rows.forEach((row, index) => {
        if (!row.dataset.baseStaffId) {
            row.dataset.baseStaffId = row.dataset.staffId;
            row.dataset.baseName = row.cells[0]?.textContent.trim() || "";
            row.dataset.baseDate = row.dataset.date;
            row.dataset.baseShift = row.dataset.shift;
        }

        row.dataset.currentStaffId = row.dataset.baseStaffId;
        row.dataset.currentName = row.dataset.baseName;

        const scheduleID =
            `${row.dataset.baseStaffId}_${row.dataset.baseDate}_${row.dataset.baseShift}_${index}`;

        scheduleMap.set(scheduleID, row);

        if (row.cells[0]) {
            row.cells[0].textContent = row.dataset.baseName;
        }

        row.dataset.staffId = row.dataset.baseStaffId;
    });


    
    const swapRequests = getShiftApprovalData(SWAP_SHIFT_KEY);

    swapRequests
        .filter(request => request.status === "Approved")
        .sort((a, b) => Number(a.id) - Number(b.id))
        .forEach(request => {
            const firstRow = scheduleMap.get(request.ownScheduleID);
            const secondRow = scheduleMap.get(request.targetScheduleID);

            if (!firstRow || !secondRow || firstRow === secondRow) return;

            const firstID = firstRow.dataset.currentStaffId;
            const firstName = firstRow.dataset.currentName;

            const secondID = secondRow.dataset.currentStaffId;
            const secondName = secondRow.dataset.currentName;

            firstRow.dataset.currentStaffId = secondID;
            firstRow.dataset.currentName = secondName;

            secondRow.dataset.currentStaffId = firstID;
            secondRow.dataset.currentName = firstName;

            firstRow.dataset.staffId = secondID;
            secondRow.dataset.staffId = firstID;

            if (firstRow.cells[0]) {
                firstRow.cells[0].textContent = secondName;
            }

            if (secondRow.cells[0]) {
                secondRow.cells[0].textContent = firstName;
            }

            const firstStatus = firstRow.querySelector("[data-status-cell]");
            const secondStatus = secondRow.querySelector("[data-status-cell]");

            if (firstStatus) firstStatus.textContent = "Swapped Shift";
            if (secondStatus) secondStatus.textContent = "Swapped Shift";
        });


    const openRequests = getShiftApprovalData(OPEN_SHIFT_KEY);

    openRequests
        .filter(request => request.status === "Approved")
        .forEach(request => {
            const row = scheduleMap.get(request.scheduleID);

            if (!row) return;

            if (row.cells[0]) {
                row.cells[0].textContent = "OPEN SHIFT (Available)";
            }

            const statusCell = row.querySelector("[data-status-cell]");

            if (statusCell) {
                statusCell.textContent = "Available - Open Shift";
            }

            row.classList.add("open-shift-available");
        });
}




document.addEventListener("DOMContentLoaded", function() {

    const currentPage = document.body.dataset.page;

    if (currentPage === "approval") {

        if (!checkApprovalAccess()) return;

        if (typeof displayApprovalRequests === "function") {
            displayApprovalRequests();
        }

        displayOpenShiftApprovals();
        displaySwapShiftApprovals();
    }

    if (currentPage === "schedule") {
        updateApprovedShiftChanges();
    }

});




window.addEventListener("storage", function(event) {

    if (
        event.key === OPEN_SHIFT_KEY ||
        event.key === SWAP_SHIFT_KEY
    ) {
        displayOpenShiftApprovals();
        displaySwapShiftApprovals();
        updateApprovedShiftChanges();
    }

});
