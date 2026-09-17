import React from "react";
import { Plus, X } from "lucide-react";
import IconPicker from "./IconPicker";
import { OPPORTUNITY_LIMITS as L } from "./opportunityForm";

// Inline editors for each opportunity block type. Each receives the raw block
// and calls onChange(nextBlock) — sanitization happens server-side on save.

const inputCls =
  "h-8 px-2 w-full bg-white border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 outline-none focus:border-[#083262]/50 placeholder:text-slate-300 disabled:opacity-50";

const RemoveBtn = ({ onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="w-6 h-6 flex items-center justify-center rounded-md text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-40"
  >
    <X className="w-3.5 h-3.5" />
  </button>
);

const AddBtn = ({ onClick, disabled, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="h-7 px-2.5 flex items-center gap-1 rounded-lg border border-dashed border-slate-300 text-[10px] font-bold text-slate-500 hover:border-[#083262]/50 hover:text-[#083262] transition-colors cursor-pointer disabled:opacity-40"
  >
    <Plus className="w-3 h-3" />
    {children}
  </button>
);

const patchAt = (arr, i, next) => arr.map((v, idx) => (idx === i ? next : v));
const dropAt = (arr, i) => arr.filter((_, idx) => idx !== i);

const StatsGridEditor = ({ block, onChange, disabled }) => {
  const items = block.items || [];
  const set = (items2) => onChange({ ...block, items: items2 });
  return (
    <div className="flex flex-col gap-1.5">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <IconPicker
            value={it.icon}
            disabled={disabled}
            onChange={(icon) => set(patchAt(items, i, { ...it, icon }))}
          />
          <input
            className={inputCls}
            placeholder="Label"
            value={it.label || ""}
            disabled={disabled}
            onChange={(e) => set(patchAt(items, i, { ...it, label: e.target.value }))}
          />
          <input
            className={inputCls}
            placeholder="Value"
            value={it.value || ""}
            disabled={disabled}
            onChange={(e) => set(patchAt(items, i, { ...it, value: e.target.value }))}
          />
          <RemoveBtn disabled={disabled} onClick={() => set(dropAt(items, i))} />
        </div>
      ))}
      <div>
        <AddBtn
          disabled={disabled || items.length >= L.STATS_ITEMS_MAX}
          onClick={() => set([...items, { icon: "clock", label: "", value: "" }])}
        >
          Cell ({items.length}/{L.STATS_ITEMS_MAX})
        </AddBtn>
      </div>
    </div>
  );
};

const KVTableEditor = ({ block, onChange, disabled }) => {
  const rows = block.rows || [];
  const set = (rows2) => onChange({ ...block, rows: rows2 });
  return (
    <div className="flex flex-col gap-1.5">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <input
            className={inputCls}
            placeholder="Label (left)"
            value={r.label || ""}
            disabled={disabled}
            onChange={(e) => set(patchAt(rows, i, { ...r, label: e.target.value }))}
          />
          <input
            className={inputCls}
            placeholder="Value (right)"
            value={r.value || ""}
            disabled={disabled}
            onChange={(e) => set(patchAt(rows, i, { ...r, value: e.target.value }))}
          />
          <IconPicker
            value={r.icon}
            disabled={disabled}
            onChange={(icon) => set(patchAt(rows, i, { ...r, icon }))}
          />
          <RemoveBtn disabled={disabled} onClick={() => set(dropAt(rows, i))} />
        </div>
      ))}
      <div>
        <AddBtn
          disabled={disabled || rows.length >= L.KV_ROWS_MAX}
          onClick={() => set([...rows, { label: "", value: "", icon: "" }])}
        >
          Row ({rows.length}/{L.KV_ROWS_MAX})
        </AddBtn>
      </div>
    </div>
  );
};

const TableEditor = ({ block, onChange, disabled }) => {
  const columns = block.columns || [];
  // Rows are {icon, cells[]} — first column shows the icon. Legacy plain
  // string-array rows are normalized for editing.
  const rows = (block.rows || []).map((r) =>
    Array.isArray(r) ? { icon: "", cells: r } : { icon: "", cells: [], ...(r || {}) },
  );
  const set = (patch) => onChange({ ...block, ...patch });

  const setColumns = (cols) => {
    // Keep every body row aligned with the column count.
    const rows2 = rows.map((r) => {
      const next = (r.cells || []).slice(0, cols.length);
      while (next.length < cols.length) next.push("");
      return { ...r, cells: next };
    });
    set({ columns: cols, rows: rows2 });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        {columns.map((c, i) => (
          <div key={i} className="flex-1 flex items-center gap-1">
            <input
              className={inputCls}
              placeholder={`Column ${i + 1}`}
              value={c || ""}
              disabled={disabled}
              onChange={(e) => setColumns(patchAt(columns, i, e.target.value))}
            />
            <RemoveBtn
              disabled={disabled || columns.length <= L.TABLE_COLS_MIN}
              onClick={() => setColumns(dropAt(columns, i))}
            />
          </div>
        ))}
        <AddBtn
          disabled={disabled || columns.length >= L.TABLE_COLS_MAX}
          onClick={() => setColumns([...columns, ""])}
        >
          Col ({columns.length}/{L.TABLE_COLS_MAX})
        </AddBtn>
      </div>
      {rows.map((r, ri) => (
        <div key={ri} className="flex items-center gap-1.5">
          <IconPicker
            value={r.icon}
            disabled={disabled}
            onChange={(icon) => set({ rows: patchAt(rows, ri, { ...r, icon }) })}
          />
          {columns.map((_, ci) => (
            <input
              key={ci}
              className={`${inputCls} flex-1`}
              placeholder={columns[ci] || `Cell ${ci + 1}`}
              value={(r.cells || [])[ci] || ""}
              disabled={disabled}
              onChange={(e) =>
                set({
                  rows: patchAt(rows, ri, {
                    ...r,
                    cells: patchAt(r.cells || [], ci, e.target.value),
                  }),
                })
              }
            />
          ))}
          <RemoveBtn disabled={disabled} onClick={() => set({ rows: dropAt(rows, ri) })} />
        </div>
      ))}
      <div>
        <AddBtn
          disabled={disabled || rows.length >= L.TABLE_ROWS_MAX}
          onClick={() =>
            set({ rows: [...rows, { icon: "", cells: columns.map(() => "") }] })
          }
        >
          Row ({rows.length}/{L.TABLE_ROWS_MAX})
        </AddBtn>
      </div>
    </div>
  );
};

const FlowEditor = ({ block, onChange, disabled }) => {
  const rows = block.rows || [];
  const set = (patch) => onChange({ ...block, ...patch });
  return (
    <div className="flex flex-col gap-2">
      {rows.map((r, ri) => (
        <div key={ri} className="border border-slate-100 rounded-lg p-2 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold text-slate-400 uppercase shrink-0 w-12">
              Row {ri + 1}
            </span>
            <input
              className={inputCls}
              placeholder="Right-side label (optional)"
              value={r.label || ""}
              disabled={disabled}
              onChange={(e) =>
                set({ rows: patchAt(rows, ri, { ...r, label: e.target.value }) })
              }
            />
            <RemoveBtn disabled={disabled} onClick={() => set({ rows: dropAt(rows, ri) })} />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {(r.items || []).map((t, ti) => (
              <div key={ti} className="flex items-center gap-1">
                <input
                  className={`${inputCls} w-24`}
                  placeholder={`Title ${ti + 1}`}
                  value={t || ""}
                  disabled={disabled}
                  onChange={(e) =>
                    set({
                      rows: patchAt(rows, ri, {
                        ...r,
                        items: patchAt(r.items, ti, e.target.value),
                      }),
                    })
                  }
                />
                <RemoveBtn
                  disabled={disabled || (r.items || []).length <= 1}
                  onClick={() =>
                    set({
                      rows: patchAt(rows, ri, { ...r, items: dropAt(r.items, ti) }),
                    })
                  }
                />
              </div>
            ))}
            <AddBtn
              disabled={disabled || (r.items || []).length >= L.FLOW_ITEMS_MAX}
              onClick={() =>
                set({
                  rows: patchAt(rows, ri, { ...r, items: [...(r.items || []), ""] }),
                })
              }
            >
              Title ({(r.items || []).length}/{L.FLOW_ITEMS_MAX})
            </AddBtn>
          </div>
        </div>
      ))}
      <div className="flex items-center gap-1.5">
        <AddBtn
          disabled={disabled || rows.length >= L.FLOW_ROWS_MAX}
          onClick={() => set({ rows: [...rows, { label: "", items: [""] }] })}
        >
          Flow row ({rows.length}/{L.FLOW_ROWS_MAX})
        </AddBtn>
      </div>
      <input
        className={inputCls}
        placeholder="Alert note (optional — shows with a warning icon)"
        value={block.note || ""}
        disabled={disabled}
        onChange={(e) => set({ note: e.target.value })}
      />
    </div>
  );
};

const ProcessEditor = ({ block, onChange, disabled }) => {
  const items = block.items || [];
  const set = (items2) => onChange({ ...block, items: items2 });
  return (
    <div className="flex flex-col gap-2">
      {items.map((it, i) => (
        <div key={i} className="border border-slate-100 rounded-lg p-2 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-[#083262] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
              {i + 1}
            </span>
            <input
              className={inputCls}
              placeholder={`Step ${i + 1} title`}
              value={it.title || ""}
              disabled={disabled}
              onChange={(e) => set(patchAt(items, i, { ...it, title: e.target.value }))}
            />
            <RemoveBtn disabled={disabled} onClick={() => set(dropAt(items, i))} />
          </div>
          {(it.points || []).map((p, pi) => (
            <div key={pi} className="flex items-center gap-1.5 pl-6">
              <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0" />
              <input
                className={inputCls}
                placeholder={`Point ${pi + 1}`}
                value={p || ""}
                disabled={disabled}
                onChange={(e) =>
                  set(
                    patchAt(items, i, {
                      ...it,
                      points: patchAt(it.points, pi, e.target.value),
                    }),
                  )
                }
              />
              <RemoveBtn
                disabled={disabled}
                onClick={() =>
                  set(
                    patchAt(items, i, { ...it, points: dropAt(it.points, pi) }),
                  )
                }
              />
            </div>
          ))}
          <div className="pl-6">
            <AddBtn
              disabled={disabled || (it.points || []).length >= L.PROCESS_POINTS_MAX}
              onClick={() =>
                set(patchAt(items, i, { ...it, points: [...(it.points || []), ""] }))
              }
            >
              Point ({(it.points || []).length}/{L.PROCESS_POINTS_MAX})
            </AddBtn>
          </div>
        </div>
      ))}
      <div>
        <AddBtn
          disabled={disabled || items.length >= L.PROCESS_ITEMS_MAX}
          onClick={() => set([...items, { title: "", points: [""] }])}
        >
          Step ({items.length}/{L.PROCESS_ITEMS_MAX})
        </AddBtn>
      </div>
    </div>
  );
};

const BLOCK_EDITORS = {
  stats_grid: StatsGridEditor,
  kv_table: KVTableEditor,
  table: TableEditor,
  flow: FlowEditor,
  process: ProcessEditor,
};

const BlockEditor = ({ block, onChange, disabled }) => {
  const Cmp = BLOCK_EDITORS[block.type];
  if (!Cmp) {
    return (
      <p className="text-[10px] text-slate-400 font-medium">
        Unknown block type “{block.type}” — it will be dropped on save.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <input
        className={inputCls}
        placeholder="Block title (optional — shown above the block)"
        value={block.title || ""}
        disabled={disabled}
        onChange={(e) => onChange({ ...block, title: e.target.value })}
      />
      <Cmp block={block} onChange={onChange} disabled={disabled} />
    </div>
  );
};

export default BlockEditor;
