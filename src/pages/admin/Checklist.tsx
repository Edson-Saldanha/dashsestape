import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Printer, ListChecks, Plus, Trash2, Save, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import sestapeLogo from "@/assets/sestape-logo.png";
const LOGO_URL = `${window.location.origin}${sestapeLogo}`;

interface ChkItem { desc: string; cod: string }
interface SignRow { nome: string; data: string; horario: string }
interface Chk {
  id: string;
  cliente: string; os: string; numero_orcamento: string; cpf_cnpj: string;
  data: string; nro_venda: string;
  itens: Record<string, ChkItem>;
  valor_total: string; garantia: string; sistema: string;
  forma_pagamento: string; obs: string;
  data_entrega: string; horario_entrega: string;
  vendedor: SignRow; expedidor: SignRow; tecnico: SignRow; caixa: SignRow;
  updated_at: string;
}

const ITEMS: { key: string; label: string }[] = [
  { key: "notebook", label: "Notebook" },
  { key: "impressora", label: "Impressora" },
  { key: "processador", label: "Processador" },
  { key: "placa_mae", label: "Placa Mãe" },
  { key: "memoria_ram", label: "Memória RAM" },
  { key: "hd_ssd", label: "HD/SSD" },
  { key: "fonte", label: "Fonte" },
  { key: "cooler", label: "Cooler" },
  { key: "placa_video", label: "Placa de Vídeo" },
  { key: "gabinete", label: "Gabinete" },
  { key: "teclado_mouse", label: "Teclado/Mouse" },
  { key: "caixa_som", label: "Caixa de Som" },
  { key: "cabo_energia", label: "Cabo Energia" },
  { key: "filt_estab_nobk", label: "Filt/Estab/Nobreak" },
  { key: "cabo_rede", label: "Cabo de Rede" },
  { key: "monitor", label: "Monitor" },
  { key: "acessorio_1", label: "Acessório 1" },
  { key: "acessorio_2", label: "Acessório 2" },
  { key: "acessorio_3", label: "Acessório 3" },
];

const STORAGE_KEY = "sestape_checklists_v1";
const DRAFT_KEY = "sestape_checklist_draft_v1";
const uid = () => Math.random().toString(36).slice(2, 10);
const todayISO = () => {
  const d = new Date(); const p = (n:number)=>String(n).padStart(2,"0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
};

function blank(): Chk {
  const sr = (): SignRow => ({ nome: "", data: "", horario: "" });
  return {
    id: uid(), cliente: "", os: "", numero_orcamento: "", cpf_cnpj: "",
    data: todayISO(), nro_venda: "", itens: {},
    valor_total: "", garantia: "", sistema: "", forma_pagamento: "",
    obs: "", data_entrega: "", horario_entrega: "", updated_at: new Date().toISOString(),
    vendedor: sr(), expedidor: sr(), tecnico: sr(), caixa: sr(),
  };
}

function loadAll(): Chk[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveAll(list: Chk[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function fmtData(iso: string) {
  if (!iso) return "___/___/______";
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

export function printChecklist(c: Chk) {
  const esc = (s: any) => String(s ?? "").replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch] as string));
  const cell = (v: any) => `<span class="v">${esc(v) || "&nbsp;"}</span>`;
  const itemCell = (label: string, key: string) => {
    const it = c.itens?.[key] || { desc: "", cod: "" };
    return `<div class="item">
      <div class="item-label">${label}</div>
      <div class="item-desc">${esc(it.desc) || "&nbsp;"}</div>
      <div class="item-cod"><span class="cod-tag">COD</span>${esc(it.cod) || "&nbsp;"}</div>
    </div>`;
  };
  const signRow = (label: string, s?: SignRow) => `
    <div class="sign">
      <div class="sign-role">${label}</div>
      <div class="sign-name">${esc(s?.nome) || "&nbsp;"}</div>
      <div class="sign-date">${fmtData(s?.data || "")}</div>
      <div class="sign-time">${esc(s?.horario) || "&mdash;"}</div>
    </div>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"/>
<title>Checklist ${c.os ? "OS " + c.os : ""}</title>
<style>
  *{box-sizing:border-box}
  @page{size:A4;margin:10mm}
  html,body{margin:0;padding:0}
  body{font-family:'Helvetica Neue',Arial,sans-serif;color:#111;font-size:10.5px;line-height:1.35;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .sheet{padding:6mm 4mm}
  .header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #111;padding-bottom:6px;margin-bottom:10px}
  .header h1{margin:0;font-size:14px;letter-spacing:.06em;text-transform:uppercase}
  .header .meta{font-size:9px;color:#444;text-align:right}
  .header .brand{display:flex;align-items:center;gap:10px}
  .header .brand img{height:42px;object-fit:contain}
  .section{border:1px solid #111;border-radius:4px;margin-bottom:8px;page-break-inside:avoid;break-inside:avoid}
  .section-title{background:#111;color:#fff;font-size:9px;letter-spacing:.12em;text-transform:uppercase;padding:3px 8px;font-weight:700}
  .grid{display:grid;gap:0}
  .grid > .f{padding:4px 8px;border-top:1px solid #ddd;border-left:1px solid #ddd;min-height:24px}
  .grid > .f:nth-child(-n+3){border-top:none}
  .grid > .f.col-start{border-left:none}
  .grid .lbl{font-size:8px;color:#666;text-transform:uppercase;letter-spacing:.08em;font-weight:700;display:block;margin-bottom:1px}
  .grid .v{font-size:11px;font-weight:600;color:#000;word-break:break-word}
  .ident{grid-template-columns:2fr 1fr 1fr}
  .ident2{grid-template-columns:1fr 1fr 1fr}
  .items{grid-template-columns:1fr 1fr;border-top:1px solid #ddd}
  .item{display:grid;grid-template-columns:90px 1fr 110px;align-items:center;border-bottom:1px solid #eee;border-left:1px solid #eee;padding:3px 6px;min-height:22px}
  .items .item:nth-child(odd){border-left:none}
  .item-label{font-size:9px;text-transform:uppercase;font-weight:700;letter-spacing:.04em;color:#222}
  .item-desc{font-size:10.5px;border-bottom:1px dotted #999;min-height:14px;padding:0 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .item-cod{font-size:10px;display:flex;align-items:center;gap:4px;border-bottom:1px dotted #999;min-height:14px;padding:0 4px}
  .cod-tag{font-size:7.5px;background:#111;color:#fff;padding:1px 4px;border-radius:2px;letter-spacing:.06em}
  .totals{grid-template-columns:1fr 1fr 1fr 2fr}
  .obs{padding:6px 8px;border-top:1px solid #ddd;display:flex;gap:8px;align-items:flex-start}
  .obs .lbl{color:#b00020;font-weight:800;font-size:9px;letter-spacing:.1em}
  .obs .v{flex:1;font-weight:500}
  .signs{display:grid;grid-template-columns:repeat(2,1fr);gap:0}
  .sign{display:grid;grid-template-columns:90px 1fr 80px 60px;align-items:center;padding:5px 8px;border-top:1px solid #ddd;border-left:1px solid #ddd;min-height:26px;font-size:10px}
  .signs .sign:nth-child(-n+2){border-top:none}
  .signs .sign:nth-child(odd){border-left:none}
  .sign-role{font-size:9px;text-transform:uppercase;font-weight:700;color:#222;letter-spacing:.06em}
  .sign-name{border-bottom:1px solid #000;min-height:14px;padding:0 4px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .sign-date,.sign-time{text-align:center;font-variant-numeric:tabular-nums;color:#222;font-weight:600}
  .delivery{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #ddd}
  .footer{margin-top:6px;font-size:8px;color:#888;text-align:center;letter-spacing:.08em;text-transform:uppercase}
</style></head><body>
<div class="sheet">
  <div class="header">
    <div class="brand">
      <img src="${LOGO_URL}" alt="Sestape Store"/>
      <h1>Checklist &mdash; Notebook / Computador</h1>
    </div>
    <div class="meta">
      <div><strong>OS</strong> ${esc(c.os) || "—"} &nbsp;·&nbsp; <strong>Data</strong> ${fmtData(c.data)}</div>
      <div>Orçamento ${esc(c.numero_orcamento) || "—"} &nbsp;·&nbsp; Venda ${esc(c.nro_venda) || "—"}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Identificação</div>
    <div class="grid ident">
      <div class="f col-start"><span class="lbl">Cliente</span>${cell(c.cliente)}</div>
      <div class="f"><span class="lbl">O.S.</span>${cell(c.os)}</div>
      <div class="f"><span class="lbl">CPF / CNPJ</span>${cell(c.cpf_cnpj)}</div>
      <div class="f col-start"><span class="lbl">Nº Orçamento</span>${cell(c.numero_orcamento)}</div>
      <div class="f"><span class="lbl">Nº Venda</span>${cell(c.nro_venda)}</div>
      <div class="f"><span class="lbl">Data</span>${cell(fmtData(c.data))}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Componentes</div>
    <div class="grid items">
      ${ITEMS.map(it => itemCell(it.label, it.key)).join("")}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Totais &amp; Pagamento</div>
    <div class="grid totals">
      <div class="f col-start"><span class="lbl">Valor Total</span>${cell(c.valor_total)}</div>
      <div class="f"><span class="lbl">Garantia</span>${cell(c.garantia)}</div>
      <div class="f"><span class="lbl">Sistema</span>${cell(c.sistema)}</div>
      <div class="f"><span class="lbl">Forma de Pagamento</span>${cell(c.forma_pagamento)}</div>
    </div>
    <div class="obs"><span class="lbl">OBS</span><span class="v">${esc(c.obs) || "&mdash;"}</span></div>
  </div>

  <div class="section">
    <div class="section-title">Responsáveis</div>
    <div class="signs">
      ${signRow("Vendedor", c.vendedor)}
      ${signRow("Expedidor", c.expedidor)}
      ${signRow("Técnico", c.tecnico)}
      ${signRow("Caixa", c.caixa)}
    </div>
    <div class="grid delivery">
      <div class="f col-start"><span class="lbl">Data da Entrega</span>${cell(fmtData(c.data_entrega))}</div>
      <div class="f"><span class="lbl">Horário</span>${cell(c.horario_entrega)}</div>
    </div>
  </div>

  <div class="footer">Documento gerado em ${new Date().toLocaleString("pt-BR")}</div>
</div>
<script>setTimeout(()=>window.print(),250);</script>
</body></html>`;
  const w = window.open("", "_blank");
  if (!w) { toast.error("Permita pop-ups para imprimir"); return; }
  w.document.write(html); w.document.close();
}

export default function Checklist() {
  const [list, setList] = useState<Chk[]>(() => loadAll());
  const [current, setCurrent] = useState<Chk>(() => {
    try {
      const d = localStorage.getItem(DRAFT_KEY);
      if (d) return JSON.parse(d);
    } catch {}
    return blank();
  });
  const [employees, setEmployees] = useState<{ id: string; name: string; role: string | null; sector: string | null }[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => { saveAll(list); }, [list]);
  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(current)); } catch {}
  }, [current]);
  useEffect(() => {
    supabase.from("employees").select("id,name,role,sector").eq("active", true).order("name")
      .then(({ data }) => setEmployees(data || []));
  }, []);

  // Auto-load or prefill from ?os=NUMBER (vindo de Ordens de Serviço)
  useEffect(() => {
    const idParam = searchParams.get("id");
    const osParam = searchParams.get("os");
    if (idParam) {
      const found = list.find(c => c.id === idParam);
      if (found) { setCurrent(found); toast.success("Checklist carregado"); }
    } else if (osParam) {
      const found = list.find(c => String(c.os).trim() === String(osParam).trim());
      if (found) {
        setCurrent(found);
        toast.success(`Checklist da OS ${osParam} carregado`);
      } else {
        setCurrent({ ...blank(), os: osParam });
        toast.info(`Novo checklist para OS ${osParam}`);
      }
    } else { return; }
    searchParams.delete("os");
    searchParams.delete("id");
    setSearchParams(searchParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setField = <K extends keyof Chk>(k: K, v: Chk[K]) => setCurrent(c => ({ ...c, [k]: v }));
  const setSign = (role: "vendedor"|"expedidor"|"tecnico"|"caixa", field: keyof SignRow, value: string) => {
    setCurrent(c => ({ ...c, [role]: { ...(c[role] || { nome:"", data:"", horario:"" }), [field]: value } }));
  };
  const setItem = (key: string, field: "desc" | "cod", value: string) => {
    setCurrent(c => {
      const itens = { ...(c.itens || {}) };
      const cur = itens[key] || { desc: "", cod: "" };
      itens[key] = { ...cur, [field]: value };
      return { ...c, itens };
    });
  };

  const save = () => {
    const stamped = { ...current, updated_at: new Date().toISOString() };
    setList(prev => {
      const idx = prev.findIndex(x => x.id === stamped.id);
      if (idx === -1) return [stamped, ...prev];
      const copy = [...prev]; copy[idx] = stamped; return copy;
    });
    setCurrent(stamped);
    toast.success("Checklist salvo");
  };

  const novo = () => {
    if (!confirm("Descartar o rascunho atual e começar um novo checklist?")) return;
    setCurrent(blank());
  };

  const load = (c: Chk) => setCurrent(c);

  const remove = (id: string) => {
    if (!confirm("Excluir este checklist?")) return;
    setList(prev => prev.filter(x => x.id !== id));
    if (current.id === id) setCurrent(blank());
    toast.success("Excluído");
  };

  const ordered = useMemo(() => [...list].sort((a,b) => b.updated_at.localeCompare(a.updated_at)), [list]);

  return (
    <div className="p-8 space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-primary font-semibold mb-1">Operação</div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2"><ListChecks className="h-7 w-7" /> Checklist</h1>
          <p className="text-muted-foreground">Notebook / Computador — preenchimento rápido e impressão</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={novo}><Plus className="h-4 w-4 mr-2"/> Novo</Button>
          <Button variant="outline" onClick={()=>printChecklist(current)}><Printer className="h-4 w-4 mr-2"/> Imprimir</Button>
          <Button onClick={save} className="bg-gradient-primary text-white shadow-glow"><Save className="h-4 w-4 mr-2"/> Salvar</Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        <div className="bg-card rounded-2xl border shadow-elegant p-6 space-y-5">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3">Identificação</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2"><Label>Cliente</Label><Input value={current.cliente} onChange={e=>setField("cliente", e.target.value)}/></div>
              <div><Label>O.S.</Label><Input value={current.os} onChange={e=>setField("os", e.target.value)}/></div>
              <div><Label>Nº Orçamento</Label><Input value={current.numero_orcamento} onChange={e=>setField("numero_orcamento", e.target.value)}/></div>
              <div><Label>CPF/CNPJ</Label><Input value={current.cpf_cnpj} onChange={e=>setField("cpf_cnpj", e.target.value)}/></div>
              <div><Label>Nº Venda</Label><Input value={current.nro_venda} onChange={e=>setField("nro_venda", e.target.value)}/></div>
              <div><Label>Data</Label><Input type="date" value={current.data} onChange={e=>setField("data", e.target.value)}/></div>
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3">Componentes</div>
            <div className="rounded-xl border overflow-hidden">
              <div className="grid grid-cols-[180px_1fr_160px] gap-0 bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <div className="p-2">Item</div>
                <div className="p-2">Descrição</div>
                <div className="p-2">Código</div>
              </div>
              {ITEMS.map(it => {
                const cur = current.itens?.[it.key] || { desc: "", cod: "" };
                return (
                  <div key={it.key} className="grid grid-cols-[180px_1fr_160px] items-center border-t">
                    <div className="p-2 text-sm font-medium">{it.label}</div>
                    <div className="p-1.5"><Input className="h-8" value={cur.desc} onChange={e=>setItem(it.key,"desc",e.target.value)} placeholder="—"/></div>
                    <div className="p-1.5"><Input className="h-8" value={cur.cod} onChange={e=>setItem(it.key,"cod",e.target.value)} placeholder="COD"/></div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3">Totais & Pagamento</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div><Label>Valor Total</Label><Input value={current.valor_total} onChange={e=>setField("valor_total", e.target.value)}/></div>
              <div><Label>Garantia</Label><Input value={current.garantia} onChange={e=>setField("garantia", e.target.value)} placeholder="ex: 90 dias"/></div>
              <div><Label>Sistema</Label><Input value={current.sistema} onChange={e=>setField("sistema", e.target.value)} placeholder="Windows 11..."/></div>
              <div className="md:col-span-3">
                <Label>Forma de Pagamento</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={current.forma_pagamento}
                  onChange={e=>setField("forma_pagamento", e.target.value)}
                >
                  <option value="">Selecione...</option>
                  <option value="PIX">PIX</option>
                  <option value="CARTÃO DE CRÉDITO">CARTÃO DE CRÉDITO</option>
                  <option value="CARTÃO DE DÉBITO">CARTÃO DE DÉBITO</option>
                  <option value="DINHEIRO">DINHEIRO</option>
                </select>
              </div>
              <div className="md:col-span-3"><Label>OBS</Label><Textarea rows={2} value={current.obs} onChange={e=>setField("obs", e.target.value)}/></div>
              <div><Label>Data da Entrega</Label><Input type="date" value={current.data_entrega} onChange={e=>setField("data_entrega", e.target.value)}/></div>
              <div><Label>Horário</Label><Input type="time" value={current.horario_entrega} onChange={e=>setField("horario_entrega", e.target.value)}/></div>
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3">Responsáveis</div>
            <div className="rounded-xl border overflow-hidden">
              <div className="grid grid-cols-[130px_1fr_150px_120px] gap-0 bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <div className="p-2">Função</div>
                <div className="p-2">Nome</div>
                <div className="p-2">Data</div>
                <div className="p-2">Horário</div>
              </div>
              {([
                {key:"vendedor", label:"Vendedor"},
                {key:"expedidor", label:"Expedidor"},
                {key:"tecnico", label:"Técnico"},
                {key:"caixa", label:"Caixa"},
              ] as const).map(r => {
                const v = current[r.key] || { nome:"", data:"", horario:"" };
                return (
                  <div key={r.key} className="grid grid-cols-[130px_1fr_150px_120px] items-center border-t">
                    <div className="p-2 text-sm font-medium">{r.label}</div>
                    <div className="p-1.5">
                      <Input
                        className="h-8"
                        list={`emp-${r.key}`}
                        value={v.nome}
                        onChange={e=>setSign(r.key,"nome",e.target.value)}
                        placeholder="Selecione ou digite"
                      />
                      <datalist id={`emp-${r.key}`}>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.name}>{emp.role || emp.sector || ""}</option>
                        ))}
                      </datalist>
                    </div>
                    <div className="p-1.5"><Input className="h-8" type="date" value={v.data} onChange={e=>setSign(r.key,"data",e.target.value)}/></div>
                    <div className="p-1.5"><Input className="h-8" type="time" value={v.horario} onChange={e=>setSign(r.key,"horario",e.target.value)}/></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="bg-card rounded-2xl border shadow-elegant p-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3 flex items-center gap-2">
            <FileText className="h-3.5 w-3.5"/> Salvos ({ordered.length})
          </div>
          <div className="space-y-2 max-h-[70vh] overflow-y-auto">
            {ordered.length === 0 && <div className="text-center text-xs text-muted-foreground py-6">Nenhum checklist salvo.</div>}
            {ordered.map(c => (
              <div key={c.id} className={`p-2 rounded-lg border text-sm flex items-start justify-between gap-2 ${c.id===current.id?"bg-primary/10 border-primary/40":"hover:bg-muted/40"}`}>
                <button type="button" onClick={()=>load(c)} className="text-left flex-1 min-w-0">
                  <div className="font-medium truncate">{c.cliente || "(sem cliente)"}</div>
                  <div className="text-xs text-muted-foreground">OS {c.os || "—"} · {fmtData(c.data)}</div>
                </button>
                <div className="flex flex-col gap-1">
                  <button onClick={()=>printChecklist(c)} className="text-muted-foreground hover:text-primary"><Printer className="h-3.5 w-3.5"/></button>
                  <button onClick={()=>remove(c.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5"/></button>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}