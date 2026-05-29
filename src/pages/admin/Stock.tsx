import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { brl } from "@/lib/format";

interface StockItem {
  id: string;
  name: string;
  quantity: number;
  min_quantity: number | null;
  unit: string | null;
  cost_price: number | null;
  notes: string | null;
  created_at: string;
}

const empty = () => ({ name: "", quantity: 0, min_quantity: 0, unit: "", cost_price: 0, notes: "" });

export default function Stock() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StockItem | null>(null);
  const [form, setForm] = useState(empty());

  const { data: items = [], isLoading } = useQuery<StockItem[]>({
    queryKey: ["stock"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stock").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const upsert = useMutation({
    mutationFn: async () => {
      const payload = { ...form, quantity: Number(form.quantity), min_quantity: Number(form.min_quantity), cost_price: Number(form.cost_price) };
      if (editing) {
        const { error } = await supabase.from("stock").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("stock").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["stock"] }); setOpen(false); toast.success("Item salvo"); },
    onError: () => toast.error("Erro ao salvar item"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("stock").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["stock"] }); toast.success("Item removido"); },
    onError: () => toast.error("Erro ao remover"),
  });

  const openNew = () => { setEditing(null); setForm(empty()); setOpen(true); };
  const openEdit = (i: StockItem) => {
    setEditing(i);
    setForm({ name: i.name, quantity: i.quantity, min_quantity: i.min_quantity ?? 0, unit: i.unit ?? "", cost_price: i.cost_price ?? 0, notes: i.notes ?? "" });
    setOpen(true);
  };

  const set = (k: keyof ReturnType<typeof empty>) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Estoque</h1>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Novo Item</Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Qtd</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Preço de Custo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum item no estoque.</TableCell></TableRow>
            )}
            {items.map((item) => {
              const low = item.min_quantity != null && item.quantity <= item.min_quantity;
              return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.unit ?? "-"}</TableCell>
                  <TableCell>{item.cost_price ? brl(item.cost_price) : "-"}</TableCell>
                  <TableCell>
                    <Badge variant={low ? "destructive" : "secondary"}>{low ? "Baixo" : "OK"}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove.mutate(item.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Item" : "Novo Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Nome *</Label><Input value={form.name} onChange={set("name")} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Quantidade</Label><Input type="number" value={form.quantity} onChange={set("quantity")} /></div>
              <div className="space-y-1"><Label>Qtd Mínima</Label><Input type="number" value={form.min_quantity} onChange={set("min_quantity")} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Unidade</Label><Input value={form.unit} onChange={set("unit")} placeholder="un, kg, L..." /></div>
              <div className="space-y-1"><Label>Preço de Custo</Label><Input type="number" value={form.cost_price} onChange={set("cost_price")} /></div>
            </div>
            <div className="space-y-1"><Label>Observações</Label><Input value={form.notes} onChange={set("notes")} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => upsert.mutate()} disabled={!form.name.trim() || upsert.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
