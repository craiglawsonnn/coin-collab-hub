import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";

interface TransactionFormProps {
  onClose: () => void;
}

export const TransactionForm = ({ onClose }: TransactionFormProps) => {
  const [type, setType] = useState<"income" | "expense">("expense");

  const categories = [
    "Salary",
    "Rent",
    "Groceries",
    "Utilities",
    "Crypto",
    "Transport",
    "Miscellaneous",
    "Entertainment",
  ];

  const accounts = ["Revolut", "BoI", "Cash", "Checking", "Savings"];
  const paymentMethods = ["Revolut", "BoI", "Cash", "Crypto"];

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in-0 zoom-in-95">
        <div className="sticky top-0 bg-card border-b p-6 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold">Add Transaction</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form className="p-6 space-y-6">
          {/* Transaction Type */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant={type === "expense" ? "default" : "outline"}
              onClick={() => setType("expense")}
              className={
                type === "expense"
                  ? "bg-destructive hover:bg-destructive/90"
                  : ""
              }
            >
              Expense
            </Button>
            <Button
              type="button"
              variant={type === "income" ? "default" : "outline"}
              onClick={() => setType("income")}
              className={
                type === "income"
                  ? "bg-success hover:bg-success/90"
                  : ""
              }
            >
              Income
            </Button>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              defaultValue={new Date().toISOString().split("T")[0]}
              className="bg-input"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select>
              <SelectTrigger className="bg-input">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat.toLowerCase()}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="What's this for?"
              className="bg-input"
            />
          </div>

          {/* Account */}
          <div className="space-y-2">
            <Label htmlFor="account">Account</Label>
            <Select>
              <SelectTrigger className="bg-input">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {accounts.map((acc) => (
                  <SelectItem key={acc} value={acc.toLowerCase()}>
                    {acc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="payment">Payment Method</Label>
            <Select>
              <SelectTrigger className="bg-input">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {paymentMethods.map((pm) => (
                  <SelectItem key={pm} value={pm.toLowerCase()}>
                    {pm}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount Fields */}
          {type === "income" ? (
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gross">Gross Income</Label>
                <Input
                  id="gross"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="bg-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax">Tax Paid</Label>
                <Input
                  id="tax"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="bg-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="net">Net Income</Label>
                <Input
                  id="net"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="bg-input"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="expense">Amount</Label>
              <Input
                id="expense"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="bg-input"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              Add Transaction
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
