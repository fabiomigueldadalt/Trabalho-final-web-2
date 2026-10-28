const express = require("express");
const pool = require("../config/database");
const { autenticar, apenasAdmin } = require("../middlewares/auth");

const router = express.Router();
router.use(autenticar);

router.get("/", async (_req, res) => {
  try {
    const [dados] = await pool.query(`
      SELECT co.*, p.nome AS pet_nome, p.especie,
             c.nome AS cliente_nome, v.nome AS veterinario_nome
      FROM consultas co
      INNER JOIN pets p ON p.id = co.pet_id
      INNER JOIN clientes c ON c.id = p.cliente_id
      INNER JOIN veterinarios v ON v.id = co.veterinario_id
      ORDER BY co.data_consulta DESC, co.horario DESC
    `);
    res.json(dados);
  } catch {
    res.status(500).json({ mensagem: "Erro ao listar consultas." });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      pet_id, veterinario_id, data_consulta, horario,
      motivo, status, observacoes
    } = req.body;

    if (!pet_id || !veterinario_id || !data_consulta || !horario || !motivo) {
      return res.status(400).json({ mensagem: "Preencha os campos obrigatórios." });
    }

    const [conflitos] = await pool.query(
      `SELECT id FROM consultas
       WHERE veterinario_id=? AND data_consulta=? AND horario=?
       AND status <> 'Cancelada'`,
      [veterinario_id, data_consulta, horario]
    );

    if (conflitos.length) {
      return res.status(409).json({
        mensagem: "O veterinário já possui uma consulta nesse horário."
      });
    }

    const [resultado] = await pool.query(
      `INSERT INTO consultas
       (pet_id, veterinario_id, data_consulta, horario, motivo, status, observacoes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        pet_id, veterinario_id, data_consulta, horario,
        motivo, status || "Agendada", observacoes || null
      ]
    );

    res.status(201).json({ id: resultado.insertId, mensagem: "Consulta agendada." });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ mensagem: "Erro ao agendar consulta." });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const {
      pet_id, veterinario_id, data_consulta, horario,
      motivo, status, observacoes
    } = req.body;

    const [conflitos] = await pool.query(
      `SELECT id FROM consultas
       WHERE veterinario_id=? AND data_consulta=? AND horario=?
       AND status <> 'Cancelada' AND id <> ?`,
      [veterinario_id, data_consulta, horario, req.params.id]
    );

    if (conflitos.length) {
      return res.status(409).json({
        mensagem: "O veterinário já possui outra consulta nesse horário."
      });
    }

    const [resultado] = await pool.query(
      `UPDATE consultas SET
       pet_id=?, veterinario_id=?, data_consulta=?, horario=?,
       motivo=?, status=?, observacoes=?
       WHERE id=?`,
      [
        pet_id, veterinario_id, data_consulta, horario,
        motivo, status, observacoes || null, req.params.id
      ]
    );

    if (!resultado.affectedRows) {
      return res.status(404).json({ mensagem: "Consulta não encontrada." });
    }

    res.json({ mensagem: "Consulta atualizada." });
  } catch {
    res.status(500).json({ mensagem: "Erro ao atualizar consulta." });
  }
});

router.delete("/:id", apenasAdmin, async (req, res) => {
  try {
    const [resultado] = await pool.query("DELETE FROM consultas WHERE id=?", [req.params.id]);

    if (!resultado.affectedRows) {
      return res.status(404).json({ mensagem: "Consulta não encontrada." });
    }

    res.json({ mensagem: "Consulta excluída." });
  } catch {
    res.status(500).json({ mensagem: "Erro ao excluir consulta." });
  }
});

module.exports = router;
