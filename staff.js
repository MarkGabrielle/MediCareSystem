
document.addEventListener("DOMContentLoaded", function () {

    const search = document.getElementById("staffSearch");
    const department = document.getElementById("staffDepartmentFilter");
    const table = document.getElementById("staffTable");

    if (!search || !department || !table) return;

    function filterStaff() {
        const rows = table.querySelectorAll("tbody tr");

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            const selectedDepartment = row.cells[3].textContent.trim();

            const matchesSearch = text.includes(search.value.toLowerCase());

            const matchesDepartment =
                department.value === "all" ||
                selectedDepartment === department.value;

            row.style.display =
                matchesSearch && matchesDepartment ? "" : "none";
        });
    }

    search.addEventListener("input", filterStaff);
    department.addEventListener("change", filterStaff);

});
