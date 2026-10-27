"use client";

import type { ComponentRow } from "@/lib/server/forms/logs";
import { componentSchema } from "@/lib/schemas/forms";
import { LogTable, type Option } from "./log-table";
import { none } from "./options";

/** The team's components (workbook assemblies/parts), used on LOGT, LOGD, TASK and SUMS. */
export function ComponentsManager({ teamId, rows, canEdit, teammates }: { teamId: string; rows: ComponentRow[]; canEdit: boolean; teammates: Option[] }) {
  return (
    <LogTable<ComponentRow>
      rows={rows}
      canEdit={canEdit}
      schema={componentSchema}
      createUrl={`/api/teams/${teamId}/components`}
      rowUrl={(id) => `/api/teams/${teamId}/components/${id}`}
      addLabel="Add component"
      emptyText="No components yet. Add the app's main parts (e.g. Login, Item listing, AI matching, SRS document)."
      fields={[
        { name: "name", label: "Name", type: "text", wide: true },
        { name: "kind", label: "Type", type: "select", options: [{ value: "ASSEMBLY", label: "Assembly" }, { value: "PART", label: "Part" }] },
        { name: "parentId", label: "Part of", type: "select", options: [none(), ...rows.map((r) => ({ value: r.id, label: r.name }))] },
        { name: "ownerMembershipId", label: "Owner", type: "select", options: [none(), ...teammates] },
      ]}
      emptyValues={() => ({ name: "", kind: "ASSEMBLY", parentId: "", ownerMembershipId: "" })}
      toValues={(r) => ({ name: r.name, kind: r.kind, parentId: r.parentId ?? "", ownerMembershipId: r.ownerMembershipId ?? "" })}
      columns={[
        { key: "name", label: "Component", render: (r) => r.name },
        { key: "kind", label: "Type", render: (r) => (r.kind === "ASSEMBLY" ? "Assembly" : "Part") },
        { key: "parent", label: "Part of", render: (r) => r.parentName ?? "—" },
        { key: "owner", label: "Owner", render: (r) => r.ownerName ?? "—" },
      ]}
    />
  );
}
