import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEPARTMENTS, departmentCopy, type Department } from "@/lib/department";

export function DepartmentField({ defaultValue }: { defaultValue: Department }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="department">Department</Label>
      <Select name="department" defaultValue={defaultValue} required>
        <SelectTrigger id="department" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DEPARTMENTS.map((d) => (
            <SelectItem key={d} value={d}>
              {departmentCopy(d).label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
