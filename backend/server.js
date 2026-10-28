const path = require("path");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./config/database");
const prepararUsuarios = require("./utils/bootstrap");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/clientes", require("./routes/Alunos"));
app.use("/api/pets", require("./routes/Turmas"));
app.use("/api/veterinarios", require("./routes/Professores"));
app.use("/api/consultas", require("./routes/Aulas"));
app.use("/api/dashboard", require("./routes/dashboard"));

const frontend = path.join(__dirname, "..", "frontend");
app.use(express.static(frontend));

app.get("*", (_req, res) => {
  res.sendFile(path.join(frontend, "index.html"));
});

const porta = Number(process.env.PORT || 3000);

async function iniciar() {
  try {
    await pool.query("SELECT 1");
    console.log("[OK] Banco de dados conectado.");
    await prepararUsuarios();

    app.listen(porta, () => {
      console.log(`[OK] PetCare Modern: http://localhost:${porta}`);
    });
  } catch (erro) {
    console.error("[ERRO] Não foi possível iniciar o sistema:");
    console.error(erro.message);
    console.error("Confira o MySQL, o banco e o arquivo .env.");
  }
}

iniciar();
