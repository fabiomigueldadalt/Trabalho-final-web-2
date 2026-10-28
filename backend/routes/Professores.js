const express = require("express");
const pool = require("../config/database");
const { autenticar, apenasAdmin } = require("../middlewares/auth");

const router = express.Router();
router.use(autenticar);

router.get("/", async (_req, res) => {
  try {
    const [dados] = await pool.query(`
      SELECT v.*, COUNT(c.id) AS total_consultas
      FROM veterinarios v
      LEFT JOIN consultas c ON c.veterinario_id = v.id
      GROUP BY v.id
      ORDER BY v.nome
    `);
    res.json(dados);
  } catch {
    res.status(500).json({ mensagem: "Erro ao listar veterinários." });
  }
});

router.post("/", async (req, res) => {
  try {
    const { nome, crmv, especialidade, telefone, email } = req.body;

    if (!nome || !crmv) {
      return res.status(400).json({ mensagem: "Nome e CRMV são obrigatórios." });
    }

    const [resultado] = await pool.query(
      `INSERT INTO veterinarios (nome, crmv, especialidade, telefone, email)
       VALUES (?, ?, ?, ?, ?)`,
      [nome, crmv, especialidade || null, telefone || null, email || null]
    );

    res.status(201).json({ id: resultado.insertId, mensagem: "Veterinário cadastrado." });
  } catch (erro) {
    if (erro.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ mensagem: "Este CRMV já está cadastrado." });
    }
    res.status(500).json({ mensagem: "Erro ao cadastrar veterinário." });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { nome, crmv, especialidade, telefone, email } = req.body;

    const [resultado] = await pool.query(
      `UPDATE veterinarios
       SET nome=?, crmv=?, especialidade=?, telefone=?, email=?
       WHERE id=?`,
      [nome, crmv, especialidade || null, telefone || null, email || null, req.params.id]
    );

    if (!resultado.affectedRows) {
      return res.status(404).json({ mensagem: "Veterinário não encontrado." });
    }

    res.json({ mensagem: "Veterinário atualizado." });
  } catch {
    res.status(500).json({ mensagem: "Erro ao atualizar veterinário." });
  }
});

router.delete("/:id", apenasAdmin, async (req, res) => {
  try {
    const [resultado] = await pool.query("DELETE FROM veterinarios WHERE id=?", [req.params.id]);

    if (!resultado.affectedRows) {
      return res.status(404).json({ mensagem: "Veterinário não encontrado." });
    }

    res.json({ mensagem: "Veterinário excluído." });
  } catch {
    res.status(409).json({ mensagem: "Este veterinário possui consultas vinculadas." });
  }
});

module.exports = router;
