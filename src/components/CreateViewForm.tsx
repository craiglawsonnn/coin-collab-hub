import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { RadioGroup, Radio } from "@/components/ui/radio-group";

interface Props {
  transactions: any[];
  onCreate: (view: any) => void;
}

export default function CreateViewForm({ transactions, onCreate }: Props) {
  const [type, setType] = useState<"wallet" | "category">("wallet");
  const [chart, setChart] = useState<"pie" | "bar">("pie");
  const [name, setName] = useState("");
  const accounts = useMemo(() => Array.from(new Set((transactions || []).map((t: any) => t.account).filter(Boolean))), [transactions]);
  const categories = useMemo(() => Array.from(new Set((transactions || []).map((t: any) => t.category).filter(Boolean))), [transactions]);
  const [selectedAccount, setSelectedAccount] = useState<string>(accounts[0] || "");
  const [selectedCategory, setSelectedCategory] = useState<string>(categories[0] || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const view = { id: Date.now().toString(), name: name || (type === "wallet" ? `Wallet: ${selectedAccount}` : `Category: ${selectedCategory}`), type, chart, account: selectedAccount, category: selectedCategory };
    onCreate(view);
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 py-4">
      <div>
        <label className="text-sm font-medium">View name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional name" />
      </div>

      <div>
        <label className="text-sm font-medium">View type</label>
        <Select value={type} onValueChange={(v) => setType(v as any)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="wallet">Wallet</SelectItem>
            <SelectItem value="category">Category insight</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {type === "wallet" ? (
        <div>
          <label className="text-sm font-medium">Wallet</label>
          <Select value={selectedAccount} onValueChange={(v) => setSelectedAccount(v as any)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {accounts.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div>
          <label className="text-sm font-medium">Category</label>
          <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as any)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <label className="text-sm font-medium">Chart type</label>
        <Select value={chart} onValueChange={(v) => setChart(v as any)}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pie">Pie</SelectItem>
            <SelectItem value="bar">Bar</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end">
        <Button type="submit">Create</Button>
      </div>
    </form>
  );
}
