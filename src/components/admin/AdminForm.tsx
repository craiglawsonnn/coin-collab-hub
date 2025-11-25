import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TableConfig, TableField } from "@/config/adminTables";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface AdminFormProps {
  config: TableConfig;
  record: any | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const AdminForm = ({ config, record, onSuccess, onCancel }: AdminFormProps) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [relationData, setRelationData] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (record) {
      setFormData(record);
    } else {
      const initialData: Record<string, any> = {};
      config.fields.forEach((field) => {
        if (field.type === "boolean") {
          initialData[field.name] = false;
        }
      });
      setFormData(initialData);
    }

    // Load relation data
    const loadRelations = async () => {
      const relations = config.fields.filter((f) => f.type === "relation");
      for (const field of relations) {
        if (field.relationTable) {
          const { data } = await supabase
            .from(field.relationTable as any)
            .select("*")
            .limit(100);
          if (data) {
            setRelationData((prev) => ({ ...prev, [field.name]: data }));
          }
        }
      }
    };
    loadRelations();
  }, [record, config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const editableData: Record<string, any> = {};
      config.fields.forEach((field) => {
        if (field.editable && formData[field.name] !== undefined) {
          editableData[field.name] = formData[field.name];
        }
      });

      if (record) {
        // Update
        const { error } = await supabase
          .from(config.name as any)
          .update(editableData)
          .eq(config.primaryKey, record[config.primaryKey]);
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from(config.name as any)
          .insert([editableData]);
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Record ${record ? "updated" : "created"} successfully`,
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field: TableField) => {
    if (!field.editable) return null;

    const value = formData[field.name] ?? "";

    switch (field.type) {
      case "text":
      case "number":
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={field.name}
              type={field.type}
              value={value}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  [field.name]: field.type === "number" ? Number(e.target.value) : e.target.value,
                })
              }
              required={field.required}
            />
          </div>
        );

      case "date":
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={field.name}
              type="date"
              value={value}
              onChange={(e) =>
                setFormData({ ...formData, [field.name]: e.target.value })
              }
              required={field.required}
            />
          </div>
        );

      case "boolean":
        return (
          <div key={field.name} className="flex items-center justify-between space-y-2">
            <Label htmlFor={field.name}>{field.label}</Label>
            <Switch
              id={field.name}
              checked={!!value}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, [field.name]: checked })
              }
            />
          </div>
        );

      case "select":
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Select
              value={value}
              onValueChange={(val) =>
                setFormData({ ...formData, [field.name]: val })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={`Select ${field.label}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case "relation":
        const relData = relationData[field.name] || [];
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Select
              value={value}
              onValueChange={(val) =>
                setFormData({ ...formData, [field.name]: val })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={`Select ${field.label}`} />
              </SelectTrigger>
              <SelectContent>
                {relData.map((item) => (
                  <SelectItem
                    key={item[field.relationValue!]}
                    value={item[field.relationValue!]}
                  >
                    {item[field.relationDisplay!] || item[field.relationValue!]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {record ? "Edit" : "Create"} {config.label}
          </DialogTitle>
          <DialogDescription>
            Fill in the form below to {record ? "update" : "create"} a record.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {config.fields.map(renderField)}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
