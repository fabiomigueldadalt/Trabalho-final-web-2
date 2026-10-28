const express = require("express");
const pool = require("../config/database");
const { autenticar, apenasAdmin } = require("../middlewares/auth");

const router = express.Router();
router.use(autenticar);

router.get("/", async (_req, res) => {
  try {
    const [dados] = await pool.query(`
      SELECT c.*,
             COUNT(p.id) AS total_pets
      FROM clientes c
      LEFT JOIN pets p ON p.cliente_id = c.id
      GROUP BY c.id
      ORDER BY c.nome
    `);
    res.json(dados);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ mensagem: "Erro ao listar clientes." });
  }
});

router.post("/", async (req, res) => {
  try {
    const { nome, telefone, email, endereco, cidade } = req.body;

    if (!nome || !telefone) {
      return res.status(400).json({ mensagem: "Nome e telefone são obrigatórios." });
    }

    const [resultado] = await pool.query(
      `INSERT INTO clientes (nome, telefone, email, endereco, cidade)
       VALUES (?, ?, ?, ?, ?)`,
      [nome, telefone, email || null, endereco || null, cidade || null]
    );

    res.status(201).json({ id: resultado.insertId, mensagem: "Cliente cadastrado." });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ mensagem: "Erro ao cadastrar cliente." });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { nome, telefone, email, endereco, cidade } = req.body;
    const [resultado] = await pool.query(
      `UPDATE clientes SET nome=?, telefone=?, email=?, endereco=?, cidade=?
       WHERE id=?`,
      [nome, telefone, email || null, endereco || null, cidade || null, req.params.id]
    );

    if (!resultado.affectedRows) {
      return res.status(404).json({ mensagem: "Cliente não encontrado." });
    }

    res.json({ mensagem: "Cliente atualizado." });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ mensagem: "Erro ao atualizar cliente." });
  }
});

router.delete("/:id", apenasAdmin, async (req, res) => {
  try {
    const [resultado] = await pool.query("DELETE FROM clientes WHERE id=?", [req.params.id]);

    if (!resultado.affectedRows) {
      return res.status(404).json({ mensagem: "Cliente não encontrado." });
    }

    res.json({ mensagem: "Cliente excluído." });
  } catch {
    res.status(409).json({ mensagem: "Este cliente possui pets vinculados." });
  }
});

module.exports = router;
