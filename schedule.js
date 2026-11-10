
document.addEventListener("DOMContentLoaded", function () {

    const scheduleBody = document.getElementById("scheduleBody");
    if (!scheduleBody) return;

    const searchInput = document.getElementById("scheduleSearch");
    const shiftFilter = document.getElementById("shiftFilter");
    const departmentFilter = document.getElementById("departmentFilter");

    function updateSchedule() {
        const rows = scheduleBody.querySelectorAll("tr");

        let total = 0;
        let morning = 0;
        let afternoon = 0;
        let midnight = 0;

        rows.forEach(row => {
            const cells = row.querySelectorAll("td");
            if (cells.length < 6) return;

            const name = cells[0].textContent.toLowerCase();
            const department = cells[2].textContent.trim();
            const shift = row.dataset.shift;

            const search = searchInput.value.toLowerCase();

            total++;

            if (shift === "Morning") morning++;
            else if (shift === "Afternoon") afternoon++;
            else if (shift === "Night") midnight++;

            const matchesSearch = name.includes(search);

            const matchesShift =
                shiftFilter.value === "all" ||
                shift === shiftFilter.value;

            const matchesDepartment =
                departmentFilter.value === "all" ||
                department === departmentFilter.value;

            row.style.display =
                matchesSearch && matchesShift && matchesDepartment
                    ? ""
                    : "none";
        });

        document.getElementById("totalSchedules").textContent = total;
        document.getElementById("morningCount").textContent = morning;
        document.getElementById("afternoonCount").textContent = afternoon;
        document.getElementById("midnightCount").textContent = midnight;
    }

    searchInput.addEventListener("input", updateSchedule);
    shiftFilter.addEventListener("change", updateSchedule);
    departmentFilter.addEventListener("change", updateSchedule);

    updateSchedule();

});
