const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");
const { autenticar } = require("../middlewares/auth");

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ mensagem: "Informe e-mail e senha." });
    }

    const [usuarios] = await pool.query(
      `SELECT id, nome, email, senha, perfil, ativo
       FROM usuarios
       WHERE email = ?`,
      [email]
    );

    if (!usuarios.length || !usuarios[0].ativo) {
      return res.status(401).json({ mensagem: "Credenciais inválidas." });
    }

    const usuario = usuarios[0];
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

    if (!senhaCorreta) {
      return res.status(401).json({ mensagem: "Credenciais inválidas." });
    }

    const payload = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || "petcare_modern_chave_2026",
      { expiresIn: "8h" }
    );

    res.json({ token, usuario: payload });
  } catch (erro) {
    console.error("ERRO NO LOGIN:", erro);
    res.status(500).json({ mensagem: "Não foi possível entrar no sistema." });
  }
});

router.get("/me", autenticar, async (req, res) => {
  res.json(req.usuario);
});

module.exports = router;
