import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { brl } from "@/lib/format";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function CrmManutencoes() {
  const [rows, setRows] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ cliente_id: "", data_atendimento: new Date().toISOString().slice(0, 16), equipamento: "", marca: "", modelo: "", problema_relatado: "", servico_realizado: "", solucao_aplicada: "", valor_cobrado: 0, responsavel_atendimento: "", observacoes_internas: "" });

  async function load() {
    const [a, b, e] = await Promise.all([
      supabase.from("manutencoes").select("*, customers(name)").order("data_atendimento", { ascending: false }).limit(300),
      supabase.from("customers").select("id,name").order("name").limit(2000),
      supabase.from("employees").select("id,name").eq("active", true).order("name"),
    ]);
    setRows(a.data || []); setCustomers(b.data || []); setEmployees(e.data || []);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!form.cliente_id) return toast({ title: "Selecione um cliente", variant: "destructive" });
    const payload = { ...form, data_atendimento: new Date(form.data_atendimento).toISOString(), valor_cobrado: Number(form.valor_cobrado) || 0 };
    const { error } = await supabase.from("manutencoes").insert(payload);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Manutenção cadastrada", description: "Lembretes de 30/60/90 dias gerados." });
    setOpen(false); load();
  }

  return (
    <div className="p-4 lg:p-8 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Manutenções</h1>
          <p className="text-sm text-muted-foreground">{rows.length} registros</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Nova manutenção</Button>
      </div>
      <Card className="divide-y">
        {rows.map(m => (
          <Link key={m.id} to={`/admin/crm/clientes/${m.cliente_id}`} className="p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-muted/40">
            <div>
              <div className="font-medium">{m.customers?.name || "Cliente"} — {m.equipamento || "Equipamento"}</div>
              <div className="text-xs text-muted-foreground">{new Date(m.data_atendimento).toLocaleString("pt-BR")} • {m.responsavel_atendimento || "—"}</div>
            </div>
            <div className="font-semibold">{brl(Number(m.valor_cobrado) || 0)}</div>
          </Link>
        ))}
        {rows.length === 0 && <div className="p-8 text-center text-muted-foreground">Nenhuma manutenção cadastrada.</div>}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova manutenção</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2"><Label>Cliente</Label>
              <Select value={form.cliente_id} onValueChange={v => setForm({ ...form, cliente_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Data</Label><Input type="datetime-local" value={form.data_atendimento} onChange={e => setForm({ ...form, data_atendimento: e.target.value })} /></div>
            <div><Label>Responsável</Label>
              <Select value={form.responsavel_atendimento || ""} onValueChange={v => setForm({ ...form, responsavel_atendimento: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione um colaborador" /></SelectTrigger>
                <SelectContent>{employees.map(emp => <SelectItem key={emp.id} value={emp.name}>{emp.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Equipamento</Label><Input value={form.equipamento} onChange={e => setForm({ ...form, equipamento: e.target.value })} /></div>
            <div><Label>Marca</Label><Input value={form.marca} onChange={e => setForm({ ...form, marca: e.target.value })} /></div>
            <div><Label>Modelo</Label><Input value={form.modelo} onChange={e => setForm({ ...form, modelo: e.target.value })} /></div>
            <div><Label>Valor cobrado</Label><CurrencyInput value={form.valor_cobrado} onValueChange={v => setForm({ ...form, valor_cobrado: v })} /></div>
            <div className="md:col-span-2"><Label>Problema relatado</Label><Textarea value={form.problema_relatado} onChange={e => setForm({ ...form, problema_relatado: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Serviço realizado</Label><Textarea value={form.servico_realizado} onChange={e => setForm({ ...form, servico_realizado: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Solução aplicada</Label><Textarea value={form.solucao_aplicada} onChange={e => setForm({ ...form, solucao_aplicada: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Observações internas</Label><Textarea value={form.observacoes_internas} onChange={e => setForm({ ...form, observacoes_internas: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}