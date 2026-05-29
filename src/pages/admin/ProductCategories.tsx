import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/lib/useRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Tags, Search } from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  active: boolean;
  created_at: string;
}

const COLOR_PRESETS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#6b7280"];

const empty = { id: "", name: "", description: "", color: COLOR_PRESETS[0], active: true };

export default function ProductCategories() {
  const { isAdmin } = useRoles();
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("product_categories")
      .select("*")
      .order("name");
    if (error) toast.error(error.message);
    setItems((data as Category[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openNew() { setForm(empty); setOpen(true); }
  function openEdit(c: Category) {
    setForm({
      id: c.id,
      name: c.name,
      description: c.description ?? "",
      color: c.color ?? COLOR_PRESETS[0],
      active: c.active,
    });
    setOpen(true);
  }

  async function save() {
    if (!form.name.trim()) { toast.error("Informe o nome"); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload: any = {
      name: form.name.trim(),
      description: form.description || null,
      color: form.color || null,
      active: form.active,
    };
    if (form.id) {
      const { error } = await supabase.from("product_categories").update(payload).eq("id", form.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Categoria atualizada");
    } else {
      payload.created_by = user?.id;
      payload.created_by_email = user?.email;
      const { error } = await supabase.from("product_categories").insert(payload);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Categoria criada");
    }
    setOpen(false);
    setSaving(false);
    load();
  }

  async function remove(c: Category) {
    if (!confirm(`Excluir categoria "${c.name}"?`)) return;
    const { error } = await supabase.from("product_categories").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Categoria excluída");
    load();
  }

  const filtered = items.filter(c =>
    !search || `${c.name} ${c.description ?? ""}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Tags className="h-7 w-7" /> Categorias de Produtos
          </h1>
          <p className="text-muted-foreground text-sm">Organize seus produtos em categorias</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Nova categoria</Button>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar categoria..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </Card>

      {loading ? (
        <div className="text-center text-muted-foreground py-12">Carregando...</div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          Nenhuma categoria cadastrada ainda.
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((c) => (
            <Card key={c.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: c.color || "#6b7280" }}
                  />
                  <h3 className="font-semibold truncate">{c.name}</h3>
                </div>
                {!c.active && <Badge variant="secondary">Inativa</Badge>}
              </div>
              {c.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{c.description}</p>
              )}
              <div className="flex gap-1 pt-2 border-t">
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => openEdit(c)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                {isAdmin && (
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-red-600 ml-auto" onClick={() => remove(c)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar categoria" : "Nova categoria"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Eletrônicos" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label>Cor</Label>
              <div className="flex gap-2 flex-wrap mt-2">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm({ ...form, color })}
                    className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
                      form.color === color ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="active">Categoria ativa</Label>
              <Switch id="active" checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}