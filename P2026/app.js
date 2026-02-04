// app.js
// Dependencias: data.js expone CATALOGO (materia -> grupos[])

const materiaSearch = document.getElementById('materiaSearch');
const materiaSelect = document.getElementById('materiaSelect');
const grupoSelect   = document.getElementById('grupoSelect');
const grupoInfoText = document.getElementById('grupoInfoText');

const form     = document.getElementById('evaluacionForm');
const btnEnviar = document.getElementById('btnEnviar');
const statusEl  = document.getElementById('status');

let selectedGroup = null;

function setOptions(selectEl, options, placeholder){
  selectEl.innerHTML = '';
  const ph = document.createElement('option');
  ph.value = '';
  ph.textContent = placeholder;
  selectEl.appendChild(ph);

  options.forEach(({value, label}) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    selectEl.appendChild(opt);
  });
}

function loadMaterias(){
  const materias = Object.keys(CATALOGO).sort((a,b)=>a.localeCompare(b,'es'));
  const opts = materias.map(m => ({ value: m, label: m }));
  setOptions(materiaSelect, opts, 'Selecciona una materia');
}

function updateGrupoInfo(){
  if(!selectedGroup){
    grupoInfoText.textContent = 'Aquí verás clave de grupo, profesor, horario y modalidad.';
    return;
  }
  // selectedGroup trae: grupo, profesor, horario, modalidad, etc. (según data.js)
  const parts = [];
  if(selectedGroup.grupo) parts.push(`Grupo: ${selectedGroup.grupo}`);
  if(selectedGroup.profesor) parts.push(`Profesor: ${selectedGroup.profesor}`);
  if(selectedGroup.horario) parts.push(`Horario: ${selectedGroup.horario}`);
  if(selectedGroup.modalidad) parts.push(`Modalidad: ${selectedGroup.modalidad}`);
  if(selectedGroup.salon) parts.push(`Salón: ${selectedGroup.salon}`);
  grupoInfoText.textContent = parts.length ? parts.join(' · ') : 'Información del grupo disponible.';
}

function loadGruposForMateria(materia){
  selectedGroup = null;
  updateGrupoInfo();

  if(!materia || !CATALOGO[materia] || CATALOGO[materia].length === 0){
    grupoSelect.disabled = true;
    setOptions(grupoSelect, [], 'Primero selecciona una materia');
    btnEnviar.disabled = true;
    return;
  }

  const grupos = CATALOGO[materia].map(g => ({
    value: g.grupo,
    label: g.label
  }));

  grupoSelect.disabled = false;
  setOptions(grupoSelect, grupos, 'Selecciona el grupo');
  btnEnviar.disabled = true; // hasta que se elija grupo
}

function scrollMateriaToMatch(query){
  const q = (query || '').trim().toLowerCase();
  if(q.length < 2) return;

  for(const opt of materiaSelect.options){
    if(opt.value && opt.value.toLowerCase().includes(q)){
      materiaSelect.value = opt.value;
      materiaSelect.dispatchEvent(new Event('change'));
      break;
    }
  }
}

function setStatus(msg, isError=false){
  statusEl.textContent = msg;
  statusEl.classList.toggle('error', !!isError);
  statusEl.classList.toggle('ok', !isError && !!msg);
}

function wireQ3Exclusivity(){
  const none = document.getElementById('q3_none');
  const otro = document.getElementById('q3_otro');
  if(!none) return;

  const toolChecks = Array.from(document.querySelectorAll('input[name="q3"]'));

  function apply(){
    const noneChecked = none.checked;
    toolChecks.forEach(ch => { ch.disabled = noneChecked; if(noneChecked) ch.checked = false; });
    if(otro){ otro.disabled = noneChecked; if(noneChecked) otro.value = ''; }

    // Si el usuario marca cualquier herramienta / escribe "Otra", desmarca "ninguna"
    if(!noneChecked){
      const anyTool = toolChecks.some(ch => ch.checked);
      const anyOtro = (otro && (otro.value || '').trim().length > 0);
      if(anyTool || anyOtro) none.checked = false;
    }
  }

  none.addEventListener('change', apply);
  toolChecks.forEach(ch => ch.addEventListener('change', () => { if(ch.checked) none.checked = false; apply(); }));
  if(otro) otro.addEventListener('input', () => { if((otro.value||'').trim().length>0) none.checked = false; apply(); });

  apply();
}

function validateForm(){
  // Materia + grupo
  if(!materiaSelect.value) return { ok:false, msg:'Selecciona una materia.' };
  if(!grupoSelect.value) return { ok:false, msg:'Selecciona un grupo.' };

  // Q1: al menos una
  if(document.querySelectorAll('input[name="q1"]:checked').length === 0){
    return { ok:false, msg:'Responde la pregunta 1 (elige al menos una opción).' };
  }

  // Q2, Q4, Q5, Q6 (radio required)
  const requiredRadios = ['q2','q4','q5','q6'];
  for(const r of requiredRadios){
    if(!document.querySelector(`input[name="${r}"]:checked`)){
      return { ok:false, msg:`Responde la pregunta ${r.replace('q','')}.` };
    }
  }

  // Q3: ninguna O alguna herramienta O "otra"
  const q3None = document.getElementById('q3_none');
  const q3Tools = document.querySelectorAll('input[name="q3"]:checked').length;
  const q3Otro = (document.getElementById('q3_otro')?.value || '').trim();
  if(!(q3None?.checked || q3Tools>0 || q3Otro.length>0)){
    return { ok:false, msg:'Responde la pregunta 3 (elige al menos una opción, escribe “Otra” o marca “ninguna”).' };
  }

  return { ok:true };
}

function collectPayload(){
  const payload = {
    timestamp: new Date().toISOString(),
    materia: materiaSelect.value,
    grupo: grupoSelect.value,
    grupo_detalle: selectedGroup || null,
    respuestas: {
      q1: Array.from(document.querySelectorAll('input[name="q1"]:checked')).map(x=>x.value),
      q2: document.querySelector('input[name="q2"]:checked')?.value || '',
      q3: {
        herramientas: Array.from(document.querySelectorAll('input[name="q3"]:checked')).map(x=>x.value),
        otra: (document.getElementById('q3_otro')?.value || '').trim(),
        ninguna: !!document.getElementById('q3_none')?.checked
      },
      q4: document.querySelector('input[name="q4"]:checked')?.value || '',
      q5: document.querySelector('input[name="q5"]:checked')?.value || '',
      q6: document.querySelector('input[name="q6"]:checked')?.value || '',
      q7: (document.querySelector('textarea[name="q7"]')?.value || '').trim()
    }
  };
  return payload;
}

materiaSearch?.addEventListener('input', (e) => {
  scrollMateriaToMatch(e.target.value);
});

materiaSelect?.addEventListener('change', () => {
  loadGruposForMateria(materiaSelect.value);
  setStatus('');
});

grupoSelect?.addEventListener('change', () => {
  const materia = materiaSelect.value;
  const grupos = CATALOGO[materia] || [];
  selectedGroup = grupos.find(g => String(g.grupo) === String(grupoSelect.value)) || null;
  updateGrupoInfo();

  const ok = !!grupoSelect.value;
  btnEnviar.disabled = !ok;
  setStatus(ok ? '' : 'Selecciona un grupo.');
});

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  setStatus('');

  const v = validateForm();
  if(!v.ok){
    setStatus(v.msg, true);
    statusEl.scrollIntoView({ behavior:'smooth', block:'center' });
    return;
  }

  btnEnviar.disabled = true;
  setStatus('Enviando…');

  // Por ahora: muestra el payload en consola.
  // Siguiente paso: conectar a Google Sheets / endpoint con SSO, según definas.
  const payload = collectPayload();
  console.log('Evaluación (payload):', payload);

  // Simulamos envío OK
  setTimeout(() => {
    setStatus('Evaluación capturada (demo). Falta conectar el destino de respuestas.', false);
    btnEnviar.disabled = false;
  }, 400);
});

loadMaterias();
wireQ3Exclusivity();
updateGrupoInfo();
