import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toggle } from "@/components/ui/toggle";

type Props = {
  options: string[];
  value: string;
  onChange: (v: string) => void;
};

/**
 * Renders a grid of defect checkboxes + a free-text "Outros" field.
 * Value is stored as a comma-separated string so it fits the existing TEXT column.
 */
export function DefectChecklist({ options, value, onChange }: Props) {
  const { selected, other } = useMemo(() => {
    const parts = (value || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const sel = new Set<string>();
    const extras: string[] = [];
    for (const p of parts) {
      if (options.includes(p)) sel.add(p);
      else extras.push(p);
    }
    return { selected: sel, other: extras.join(", ") };
  }, [value, options]);

  const emit = (sel: Set<string>, ot: string) => {
    const list = [...options.filter((o) => sel.has(o))];
    const otTrim = ot.trim();
    if (otTrim) list.push(otTrim);
    onChange(list.join(", "));
  };

  const toggle = (opt: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(opt);
    else next.delete(opt);
    emit(next, other);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 rounded-md border bg-muted/30 p-3">
        {options.map((opt) => (
          <Toggle
            key={opt}
            size="sm"
            variant="outline"
            pressed={selected.has(opt)}
            onPressedChange={(p) => toggle(opt, p)}
            className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary"
          >
            {opt}
          </Toggle>
        ))}
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Outros (separe por vírgula)</Label>
        <Input
          value={other}
          onChange={(e) => emit(selected, e.target.value)}
          placeholder="Descreva outros defeitos..."
        />
      </div>
    </div>
  );
}