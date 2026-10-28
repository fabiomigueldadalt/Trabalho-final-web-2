const bcrypt = require("bcryptjs");
const pool = require("../config/database");

async function prepararUsuarios() {
  const [tabelas] = await pool.query(
    "SHOW TABLES LIKE 'usuarios'"
  );

  if (!tabelas.length) return;

  const [usuarios] = await pool.query(
    "SELECT id FROM usuarios LIMIT 1"
  );

  if (!usuarios.length) {
    const senha = await bcrypt.hash("123456", 10);
    await pool.query(
      `INSERT INTO usuarios (nome, email, senha, perfil)
       VALUES (?, ?, ?, ?)`,
      ["Administrador", "admin@petcare.com", senha, "Administrador"]
    );

    const senhaRecepcao = await bcrypt.hash("123456", 10);
    await pool.query(
      `INSERT INTO usuarios (nome, email, senha, perfil)
       VALUES (?, ?, ?, ?)`,
      ["Recepção", "recepcao@petcare.com", senhaRecepcao, "Recepcionista"]
    );

    console.log("[OK] Usuários iniciais criados.");
  }
}

module.exports = prepararUsuarios;
