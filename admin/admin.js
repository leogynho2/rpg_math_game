document.addEventListener("DOMContentLoaded", () => {
    const loginSection = document.getElementById("login-section");
    const dashboardSection = document.getElementById("dashboard-section");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const loginButton = document.getElementById("login-button");
    const loginMessage = document.getElementById("login-message");
    const rankingButton = document.getElementById("ranking-button");
    const exportCsvButton = document.getElementById("export-csv-button");
    const rankingData = document.getElementById("ranking-data");
    const rankingTableBody = document.querySelector("#ranking-table tbody");

    let token = localStorage.getItem("professorToken");

    if (token) {
        showDashboard();
    }

    loginButton.addEventListener("click", async () => {
        const username = usernameInput.value;
        const password = passwordInput.value;

        try {
            const response = await fetch("/api/prof/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                token = data.token;
                localStorage.setItem("professorToken", token);
                showDashboard();
            } else {
                loginMessage.textContent = data.message || "Erro de login.";
            }
        } catch (error) {
            console.error("Erro ao tentar fazer login:", error);
            loginMessage.textContent = "Erro de conexão.";
        }
    });

    rankingButton.addEventListener("click", async () => {
        try {
            const response = await fetch("/api/prof/ranking", {
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const players = await response.json();
                rankingTableBody.innerHTML = "";
                players.forEach(player => {
                    const row = rankingTableBody.insertRow();
                    row.insertCell().textContent = player.name;
                    row.insertCell().textContent = player.level;
                    row.insertCell().textContent = player.exp;
                    row.insertCell().textContent = player.wins;
                    row.insertCell().textContent = player.losses;
                });
                rankingData.classList.remove("hidden");
            } else {
                console.error("Erro ao buscar ranking:", response.statusText);
            }
        } catch (error) {
            console.error("Erro ao buscar ranking:", error);
        }
    });

    exportCsvButton.addEventListener("click", async () => {
        try {
            const response = await fetch("/api/prof/export.csv", {
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
            });

            if (response.ok) {
                // In a real scenario, this would trigger a file download
                alert("Exportação CSV iniciada! (Verifique o console do servidor para detalhes)");
            } else {
                console.error("Erro ao exportar CSV:", response.statusText);
            }
        } catch (error) {
            console.error("Erro ao exportar CSV:", error);
        }
    });

    function showDashboard() {
        loginSection.classList.add("hidden");
        dashboardSection.classList.remove("hidden");
    }
});


