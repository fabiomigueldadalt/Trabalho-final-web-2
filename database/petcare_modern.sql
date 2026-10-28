CREATE DATABASE IF NOT EXISTS petcare_modern
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE petcare_modern;

CREATE TABLE usuarios (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL,
  perfil ENUM('Administrador','Recepcionista') NOT NULL DEFAULT 'Recepcionista',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE clientes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nome VARCHAR(120) NOT NULL,
  telefone VARCHAR(20) NOT NULL,
  email VARCHAR(120),
  endereco VARCHAR(200),
  cidade VARCHAR(100),
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE veterinarios (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nome VARCHAR(120) NOT NULL,
  crmv VARCHAR(30) NOT NULL UNIQUE,
  especialidade VARCHAR(100),
  telefone VARCHAR(20),
  email VARCHAR(120),
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nome VARCHAR(100) NOT NULL,
  especie VARCHAR(60) NOT NULL,
  raca VARCHAR(80),
  nascimento DATE,
  sexo ENUM('Macho','Fêmea'),
  peso DECIMAL(6,2),
  cor VARCHAR(60),
  observacoes TEXT,
  foto_url VARCHAR(500),
  cliente_id INT NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pet_cliente
    FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);

CREATE TABLE consultas (
  id INT PRIMARY KEY AUTO_INCREMENT,
  pet_id INT NOT NULL,
  veterinario_id INT NOT NULL,
  data_consulta DATE NOT NULL,
  horario TIME NOT NULL,
  motivo VARCHAR(200) NOT NULL,
  status ENUM('Agendada','Concluída','Cancelada') DEFAULT 'Agendada',
  observacoes TEXT,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_consulta_pet
    FOREIGN KEY (pet_id) REFERENCES pets(id),
  CONSTRAINT fk_consulta_veterinario
    FOREIGN KEY (veterinario_id) REFERENCES veterinarios(id)
);

INSERT INTO clientes (nome, telefone, email, endereco, cidade) VALUES
('Mariana Souza', '(38) 99999-1111', 'mariana@email.com', 'Rua das Flores, 100', 'Bocaiuva'),
('Carlos Lima', '(38) 99999-2222', 'carlos@email.com', 'Avenida Central, 250', 'Montes Claros'),
('Fernanda Alves', '(38) 99999-3333', 'fernanda@email.com', 'Rua do Sol, 45', 'Bocaiuva');

INSERT INTO veterinarios (nome, crmv, especialidade, telefone, email) VALUES
('Dra. Ana Martins', 'CRMV-MG 12345', 'Clínica geral', '(38) 98888-1111', 'ana@petcare.com'),
('Dr. Paulo Mendes', 'CRMV-MG 67890', 'Dermatologia', '(38) 98888-2222', 'paulo@petcare.com'),
('Dra. Júlia Rocha', 'CRMV-MG 24680', 'Felinos', '(38) 98888-3333', 'julia@petcare.com');

INSERT INTO pets
(nome, especie, raca, nascimento, sexo, peso, cor, observacoes, foto_url, cliente_id)
VALUES
('Thor', 'Cachorro', 'Golden Retriever', '2021-05-10', 'Macho', 31.5, 'Dourado', 'Animal dócil.', NULL, 1),
('Luna', 'Gato', 'Siamês', '2022-08-14', 'Fêmea', 4.2, 'Branco e cinza', NULL, NULL, 2),
('Mel', 'Cachorro', 'Shih-tzu', '2020-02-22', 'Fêmea', 6.8, 'Branco', NULL, NULL, 3),
('Pingo', 'Ave', 'Calopsita', '2023-01-12', 'Macho', 0.09, 'Amarelo', NULL, NULL, 1);

INSERT INTO consultas
(pet_id, veterinario_id, data_consulta, horario, motivo, status, observacoes)
VALUES
(1, 1, CURDATE(), '14:00:00', 'Consulta de rotina', 'Agendada', NULL),
(2, 2, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '10:30:00', 'Irritação na pele', 'Agendada', NULL),
(3, 1, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '09:00:00', 'Vacinação anual', 'Agendada', NULL),
(1, 1, DATE_SUB(CURDATE(), INTERVAL 30 DAY), '11:00:00', 'Retorno', 'Concluída', 'Animal em boas condições.'),
(2, 3, DATE_SUB(CURDATE(), INTERVAL 65 DAY), '15:00:00', 'Avaliação clínica', 'Concluída', 'Solicitado exame de sangue.');
