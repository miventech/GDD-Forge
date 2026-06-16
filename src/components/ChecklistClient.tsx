"use client";
import { useState } from "react";
import { Plus, Trash2, GripVertical, CheckCircle2, Circle, Clock, Ban, Edit3, X, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Field } from "@/components/ui/Input";
import { DynamicIcon, ICON_OPTIONS } from "@/components/IconMap";
import { ACCENT_COLORS, AccentColor } from "@/lib/segment-types";
import { useTaskGroups, actions } from "@/lib/gdd-store";
import type { TaskGroup, Task, TaskStatus, TaskPriority } from "@/lib/gdd-file";
import { newId } from "@/lib/gdd-file";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

function getStatusMeta(t: (k: string) => string): Record<TaskStatus, { label: string; Icon: any; color: string }> {
  return {
    todo: { label: t("checklist.status.todo"), Icon: Circle, color: "ink-tertiary" },
    "in-progress": { label: t("checklist.status.inProgress"), Icon: Clock, color: "amber-dark" },
    done: { label: t("checklist.status.done"), Icon: CheckCircle2, color: "teal-dark" },
    blocked: { label: t("checklist.status.blocked"), Icon: Ban, color: "red" },
  };
}

function getPriorityMeta(t: (k: string) => string): Record<TaskPriority, { label: string; color: string }> {
  return {
    low: { label: t("checklist.priority.low"), color: "ink-tertiary" },
    medium: { label: t("checklist.priority.medium"), color: "amber" },
    high: { label: t("checklist.priority.high"), color: "red" },
  };
}

export function ChecklistClient() {
  const { t } = useT();
  const groups = useTaskGroups();
  const [addingGroup, setAddingGroup] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function patchGroups(next: TaskGroup[]) {
    actions.setTaskGroups(next);
  }

  function addGroup(payload: { name: string; color: AccentColor; icon: string }) {
    const group: TaskGroup = {
      id: newId(),
      name: payload.name,
      color: payload.color,
      icon: payload.icon,
      order: groups.length,
      tasks: [],
    };
    patchGroups([...groups, group]);
    setAddingGroup(false);
  }

  function updateGroup(groupId: string, patch: Partial<TaskGroup>) {
    patchGroups(groups.map((g) => (g.id === groupId ? { ...g, ...patch } : g)));
  }

  function deleteGroup(groupId: string) {
    if (!confirm(t("checklist.deleteGroupConfirm"))) return;
    patchGroups(groups.filter((g) => g.id !== groupId));
  }

  function addTask(groupId: string | null, title: string) {
    if (!title.trim()) return;
    const task: Task = {
      id: newId(),
      title,
      description: null,
      status: "todo",
      priority: "medium",
      order: 0,
      groupId,
    };
    if (groupId === null) {
      // ponytail: orphan tasks go to a synthetic "Sin grupo" group so the UI
      // doesn't need a special case. Kept here for backward compat with old .GDDs.
      const existing = groups.find((g) => g.id === "orphan");
      if (existing) {
        patchGroups(
          groups.map((g) => (g.id === "orphan" ? { ...g, tasks: [...g.tasks, { ...task, order: g.tasks.length }] } : g))
        );
      } else {
        patchGroups([
          ...groups,
          { id: "orphan", name: t("checklist.orphanName"), color: "purple", icon: "Inbox", order: 999, tasks: [{ ...task, order: 0 }] },
        ]);
      }
      return;
    }
    patchGroups(
      groups.map((g) =>
        g.id === groupId ? { ...g, tasks: [...g.tasks, { ...task, order: g.tasks.length }] } : g
      )
    );
  }

  function updateTask(taskId: string, patch: Partial<Task>) {
    patchGroups(
      groups.map((g) => ({
        ...g,
        tasks: g.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
      }))
    );
  }

  function deleteTask(taskId: string) {
    patchGroups(
      groups.map((g) => ({ ...g, tasks: g.tasks.filter((t) => t.id !== taskId) }))
    );
  }

  function moveTaskToGroup(taskId: string, fromGroupId: string | null, toGroupId: string | null) {
    let task: Task | undefined;
    const stripped = groups.map((g) => {
      const found = g.tasks.find((t) => t.id === taskId);
      if (found) task = found;
      return { ...g, tasks: g.tasks.filter((t) => t.id !== taskId) };
    });
    if (!task) return;
    const moved: Task = { ...task, groupId: toGroupId };
    patchGroups(
      stripped.map((g) => (g.id === toGroupId ? { ...g, tasks: [...g.tasks, moved] } : g))
    );
  }

  const totalTasks = groups.reduce((acc, g) => acc + g.tasks.length, 0);
  const doneTasks = groups.reduce(
    (acc, g) => acc + g.tasks.filter((t) => t.status === "done").length,
    0
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-medium text-ink-primary">{t("checklist.title")}</h1>
          <p className="text-sm text-ink-secondary mt-1">
            {totalTasks === 0
              ? t("checklist.subtitle.empty")
              : t("checklist.subtitle.progress", { done: doneTasks, total: totalTasks })}
          </p>
        </div>
        <Button onClick={() => setAddingGroup(true)}>
          <Plus className="w-4 h-4" /> {t("checklist.newGroup")}
        </Button>
      </div>

      {error ? (
        <div className="mb-4 p-3 rounded-md bg-red-light text-red-dark text-sm">{error}</div>
      ) : null}

      {addingGroup ? (
        <NewGroupForm
          onCancel={() => setAddingGroup(false)}
          onCreate={(p) => addGroup(p)}
        />
      ) : null}

      {groups.length === 0 ? (
        <div className="bg-bg-primary border border-dashed border-line-strong rounded-lg p-12 text-center">
          <div className="w-12 h-12 rounded-lg bg-coral-light text-coral-dark grid place-items-center mx-auto mb-4">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-medium text-ink-primary mb-1">{t("checklist.empty.title")}</h2>
          <p className="text-sm text-ink-secondary max-w-sm mx-auto mb-5">
            {t("checklist.empty.body")}
          </p>
          <Button onClick={() => setAddingGroup(true)}>
            <Plus className="w-4 h-4" /> {t("checklist.empty.cta")}
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <GroupBlock
              key={g.id}
              group={g}
              allGroups={groups}
              onUpdate={(p) => updateGroup(g.id, p)}
              onDelete={() => deleteGroup(g.id)}
              onAddTask={(t) => addTask(g.id, t)}
              onUpdateTask={updateTask}
              onDeleteTask={deleteTask}
              onMoveTask={moveTaskToGroup}
            />
          ))}
        </div>
      )}

      {groups.length > 0 ? (
        <div className="mt-6">
          <QuickAdd onAdd={(t) => addTask(null, t)} />
        </div>
      ) : null}
    </div>
  );
}

function GroupBlock({
  group, allGroups, onUpdate, onDelete, onAddTask, onUpdateTask, onDeleteTask, onMoveTask,
}: {
  group: TaskGroup;
  allGroups: TaskGroup[];
  onUpdate: (p: Partial<TaskGroup>) => void;
  onDelete: () => void;
  onAddTask: (title: string) => void;
  onUpdateTask: (id: string, p: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  onMoveTask: (taskId: string, from: string | null, to: string | null) => void;
}) {
  const { t } = useT();
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(group.name);
  const [draftColor, setDraftColor] = useState<AccentColor>(group.color);
  const [draftIcon, setDraftIcon] = useState(group.icon);
  const [newTask, setNewTask] = useState("");

  const done = group.tasks.filter((t) => t.status === "done").length;
  const total = group.tasks.length;

  return (
    <section className="bg-bg-primary border border-line rounded-lg overflow-hidden">
      <header
        className="px-4 py-3 flex items-center gap-3 border-b border-line"
        style={{ background: `var(--${group.color}-light)` }}
      >
        <div
          className="w-8 h-8 rounded-md grid place-items-center"
          style={{ background: "rgba(255,255,255,0.45)" }}
        >
          <DynamicIcon name={group.icon} size={14} className="text-ink-primary" />
        </div>
        {editing ? (
          <div className="flex-1 flex items-center gap-2 flex-wrap">
            <Input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              className="max-w-[200px]"
            />
            <select value={draftIcon} onChange={(e) => setDraftIcon(e.target.value)} className="max-w-[160px]">
              {ICON_OPTIONS.map((ic) => (
                <option key={ic} value={ic}>{ic}</option>
              ))}
            </select>
            <div className="flex gap-1">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setDraftColor(c)}
                  className={cn(
                    "w-6 h-6 rounded border",
                    draftColor === c && "ring-2 ring-purple"
                  )}
                  style={{ background: `var(--${c}-mid)` }}
                />
              ))}
            </div>
            <Button
              size="sm"
              onClick={() => {
                onUpdate({ name: draftName, color: draftColor, icon: draftIcon });
                setEditing(false);
              }}
            >
              <Check className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : (
          <>
            <h2 className="text-sm font-medium text-ink-primary flex-1">{group.name}</h2>
            <span className="text-xs text-ink-secondary">
              {done}/{total}
            </span>
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 text-ink-secondary hover:text-ink-primary"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-ink-tertiary hover:text-red"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </header>

      <div className="divide-y divide-line">
        {group.tasks.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-ink-tertiary">
            {t("checklist.emptyTasksInGroup")}
          </div>
        ) : (
          group.tasks.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              currentGroupId={group.id}
              allGroups={allGroups}
              onUpdate={(p) => onUpdateTask(t.id, p)}
              onDelete={() => onDeleteTask(t.id)}
              onMoveTo={(to) => onMoveTask(t.id, group.id, to)}
            />
          ))
        )}
      </div>

      <div className="px-4 py-2.5 border-t border-line bg-bg-secondary/50 flex items-center gap-2">
        <Plus className="w-3.5 h-3.5 text-ink-tertiary" />
        <Input
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder={t("checklist.task.placeholder")}
          className="bg-bg-primary"
          onKeyDown={(e) => {
            if (e.key === "Enter" && newTask.trim()) {
              onAddTask(newTask);
              setNewTask("");
            }
          }}
        />
        <Button
          size="sm"
          onClick={() => {
            if (newTask.trim()) {
              onAddTask(newTask);
              setNewTask("");
            }
          }}
        >
          {t("common.add")}
        </Button>
      </div>
    </section>
  );
}

function TaskRow({
  task, currentGroupId, allGroups, onUpdate, onDelete, onMoveTo,
}: {
  task: Task;
  currentGroupId: string;
  allGroups: TaskGroup[];
  onUpdate: (p: Partial<Task>) => void;
  onDelete: () => void;
  onMoveTo: (groupId: string | null) => void;
}) {
  const { t } = useT();
  const STATUS_META = getStatusMeta(t);
  const PRIORITY_META = getPriorityMeta(t);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [desc, setDesc] = useState(task.description || "");

  const StatusIcon = STATUS_META[task.status].Icon;

  return (
    <div className="px-4 py-2.5 flex items-start gap-3 group/task hover:bg-bg-secondary/40 transition-colors">
      <button
        onClick={() => {
          const next = task.status === "done" ? "todo" : "done";
          onUpdate({ status: next });
        }}
        className="mt-0.5"
        title={STATUS_META[task.status].label}
      >
        <StatusIcon
          className={cn(
            "w-4 h-4",
            task.status === "done" ? "text-teal-dark" : "text-ink-tertiary hover:text-ink-secondary"
          )}
        />
      </button>

      {editing ? (
        <div className="flex-1 space-y-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="min-h-[60px]"
            placeholder={t("checklist.task.notesPlaceholder")}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onUpdate({ title, description: desc || null });
                setEditing(false);
              }}
            >
              {t("common.save")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm text-ink-primary cursor-pointer",
              task.status === "done" && "line-through text-ink-tertiary"
            )}
            onClick={() => setEditing(true)}
          >
            {task.title}
          </p>
          {task.description ? (
            <p className="text-xs text-ink-tertiary mt-0.5 line-clamp-2">{task.description}</p>
          ) : null}
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <select
              value={task.status}
              onChange={(e) => onUpdate({ status: e.target.value as TaskStatus })}
              className="text-[10px] h-5 py-0 px-1.5 max-w-[110px]"
            >
              {Object.entries(STATUS_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <select
              value={task.priority}
              onChange={(e) => onUpdate({ priority: e.target.value as TaskPriority })}
              className="text-[10px] h-5 py-0 px-1.5 max-w-[90px]"
            >
              {Object.entries(PRIORITY_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            {allGroups.length > 1 ? (
              <select
                value={currentGroupId}
                onChange={(e) => onMoveTo(e.target.value === currentGroupId ? currentGroupId : e.target.value)}
                className="text-[10px] h-5 py-0 px-1.5 max-w-[120px]"
                title={t("checklist.task.moveTo")}
              >
                {allGroups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            ) : null}
          </div>
        </div>
      )}

      {!editing ? (
        <button
          onClick={onDelete}
          className="opacity-0 group-hover/task:opacity-100 p-1 text-ink-tertiary hover:text-red transition-opacity"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      ) : null}
    </div>
  );
}

function NewGroupForm({
  onCancel, onCreate,
}: {
  onCancel: () => void;
  onCreate: (p: { name: string; color: AccentColor; icon: string }) => void;
}) {
  const { t } = useT();
  const [name, setName] = useState("");
  const [color, setColor] = useState<AccentColor>("purple");
  const [icon, setIcon] = useState("ListChecks");

  return (
    <div className="bg-bg-primary border border-line rounded-lg p-4 mb-5 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr,180px,180px,auto] gap-2 items-end">
        <Field label={t("checklist.newGroup.name")}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("checklist.newGroup.placeholder")}
            autoFocus
          />
        </Field>
        <Field label="Icono">
          <select value={icon} onChange={(e) => setIcon(e.target.value)}>
            {ICON_OPTIONS.map((ic) => (
              <option key={ic} value={ic}>{ic}</option>
            ))}
          </select>
        </Field>
        <Field label={t("checklist.newGroup.color")}>
          <div className="flex gap-1">
            {ACCENT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={cn(
                  "flex-1 h-9 rounded border",
                  color === c && "ring-2 ring-purple"
                )}
                style={{ background: `var(--${c}-mid)` }}
              />
            ))}
          </div>
        </Field>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={() => {
              if (name.trim()) onCreate({ name, color, icon });
            }}
          >
            {t("common.create")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function QuickAdd({ onAdd }: { onAdd: (title: string) => void }) {
  const { t } = useT();
  const [val, setVal] = useState("");
  return (
    <div className="flex items-center gap-2 bg-bg-primary border border-dashed border-line-strong rounded-md px-3 py-2">
      <Plus className="w-3.5 h-3.5 text-ink-tertiary" />
      <Input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder={t("checklist.quickAddPlaceholder")}
        className="border-0 bg-transparent"
        onKeyDown={(e) => {
          if (e.key === "Enter" && val.trim()) {
            onAdd(val);
            setVal("");
          }
        }}
      />
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          if (val.trim()) {
            onAdd(val);
            setVal("");
          }
        }}
      >
        {t("common.add")}
      </Button>
    </div>
  );
}
