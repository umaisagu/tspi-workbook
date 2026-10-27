"use client";

import { useRouter } from "next/navigation";
import { Fragment, useMemo, useState, type ReactNode } from "react";
import type { ZodType } from "zod";
import { Alert, Button, Field, Input, Select, sendJson, type FieldErrors } from "@/components/ui/form";
import { fieldErrorsFrom } from "@/lib/schemas/errors";

export type FormValues = Record<string, string>;

export interface Option {
  value: string;
  label: string;
}

export interface FieldDef {
  name: string;
  label: string;
  type: "date" | "time" | "number" | "text" | "textarea" | "select" | "url";
  options?: Option[];
  hint?: string;
  placeholder?: string;
  /** Grid span in the editor (1 or 2 of 4 columns on wide screens; textareas span all). */
  wide?: boolean;
}

export interface ColumnDef<Row> {
  key: string;
  label: string;
  render: (row: Row) => ReactNode;
  className?: string;
}

export interface BaseRow {
  id: string;
  week?: number;
}

/**
 * Editable table used by the log forms: add/edit/delete rows through the API, inline Zod
 * validation (the same schema the server uses), and filters by week and phase.
 */
export function LogTable<Row extends BaseRow>({
  title,
  rows,
  columns,
  fields,
  schema,
  emptyValues,
  toValues,
  createUrl,
  rowUrl,
  canEdit,
  phaseOf,
  phaseLabel,
  footer,
  expand,
  preview,
  addLabel = "Add entry",
  emptyText = "No entries yet.",
  allowAdd = true,
  allowDelete = true,
  updateMethod = "PATCH",
  editLabel = "Edit",
  canEditRow,
  filterLabel = "Phase",
}: {
  title?: string;
  rows: Row[];
  columns: ColumnDef<Row>[];
  fields: FieldDef[];
  schema: ZodType;
  emptyValues: () => FormValues;
  toValues: (row: Row) => FormValues;
  createUrl: string;
  rowUrl: (id: string) => string;
  canEdit: boolean;
  phaseOf?: (row: Row) => string;
  phaseLabel?: (phase: string) => string;
  footer?: (visible: Row[]) => ReactNode;
  expand?: (row: Row) => ReactNode;
  /** Live, computed hint shown in the editor (e.g. LOGT delta time). */
  preview?: (values: FormValues) => ReactNode;
  addLabel?: string;
  emptyText?: string;
  /** Rows are created elsewhere (e.g. SUMS sizes edit existing components). */
  allowAdd?: boolean;
  allowDelete?: boolean;
  updateMethod?: "PATCH" | "PUT";
  editLabel?: string;
  /** Per-row edit rights when `canEdit` only means "may add" (e.g. members edit their own LOGTEST rows). */
  canEditRow?: (row: Row) => boolean;
  /** Label of the second filter (defaults to Phase). */
  filterLabel?: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<{ id: string | null; values: FormValues } | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [week, setWeek] = useState("");
  const [phase, setPhase] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());

  const weeks = useMemo(() => [...new Set(rows.map((r) => r.week).filter((w): w is number => w !== undefined))].sort((a, b) => a - b), [rows]);
  const phases = useMemo(() => (phaseOf ? [...new Set(rows.map(phaseOf))] : []), [rows, phaseOf]);
  const visible = rows.filter((r) => (!week || String(r.week) === week) && (!phase || phaseOf?.(r) === phase));

  function validate(values: FormValues): boolean {
    const r = schema.safeParse(values);
    setErrors(r.success ? {} : fieldErrorsFrom(r.error));
    return r.success;
  }

  function set(name: string, value: string) {
    if (!editing) return;
    const values = { ...editing.values, [name]: value };
    setEditing({ ...editing, values });
    if (Object.keys(errors).length) validate(values);
  }

  async function save() {
    if (!editing) return;
    setFormError(undefined);
    if (!validate(editing.values)) return;
    setPending(true);
    const r = editing.id ? await sendJson(rowUrl(editing.id), updateMethod, editing.values) : await sendJson(createUrl, "POST", editing.values);
    setPending(false);
    if (!r.ok) {
      setFormError(r.error);
      setErrors(r.fields ?? {});
      return;
    }
    setEditing(null);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this entry? It is kept in the audit trail.")) return;
    const r = await sendJson(rowUrl(id), "DELETE");
    if (!r.ok) setFormError(r.error);
    if (editing?.id === id) setEditing(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          {title && <h2 className="self-center text-base font-semibold">{title}</h2>}
          <label className="text-sm">
            <span className="mr-1 text-slate-600">Week</span>
            <Select value={week} onChange={(e) => setWeek(e.target.value)} className="w-auto">
              <option value="">All</option>
              {weeks.map((w) => (
                <option key={w} value={w}>
                  Week {w}
                </option>
              ))}
            </Select>
          </label>
          {phaseOf && (
            <label className="text-sm">
              <span className="mr-1 text-slate-600">{filterLabel}</span>
              <Select value={phase} onChange={(e) => setPhase(e.target.value)} className="w-auto">
                <option value="">All</option>
                {phases.map((p) => (
                  <option key={p} value={p}>
                    {phaseLabel ? phaseLabel(p) : p}
                  </option>
                ))}
              </Select>
            </label>
          )}
        </div>
        {canEdit && allowAdd && !editing && (
          <Button
            onClick={() => {
              setErrors({});
              setFormError(undefined);
              setEditing({ id: null, values: emptyValues() });
            }}
          >
            {addLabel}
          </Button>
        )}
      </div>

      {editing && (
        <form
          className="space-y-3 rounded-lg border border-blue-200 bg-blue-50/40 p-3 sm:p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          noValidate
        >
          <h3 className="text-sm font-semibold">{editing.id ? editLabel : addLabel}</h3>
          {formError && <Alert>{formError}</Alert>}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {fields.map((f) => (
              <div key={f.name} className={f.type === "textarea" ? "sm:col-span-2 lg:col-span-4" : f.wide ? "sm:col-span-2" : ""}>
                <Field label={f.label} error={errors[f.name]} hint={f.hint}>
                  {f.type === "select" ? (
                    <Select value={editing.values[f.name] ?? ""} onChange={(e) => set(f.name, e.target.value)} invalid={!!errors[f.name]}>
                      {f.options?.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  ) : f.type === "textarea" ? (
                    <textarea
                      value={editing.values[f.name] ?? ""}
                      onChange={(e) => set(f.name, e.target.value)}
                      rows={3}
                      placeholder={f.placeholder}
                      aria-invalid={!!errors[f.name] || undefined}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base shadow-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 aria-[invalid=true]:border-red-500 sm:text-sm"
                    />
                  ) : (
                    <Input
                      type={f.type}
                      inputMode={f.type === "number" ? "numeric" : undefined}
                      value={editing.values[f.name] ?? ""}
                      placeholder={f.placeholder}
                      onChange={(e) => set(f.name, e.target.value)}
                      invalid={!!errors[f.name]}
                    />
                  )}
                </Field>
              </div>
            ))}
          </div>
          {preview && <div className="text-sm text-slate-700">{preview(editing.values)}</div>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="-mx-4 overflow-x-auto sm:mx-0">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-600">
              {expand && <th className="w-8" />}
              {columns.map((c) => (
                <th key={c.key} className={`px-2 py-2 font-medium whitespace-nowrap ${c.className ?? ""}`}>
                  {c.label}
                </th>
              ))}
              {canEdit && <th className="px-2 py-2" />}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <Fragment key={row.id}>
                <tr className={`border-b border-slate-100 align-top ${editing?.id === row.id ? "bg-blue-50" : ""}`}>
                  {expand && (
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        aria-label={open.has(row.id) ? "Hide details" : "Show details"}
                        className="text-slate-500 hover:text-slate-900"
                        onClick={() => {
                          const next = new Set(open);
                          if (next.has(row.id)) next.delete(row.id);
                          else next.add(row.id);
                          setOpen(next);
                        }}
                      >
                        {open.has(row.id) ? "▾" : "▸"}
                      </button>
                    </td>
                  )}
                  {columns.map((c) => (
                    <td key={c.key} className={`px-2 py-2 ${c.className ?? ""}`}>
                      {c.render(row)}
                    </td>
                  ))}
                  {canEdit && (
                    <td className="px-2 py-2 text-right whitespace-nowrap">
                      {(canEditRow?.(row) ?? true) && (
                        <>
                          <button
                            type="button"
                            className="mr-3 text-blue-700 hover:underline"
                            onClick={() => {
                              setErrors({});
                              setFormError(undefined);
                              setEditing({ id: row.id, values: toValues(row) });
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                          >
                            {editLabel}
                          </button>
                          {allowDelete && (
                            <button type="button" className="text-red-700 hover:underline" onClick={() => remove(row.id)}>
                              Delete
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  )}
                </tr>
                {expand && open.has(row.id) && (
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <td />
                    <td colSpan={columns.length + (canEdit ? 1 : 0)} className="px-2 py-3">
                      {expand(row)}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={columns.length + 2} className="px-2 py-4 text-slate-500">
                  {rows.length === 0 ? emptyText : "No entries match the filters."}
                </td>
              </tr>
            )}
          </tbody>
          {footer && visible.length > 0 && <tfoot>{footer(visible)}</tfoot>}
        </table>
      </div>
    </div>
  );
}
