import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Task {
  id: string;
  title: string;
  done: boolean;
  created_at: string;
}

export default function Tasks() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [title, setTitle] = useState("");

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async (t: string) => {
      const { error } = await supabase.from("tasks").insert({ title: t, done: false });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); setTitle(""); },
    onError: () => toast({ title: "Erro ao adicionar tarefa", variant: "destructive" }),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase.from("tasks").update({ done }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) add.mutate(title.trim());
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Tarefas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleAdd} className="flex gap-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nova tarefa..."
              className="flex-1"
            />
            <Button type="submit" disabled={!title.trim() || add.isPending}>
              <Plus className="h-4 w-4" />
            </Button>
          </form>

          {isLoading && <p className="text-muted-foreground text-sm">Carregando...</p>}

          <ul className="space-y-2">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted">
                <Checkbox
                  checked={task.done}
                  onCheckedChange={(v) => toggle.mutate({ id: task.id, done: !!v })}
                />
                <span className={`flex-1 text-sm ${task.done ? "line-through text-muted-foreground" : ""}`}>
                  {task.title}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => remove.mutate(task.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>

          {!isLoading && tasks.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-4">Nenhuma tarefa ainda.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
