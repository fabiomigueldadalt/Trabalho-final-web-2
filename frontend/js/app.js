if (!getToken()) window.location.href = "/";

const usuario = JSON.parse(localStorage.getItem("petcare_usuario") || "{}");
const state = {
  clientes: [], pets: [], veterinarios: [], consultas: [],
  dashboard: null,
  page: { clientes: 1, pets: 1, veterinarios: 1, consultas: 1 },
  perPage: 6,
  calendarDate: new Date()
};

const sectionTitles = {
  dashboard: "Visão geral",
  alunos: "Alunos",
  turmas: "Turmas",
  professores: "Professores",
  aulas: "Aulas",
  calendario: "Calendário"
};

document.documentElement.dataset.theme =
  localStorage.getItem("petcare_theme") || "light";

setupLayout();
carregarTudo();

function setupLayout() {
  document.querySelector("#sidebar-name").textContent = usuario.nome || "Usuário";
  document.querySelector("#sidebar-role").textContent = usuario.perfil || "Perfil";
  document.querySelector("#sidebar-avatar").textContent =
    (usuario.nome || "U").charAt(0).toUpperCase();

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  document.querySelector("#welcome-title").textContent =
    `${saudacao}, ${(usuario.nome || "usuário").split(" ")[0]}!`;

  document.querySelectorAll("[data-section]").forEach(btn => {
    btn.addEventListener("click", () => trocarSecao(btn.dataset.section));
  });

  document.querySelectorAll("[data-go]").forEach(btn => {
    btn.addEventListener("click", () => trocarSecao(btn.dataset.go));
  });

  document.querySelector("#mobile-menu").onclick = abrirSidebar;
  document.querySelector("#sidebar-close").onclick = fecharSidebar;
  document.querySelector("#mobile-overlay").onclick = fecharSidebar;
  document.querySelector("#logout").onclick = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  document.querySelector("#theme-toggle").onclick = alternarTema;
  document.querySelector("#quick-new").onclick = () => abrirConsulta();

  document.querySelector("#busca-clientes").addEventListener("input", () => resetRender("clientes"));
  document.querySelector("#busca-pets").addEventListener("input", () => resetRender("pets"));
  document.querySelector("#busca-veterinarios").addEventListener("input", () => resetRender("veterinarios"));
  document.querySelector("#busca-consultas").addEventListener("input", () => resetRender("consultas"));
  document.querySelector("#filtro-especie").addEventListener("change", () => resetRender("pets"));
  document.querySelector("#filtro-status").addEventListener("change", () => resetRender("consultas"));

  document.querySelector("#global-search").addEventListener("input", e => {
    const ativa = document.querySelector(".page-section.active")?.id;
    const mapa = {
      alunos: "#busca-clientes",
      turmas: "#busca-pets",
      professores: "#busca-veterinarios",
      aulas: "#busca-consultas"
    };
    if (mapa[ativa]) {
      document.querySelector(mapa[ativa]).value = e.target.value;
      resetRender(ativa);
    }
  });

  document.querySelector("#prev-month").onclick = () => {
    state.calendarDate.setMonth(state.calendarDate.getMonth() - 1);
    renderCalendario();
  };
  document.querySelector("#next-month").onclick = () => {
    state.calendarDate.setMonth(state.calendarDate.getMonth() + 1);
    renderCalendario();
  };
}

async function carregarTudo() {
  try {
    const [dashboard, clientes, pets, veterinarios, consultas] = await Promise.all([
      request("/dashboard"), request("/clientes"), request("/pets"),
      request("/veterinarios"), request("/consultas")
    ]);

    Object.assign(state, { dashboard, clientes, pets, veterinarios, consultas });

    popularEspecies();
    renderDashboard();
    renderClientes();
    renderPets();
    renderVeterinarios();
    renderConsultas();
    renderCalendario();
  } catch (erro) {
    toast(erro.message, "error");
  }
}

function trocarSecao(id) {
  document.querySelectorAll(".page-section").forEach(s => s.classList.remove("active"));
  document.querySelector(`#${id}`)?.classList.add("active");

  document.querySelectorAll("[data-section]").forEach(b =>
    b.classList.toggle("active", b.dataset.section === id)
  );

  document.querySelector("#page-title").textContent = sectionTitles[id];
  document.querySelector("#breadcrumb-page").textContent = sectionTitles[id];
  document.querySelector("#global-search").value = "";
  fecharSidebar();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function abrirSidebar() {
  document.querySelector("#sidebar").classList.add("open");
  document.querySelector("#mobile-overlay").classList.add("open");
}
function fecharSidebar() {
  document.querySelector("#sidebar").classList.remove("open");
  document.querySelector("#mobile-overlay").classList.remove("open");
}

function alternarTema() {
  const novo = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = novo;
  localStorage.setItem("petcare_theme", novo);
  renderDashboard();
}

function renderDashboard() {
  const d = state.dashboard;
  if (!d) return;

  document.querySelector("#total-clientes").textContent = d.totais.clientes;
  document.querySelector("#total-pets").textContent = d.totais.pets;
  document.querySelector("#total-veterinarios").textContent = d.totais.veterinarios;
  document.querySelector("#total-consultas-hoje").textContent = d.totais.consultasHoje;

  document.querySelector("#upcoming-list").innerHTML = d.proximas.length
    ? d.proximas.map(c => {
        const dt = new Date(`${c.data_consulta}T12:00:00`);
        return `
          <div class="appointment-item">
            <div class="date-box">
              <strong>${String(dt.getDate()).padStart(2, "0")}</strong>
              <small>${dt.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</small>
            </div>
            <div class="appointment-main">
              <strong>${esc(c.pet_nome)} — ${c.horario.slice(0,5)}</strong>
              <span>${nomeProfessor(c.veterinario_nome)} · ${conteudoAula(c.motivo)}</span>
            </div>
            <span class="status status-${slug(c.status)}">${esc(c.status)}</span>
          </div>`;
      }).join("")
    : vazio("Nenhuma aula futura encontrada.");

  requestAnimationFrame(() => {
    drawBarChart("monthly-chart", d.porMes.map(x => ({
      label: formatarMes(x.mes), value: Number(x.total)
    })));
    drawDonutChart("species-chart", d.porEspecie.map(x => ({
      label: faixaEtaria(x.especie), value: Number(x.total)
    })));
  });
}

function renderClientes() {
  const termo = document.querySelector("#busca-clientes").value.toLowerCase();
  const dados = state.clientes.filter(c =>
    `${c.nome} ${c.telefone} ${c.email || ""} ${c.cidade || ""}`.toLowerCase().includes(termo)
  );
  const pag = paginar(dados, "clientes");

  document.querySelector("#lista-clientes").innerHTML = pag.items.length
    ? pag.items.map(c => `
      <tr>
        <td><div class="table-person"><span class="table-avatar">${iniciais(c.nome)}</span>
          <div><strong>${esc(c.nome)}</strong><small>${esc(c.email || "Sem e-mail")}</small></div></div></td>
        <td>${esc(c.telefone)}</td>
        <td>${esc(c.cidade || "-")}</td>
        <td>${c.total_pets}</td>
        <td><div class="actions">
          <button class="action-btn" onclick='abrirCliente(${jsonAttr(c)})'>Editar</button>
          ${adminDelete("clientes", c.id)}
        </div></td>
      </tr>`).join("")
    : linhaVazia(5, "Nenhum aluno encontrado.");

  renderPaginacao("clientes", pag.totalPages);
}

function renderPets() {
  const termo = document.querySelector("#busca-pets").value.toLowerCase();
  const especie = document.querySelector("#filtro-especie").value;
  const dados = state.pets.filter(p =>
    (!especie || p.especie === especie) &&
    `${p.nome} ${p.especie} ${p.raca || ""} ${p.cliente_nome}`.toLowerCase().includes(termo)
  );
  const pag = paginar(dados, "pets");

  document.querySelector("#lista-pets").innerHTML = pag.items.length
    ? pag.items.map(p => `
      <article class="pet-card">
        <div class="pet-card-top">
          <div class="pet-photo">${petVisual(p)}</div>
          <div><h3>${esc(p.nome)}</h3><p>Nível: ${nivelIngles(p.especie)}</p></div>
        </div>
        <div class="pet-meta">
          <div class="meta-box"><small>RESPONSÁVEL</small><strong>${esc(p.cliente_nome)}</strong></div>
          <div class="meta-box"><small>CARGA HORÁRIA</small><strong>${p.peso ? `${p.peso} h` : "-"}</strong></div>
          <div class="meta-box"><small>SEXO</small><strong>${sexoLabel(p.sexo)}</strong></div>
          <div class="meta-box"><small>AULAS</small><strong>${p.total_consultas}</strong></div>
        </div>
        <div class="card-actions">
          <button class="btn btn-light" onclick='abrirPet(${jsonAttr(p)})'>Editar</button>
          <button class="btn btn-light" onclick="verHistorico(${p.id}, '${escAttr(p.nome)}')">Histórico</button>
          ${usuario.perfil === "Administrador" ? `<button class="btn btn-danger" onclick="excluirItem('pets',${p.id})">Excluir</button>` : ""}
        </div>
      </article>`).join("")
    : vazio("Nenhuma turma encontrada.");

  renderPaginacao("pets", pag.totalPages);
}

function renderVeterinarios() {
  const termo = document.querySelector("#busca-veterinarios").value.toLowerCase();
  const dados = state.veterinarios.filter(v =>
    `${v.nome} ${v.crmv} ${v.especialidade || ""}`.toLowerCase().includes(termo)
  );
  const pag = paginar(dados, "veterinarios");

  document.querySelector("#lista-veterinarios").innerHTML = pag.items.length
    ? pag.items.map(v => `
      <article class="doctor-card">
        <div class="doctor-head">
          <div style="display:flex;gap:12px;align-items:center">
            <div class="doctor-avatar">${iniciais(v.nome)}</div>
            <div><h3>${nomeProfessor(v.nome)}</h3><p>${especialidadeProfessor(v.especialidade)}</p></div>
          </div>
          <span class="status status-concluída">${v.total_consultas} aulas</span>
        </div>
        <div class="doctor-info">
          <span><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 10 9-5 9 5-9 5-9-5Z"/><path d="M7 12.2v4.3c2.8 2 7.2 2 10 0v-4.3"/></svg> Professor(a) de inglês</span>
          <span><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h4l2 5-2.5 1.5a12 12 0 0 0 6 6L15 14l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 2 6a2 2 0 0 1 2-2Z"/></svg> ${esc(v.telefone || "Não informado")}</span>
          <span><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg> ${esc(v.email || "Não informado")}</span>
        </div>
        <div class="card-actions">
          <button class="btn btn-light" onclick='abrirVeterinario(${jsonAttr(v)})'>Editar</button>
          ${usuario.perfil === "Administrador" ? `<button class="btn btn-danger" onclick="excluirItem('veterinarios',${v.id})">Excluir</button>` : ""}
        </div>
      </article>`).join("")
    : vazio("Nenhum professor encontrado.");

  renderPaginacao("veterinarios", pag.totalPages);
}

function renderConsultas() {
  const termo = document.querySelector("#busca-consultas").value.toLowerCase();
  const status = document.querySelector("#filtro-status").value;
  const dados = state.consultas.filter(c =>
    (!status || c.status === status) &&
    `${c.pet_nome} ${c.cliente_nome} ${c.veterinario_nome} ${c.motivo}`.toLowerCase().includes(termo)
  );
  const pag = paginar(dados, "consultas");

  document.querySelector("#lista-consultas").innerHTML = pag.items.length
    ? pag.items.map(c => `
      <tr>
        <td><strong>${formatarData(c.data_consulta)}</strong><br><small>${c.horario.slice(0,5)}</small></td>
        <td><div class="table-person"><span class="table-avatar">${emojiEspecie(c.especie)}</span>
          <div><strong>${esc(c.pet_nome)}</strong><small>${esc(c.cliente_nome)}</small></div></div></td>
        <td>${nomeProfessor(c.veterinario_nome)}</td>
        <td>${conteudoAula(c.motivo)}</td>
        <td><span class="status status-${slug(c.status)}">${esc(c.status)}</span></td>
        <td><div class="actions">
          <button class="action-btn" onclick='abrirConsulta(${jsonAttr(c)})'>Editar</button>
          ${adminDelete("consultas", c.id)}
        </div></td>
      </tr>`).join("")
    : linhaVazia(6, "Nenhuma aula encontrada.");

  renderPaginacao("consultas", pag.totalPages);
}

function renderCalendario() {
  const date = state.calendarDate;
  const ano = date.getFullYear();
  const mes = date.getMonth();
  document.querySelector("#calendar-title").textContent =
    new Date(ano, mes, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const primeiro = new Date(ano, mes, 1);
  const inicio = new Date(ano, mes, 1 - primeiro.getDay());
  const diasSemana = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

  let html = diasSemana.map(d => `<div class="calendar-head">${d}</div>`).join("");

  for (let i = 0; i < 42; i++) {
    const dia = new Date(inicio);
    dia.setDate(inicio.getDate() + i);
    const iso = `${dia.getFullYear()}-${String(dia.getMonth()+1).padStart(2,"0")}-${String(dia.getDate()).padStart(2,"0")}`;
    const eventos = state.consultas.filter(c => c.data_consulta === iso);
    html += `
      <div class="calendar-day ${dia.getMonth() !== mes ? "muted-day" : ""}">
        <div class="calendar-number">${dia.getDate()}</div>
        ${eventos.slice(0,3).map(e =>
          `<span class="calendar-event" title="${conteudoAula(e.motivo)}">${e.horario.slice(0,5)} · ${esc(e.pet_nome)}</span>`
        ).join("")}
        ${eventos.length > 3 ? `<span class="calendar-event">+${eventos.length-3} aula(s)</span>` : ""}
      </div>`;
  }

  document.querySelector("#calendar-grid").innerHTML = html;
}

function abrirCliente(dado = null) {
  abrirFormulario(dado ? "Editar aluno" : "Novo aluno", "clientes", dado, `
    <div class="form-grid">
      ${campo("nome","Nome completo",dado?.nome,true)}
      ${campo("telefone","Telefone",dado?.telefone,true)}
      ${campo("email","E-mail",dado?.email,false,"email")}
      ${campo("cidade","Nível atual",dado?.cidade)}
      <label class="field full"><span>Observações</span><input name="endereco" value="${escAttr(dado?.endereco || "")}"></label>
      ${botoesForm()}
    </div>`);
}

function abrirPet(dado = null) {
  abrirFormulario(dado ? "Editar turma" : "Nova turma", "pets", dado, `
    <div class="form-grid">
      ${campo("nome","Nome da turma",dado?.nome,true)}
      ${campo("especie","Nível de inglês",nivelIngles(dado?.especie),true)}
      ${campo("raca","Público-alvo",dado?.raca)}
      ${campo("nascimento","Início da turma",dataInput(dado?.nascimento),false,"date")}
      <label class="field"><span>Sexo</span><select name="sexo">
        <option value="">Selecione</option>
        ${option("Macho", dado?.sexo)}${option("Fêmea", dado?.sexo)}
      </select></label>
      ${campo("peso","Carga horária",dado?.peso,false,"number",'step="0.01" min="0"')}
      ${campo("cor","Material didático",dado?.cor)}
      <label class="field"><span>Aluno responsável</span><select name="cliente_id" required>
        <option value="">Selecione</option>
        ${state.clientes.map(c => `<option value="${c.id}" ${Number(dado?.cliente_id)===c.id?"selected":""}>${esc(c.nome)}</option>`).join("")}
      </select></label>
      <label class="field full"><span>Imagem da turma (opcional)</span><input type="url" name="foto_url" value="${escAttr(dado?.foto_url || "")}" placeholder="https://..."></label>
      <label class="field full"><span>Observações</span><textarea name="observacoes">${esc(dado?.observacoes || "")}</textarea></label>
      ${botoesForm()}
    </div>`);
}

function abrirVeterinario(dado = null) {
  abrirFormulario(dado ? "Editar professor" : "Novo professor", "veterinarios", dado, `
    <div class="form-grid">
      ${campo("nome","Nome completo",dado?.nome,true)}
      ${campo("crmv","Registro",dado?.crmv,true)}
      ${campo("especialidade","Área de ensino",especialidadeProfessor(dado?.especialidade))}
      ${campo("telefone","Telefone",dado?.telefone)}
      ${campo("email","E-mail",dado?.email,false,"email")}
      ${botoesForm()}
    </div>`);
}

function abrirConsulta(dado = null) {
  abrirFormulario(dado ? "Editar aula" : "Nova aula", "consultas", dado, `
    <div class="form-grid">
      <label class="field"><span>Turma</span><select name="pet_id" required>
        <option value="">Selecione</option>
        ${state.pets.map(p => `<option value="${p.id}" ${Number(dado?.pet_id)===p.id?"selected":""}>${esc(p.nome)} — ${esc(p.cliente_nome)}</option>`).join("")}
      </select></label>
      <label class="field"><span>Professor</span><select name="veterinario_id" required>
        <option value="">Selecione</option>
        ${state.veterinarios.map(v => `<option value="${v.id}" ${Number(dado?.veterinario_id)===v.id?"selected":""}>${nomeProfessor(v.nome)}</option>`).join("")}
      </select></label>
      ${campo("data_consulta","Data",dataInput(dado?.data_consulta),true,"date")}
      ${campo("horario","Horário",dado?.horario?.slice(0,5),true,"time")}
      <label class="field full"><span>Conteúdo da aula</span><input name="motivo" value="${escAttr(dado?.motivo || "")}" required></label>
      <label class="field"><span>Status</span><select name="status">
        ${["Agendada","Concluída","Cancelada"].map(s => option(s,dado?.status || "Agendada")).join("")}
      </select></label>
      <label class="field full"><span>Observações da aula</span><textarea name="observacoes">${esc(dado?.observacoes || "")}</textarea></label>
      ${botoesForm()}
    </div>`);
}

function abrirFormulario(titulo, tipo, dado, html) {
  document.querySelector("#modal-title").textContent = titulo;
  const form = document.querySelector("#modal-form");
  form.innerHTML = html;
  form.dataset.tipo = tipo;
  form.dataset.id = dado?.id || "";
  document.querySelector("#modal").classList.add("open");

  form.onsubmit = async e => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(form).entries());
    const id = form.dataset.id;
    const botao = form.querySelector("[type=submit]");
    botao.disabled = true;

    try {
      const resposta = await request(`/${tipo}${id ? `/${id}` : ""}`, {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(payload)
      });
      toast(resposta.mensagem || "Registro salvo.");
      fecharModal();
      await carregarTudo();
    } catch (erro) {
      toast(erro.message, "error");
    } finally {
      botao.disabled = false;
    }
  };
}

function fecharModal() {
  document.querySelector("#modal").classList.remove("open");
}

async function excluirItem(tipo, id) {
  if (!confirm("Deseja realmente excluir este registro?")) return;
  try {
    const resposta = await request(`/${tipo}/${id}`, { method: "DELETE" });
    toast(resposta.mensagem);
    await carregarTudo();
  } catch (erro) {
    toast(erro.message, "error");
  }
}

async function verHistorico(id, nome) {
  try {
    const dados = await request(`/pets/${id}/historico`);
    document.querySelector("#modal-title").textContent = `Histórico da turma ${nome}`;
    document.querySelector("#modal-form").innerHTML = dados.length ? `
      <div class="timeline">
        ${dados.map(h => `
          <article class="panel" style="padding:16px;margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;gap:12px">
              <strong>${formatarData(h.data_consulta)} às ${h.horario.slice(0,5)}</strong>
              <span class="status status-${slug(h.status)}">${esc(h.status)}</span>
            </div>
            <p><strong>Notas do aluno</strong></p>
            <p style="color:var(--muted)">${notaAula(h.observacoes)}</p>
          </article>`).join("")}
      </div>` : vazio("Nenhuma aula registrada.");
    document.querySelector("#modal").classList.add("open");
  } catch (erro) {
    toast(erro.message, "error");
  }
}

function popularEspecies() {
  const select = document.querySelector("#filtro-especie");
  const atual = select.value;
  const especies = [...new Set(state.pets.map(p => p.especie))].sort();
  select.innerHTML = `<option value="">Todos os públicos</option>` +
    especies.map(e => `<option ${e===atual?"selected":""}>${esc(e)}</option>`).join("");
}

function paginar(dados, tipo) {
  const totalPages = Math.max(1, Math.ceil(dados.length / state.perPage));
  state.page[tipo] = Math.min(state.page[tipo], totalPages);
  const start = (state.page[tipo] - 1) * state.perPage;
  return { items: dados.slice(start, start + state.perPage), totalPages };
}

function renderPaginacao(tipo, totalPages) {
  const el = document.querySelector(`#paginacao-${tipo}`);
  el.innerHTML = Array.from({length: totalPages}, (_, i) => `
    <button class="page-btn ${state.page[tipo]===i+1?"active":""}"
      onclick="mudarPagina('${tipo}',${i+1})">${i+1}</button>
  `).join("");
}

function mudarPagina(tipo, pagina) {
  state.page[tipo] = pagina;
  ({clientes:renderClientes,pets:renderPets,veterinarios:renderVeterinarios,consultas:renderConsultas}[tipo])();
}

function resetRender(tipo) {
  state.page[tipo] = 1;
  ({clientes:renderClientes,pets:renderPets,veterinarios:renderVeterinarios,consultas:renderConsultas}[tipo])();
}

function drawBarChart(id, data) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  fitCanvas(canvas);
  const ctx = canvas.getContext("2d");
  const w = canvas.clientWidth, h = canvas.clientHeight;
  ctx.clearRect(0,0,w,h);

  if (!data.length) {
    ctx.fillStyle = css("--muted");
    ctx.fillText("Sem dados suficientes", 20, 40);
    return;
  }

  const max = Math.max(...data.map(d => d.value), 1);
  const pad = {l:35,r:12,t:15,b:35};
  const chartW = w-pad.l-pad.r, chartH = h-pad.t-pad.b;
  const slot = chartW/data.length;
  const bar = Math.min(38, slot*.55);

  ctx.font = "12px system-ui";
  ctx.textAlign = "center";

  data.forEach((d,i) => {
    const x = pad.l + slot*i + slot/2;
    const bh = (d.value/max)*chartH;
    const grad = ctx.createLinearGradient(0,pad.t,0,h);
    grad.addColorStop(0, css("--primary"));
    grad.addColorStop(1, css("--primary-2"));
    roundRect(ctx,x-bar/2,pad.t+chartH-bh,bar,bh,8,grad);
    ctx.fillStyle = css("--muted");
    ctx.fillText(d.label,x,h-10);
    ctx.fillStyle = css("--text");
    ctx.fillText(d.value,x,pad.t+chartH-bh-7);
  });
}

function drawDonutChart(id, data) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  fitCanvas(canvas);
  const ctx = canvas.getContext("2d");
  const w = canvas.clientWidth, h = canvas.clientHeight;
  ctx.clearRect(0,0,w,h);

  if (!data.length) return;
  const total = data.reduce((a,b)=>a+b.value,0);
  const colors = ["#BD1010", "#112EBF", "#2741C5", "#8A95A5", "#630E0C"];
  const cx = w*.36, cy = h*.48, radius = Math.min(w,h)*.28;
  let start = -Math.PI/2;

  data.forEach((d,i) => {
    const angle = (d.value/total)*Math.PI*2;
    ctx.beginPath();
    ctx.strokeStyle = colors[i%colors.length];
    ctx.lineWidth = 24;
    ctx.arc(cx,cy,radius,start,start+angle);
    ctx.stroke();
    start += angle;
  });

  ctx.fillStyle = css("--text");
  ctx.textAlign = "center";
  ctx.font = "700 22px system-ui";
  ctx.fillText(total,cx,cy+3);
  ctx.font = "11px system-ui";
  ctx.fillStyle = css("--muted");
  ctx.fillText("turmas",cx,cy+20);

  ctx.textAlign = "left";
  data.slice(0,5).forEach((d,i) => {
    const x = w*.68, y = 35+i*30;
    ctx.fillStyle = colors[i%colors.length];
    ctx.fillRect(x,y-8,10,10);
    ctx.fillStyle = css("--text");
    ctx.font = "12px system-ui";
    ctx.fillText(`${d.label} (${d.value})`,x+18,y);
  });
}

function fitCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width*dpr;
  canvas.height = rect.height*dpr;
  canvas.getContext("2d").setTransform(dpr,0,0,dpr,0,0);
}

function roundRect(ctx,x,y,w,h,r,fill) {
  ctx.beginPath();
  ctx.roundRect(x,y,w,h,r);
  ctx.fillStyle = fill;
  ctx.fill();
}

function css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }
function toast(msg, type="success") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<strong>${type==="success"?"Tudo certo":"Atenção"}</strong><div>${esc(msg)}</div>`;
  document.querySelector("#toast-container").appendChild(el);
  setTimeout(()=>el.remove(),3500);
}
function campo(nome,label,valor="",required=false,type="text",extra="") {
  return `<label class="field"><span>${label}</span><input type="${type}" name="${nome}" value="${escAttr(valor ?? "")}" ${required?"required":""} ${extra}></label>`;
}
function botoesForm() {
  return `<div class="form-actions full"><button type="button" class="btn btn-light" onclick="fecharModal()">Cancelar</button><button type="submit" class="btn btn-primary">Salvar registro</button></div>`;
}
function option(valor, atual) { return `<option value="${valor}" ${valor===atual?"selected":""}>${valor}</option>`; }
function adminDelete(tipo,id) { return usuario.perfil==="Administrador" ? `<button class="action-btn" onclick="excluirItem('${tipo}',${id})">Excluir</button>` : ""; }
function petVisual(p) { return p.foto_url ? `<img src="${escAttr(p.foto_url)}" alt="${escAttr(p.nome)}" onerror="this.parentElement.innerHTML='${emojiEspecie(p.especie)}'">` : emojiEspecie(p.especie); }
function faixaEtaria(valor="") {
  const s = valor.toLowerCase();
  return s.includes("cach") || s.includes("bás") || s.includes("basic") ? "Crianças" :
    s.includes("gat") || s.includes("intermedi") ? "Adultos" : "Idosos";
}
function nivelIngles(valor="") {
  const s = String(valor).toLowerCase();
  return s.includes("cach") ? "Básico" : s.includes("gat") ? "Intermediário" :
    s.includes("ave") ? "Avançado" : (valor || "Não informado");
}
function sexoLabel(valor="") { return valor === "Macho" ? "Masculino" : valor === "Fêmea" ? "Feminino" : "Não informado"; }
function especialidadeProfessor() { return "Inglês geral"; }
function conteudoAula(valor="") {
  const clinico = /consulta|irrita|vacina|retorno|avaliação cl[ií]nica/i;
  return esc(clinico.test(valor) ? "Aula de inglês" : (valor || "Conteúdo a definir"));
}
function notaAula(valor="") {
  const clinico = /animal|exame|sangue|cl[ií]nic/i;
  return esc(!valor ? "Sem notas registradas." : clinico.test(valor) ? "Acompanhamento da aula registrado." : valor);
}
function nomeProfessor(nome="") { return esc(String(nome).replace(/^dr\.?\s*|^dra\.?\s*/i, "").trim()); }
function emojiEspecie(e="") { return faixaEtaria(e).slice(0,2).toUpperCase(); }
function formatarData(d) { return d ? new Date(`${String(d).slice(0,10)}T12:00:00`).toLocaleDateString("pt-BR") : "-"; }
function formatarMes(m) { const [a,mes]=m.split("-"); return new Date(a,mes-1,1).toLocaleDateString("pt-BR",{month:"short"}).replace(".",""); }
function dataInput(d) { return d ? String(d).slice(0,10) : ""; }
function iniciais(n="") { return n.split(" ").slice(0,2).map(x=>x[0]).join("").toUpperCase(); }
function slug(s="") { return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,""); }
function vazio(msg) { return `<div style="padding:35px;text-align:center;color:var(--muted)">${msg}</div>`; }
function linhaVazia(cols,msg) { return `<tr><td colspan="${cols}" style="text-align:center;color:var(--muted);padding:35px">${msg}</td></tr>`; }
function esc(v) { return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }
function escAttr(v) { return esc(v); }
function jsonAttr(obj) { return JSON.stringify(obj).replaceAll("'","&#39;"); }

window.addEventListener("resize", () => renderDashboard());
window.fecharModal = fecharModal;
window.abrirCliente = abrirCliente;
window.abrirPet = abrirPet;
window.abrirVeterinario = abrirVeterinario;
window.abrirConsulta = abrirConsulta;
window.excluirItem = excluirItem;
window.verHistorico = verHistorico;
window.mudarPagina = mudarPagina;
