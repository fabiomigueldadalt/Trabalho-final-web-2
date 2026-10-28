const express = require("express");
const pool = require("../config/database");
const { autenticar, apenasAdmin } = require("../middlewares/auth");

const router = express.Router();
router.use(autenticar);

router.get("/", async (_req, res) => {
  try {
    const [dados] = await pool.query(`
      SELECT p.*, c.nome AS cliente_nome,
             COUNT(co.id) AS total_consultas
      FROM pets p
      INNER JOIN clientes c ON c.id = p.cliente_id
      LEFT JOIN consultas co ON co.pet_id = p.id
      GROUP BY p.id
      ORDER BY p.nome
    `);
    res.json(dados);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ mensagem: "Erro ao listar pets." });
  }
});

router.get("/:id/historico", async (req, res) => {
  try {
    const [dados] = await pool.query(`
      SELECT co.*, v.nome AS veterinario_nome
      FROM consultas co
      INNER JOIN veterinarios v ON v.id = co.veterinario_id
      WHERE co.pet_id=?
      ORDER BY co.data_consulta DESC, co.horario DESC
    `, [req.params.id]);
    res.json(dados);
  } catch {
    res.status(500).json({ mensagem: "Erro ao carregar histórico." });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      nome, especie, raca, nascimento, sexo, peso,
      cor, observacoes, foto_url, cliente_id
    } = req.body;

    if (!nome || !especie || !cliente_id) {
      return res.status(400).json({
        mensagem: "Nome, espécie e responsável são obrigatórios."
      });
    }

    const [resultado] = await pool.query(
      `INSERT INTO pets
       (nome, especie, raca, nascimento, sexo, peso, cor, observacoes, foto_url, cliente_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nome, especie, raca || null, nascimento || null, sexo || null,
        peso || null, cor || null, observacoes || null, foto_url || null, cliente_id
      ]
    );

    res.status(201).json({ id: resultado.insertId, mensagem: "Turma cadastrada." });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ mensagem: "Erro ao cadastrar turma." });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const {
      nome, especie, raca, nascimento, sexo, peso,
      cor, observacoes, foto_url, cliente_id
    } = req.body;

    const [resultado] = await pool.query(
      `UPDATE pets SET
       nome=?, especie=?, raca=?, nascimento=?, sexo=?, peso=?,
       cor=?, observacoes=?, foto_url=?, cliente_id=?
       WHERE id=?`,
      [
        nome, especie, raca || null, nascimento || null, sexo || null,
        peso || null, cor || null, observacoes || null, foto_url || null,
        cliente_id, req.params.id
      ]
    );

    if (!resultado.affectedRows) {
      return res.status(404).json({ mensagem: "Turma não encontrada." });
    }

    res.json({ mensagem: "Turma atualizada." });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ mensagem: "Erro ao atualizar turma." });
  }
});

router.delete("/:id", apenasAdmin, async (req, res) => {
  try {
    const [resultado] = await pool.query("DELETE FROM pets WHERE id=?", [req.params.id]);

    if (!resultado.affectedRows) {
      return res.status(404).json({ mensagem: "Turma não encontrada." });
    }

    res.json({ mensagem: "Turma excluída." });
  } catch {
    res.status(409).json({ mensagem: "Esta turma possui aulas vinculadas." });
  }
});

module.exports = router;
