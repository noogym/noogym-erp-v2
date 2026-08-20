import {
  Ban,
  Edit,
  Eye,
  KeyRound,
  Lock,
  Mail,
  Plus,
  RotateCcw,
  ShieldCheck,
  Unlock,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ConfirmModal } from "../components/modals/ConfirmModal";
import {
  EmployeeBuilderModal,
  RolesModal,
} from "../components/modals/OperationalModals";
import { PageHeader } from "../components/layout/PageHeader";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "@noogym/ui";
import { Button } from "@noogym/ui";
import { Card } from "@noogym/ui";
import { FormCheckbox } from "@noogym/ui";
import { MetricCard } from "@noogym/ui";
import { Select } from "@noogym/ui";
import { StatusDot } from "../components/ui/StatusDot";
import { Table } from "@noogym/ui";
import { Tabs } from "@noogym/ui";
import {
  ListPagination,
  ListToolbar,
  paginateRows,
} from "../components/tables/ListControls";
import { formatKz as money } from "@noogym/core";
import { forgotPasswordWithApi } from "../lib/api";
import { employeeModules, useEmployeesStore } from "../store/employeesStore";
import { toastError, toastSuccess, toastWarning } from "../store/toastStore";
import type { EmployeeRecord } from "@noogym/types";

const tabs = ["Funcionarios", "Funcoes", "Escalas", "Historico", "Relatorios"];

function initials(name?: string) {
  return (
    name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "FN"
  );
}

function parseSalary(value?: string) {
  if (!value) return 0;
  const parsed = Number(
    value
      .replace(/[^\d,.-]/g, "")
      .replace(/\./g, "")
      .replace(",", "."),
  );
  return Number.isFinite(parsed) ? parsed : 0;
}

function statusTone(status?: string) {
  if (status === "Ativo" || status === "Liberado") return "lime";
  if (status === "Licenca" || status === "Convite pendente") return "orange";
  return "red";
}

function fieldLabel(value?: string) {
  return value?.trim() ? value : "Nao definido";
}

function dateLabel(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-AO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export default function Funcionarios() {
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [modal, setModal] = useState<
    "new" | "roles" | "edit" | "deactivate" | null
  >(null);
  const [selected, setSelected] = useState<EmployeeRecord | undefined>();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos os status");
  const [roleFilter, setRoleFilter] = useState("Todas as funcoes");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const employees = useEmployeesStore((state) => state.employees);
  const roles = useEmployeesStore((state) => state.roles);
  const activities = useEmployeesStore((state) => state.activities);
  const setEmployeeStatus = useEmployeesStore(
    (state) => state.setEmployeeStatus,
  );
  const setAccessStatus = useEmployeesStore((state) => state.setAccessStatus);
  const sendInvite = useEmployeesStore((state) => state.sendInvite);
  const resetPassword = useEmployeesStore((state) => state.resetPassword);
  const toggleRolePermission = useEmployeesStore(
    (state) => state.toggleRolePermission,
  );
  const active = selected ?? employees[0];

  const roleOptions = useMemo(
    () => ["Todas as funcoes", ...roles.map((role) => role.name)],
    [roles],
  );
  const filtered = useMemo(
    () =>
      employees.filter((employee) => {
        const text =
          `${employee.name} ${employee.email} ${employee.phone} ${employee.role} ${employee.department ?? ""}`.toLowerCase();
        const matchesQuery = text.includes(query.toLowerCase());
        const matchesStatus =
          statusFilter === "Todos os status" ||
          employee.status === statusFilter;
        const matchesRole =
          roleFilter === "Todas as funcoes" || employee.role === roleFilter;
        return matchesQuery && matchesStatus && matchesRole;
      }),
    [employees, query, roleFilter, statusFilter],
  );
  const pageData = useMemo(
    () => paginateRows(filtered, page, pageSize),
    [filtered, page, pageSize],
  );
  useEffect(() => setPage(1), [pageSize, query, roleFilter, statusFilter]);

  const payroll = employees
    .filter((employee) => employee.status === "Ativo")
    .reduce((sum, employee) => sum + parseSalary(employee.salary), 0);
  const blocked = employees.filter(
    (employee) => employee.accessStatus === "Bloqueado",
  ).length;
  const activeEmployees = employees.filter(
    (employee) => employee.status === "Ativo",
  ).length;

  const blockOrUnblock = (employee?: EmployeeRecord) => {
    if (!employee) return;
    const next =
      employee.accessStatus === "Bloqueado" ? "Liberado" : "Bloqueado";
    setAccessStatus(employee.id, next);
    toastSuccess(next === "Bloqueado" ? "Acesso bloqueado" : "Acesso liberado");
  };

  const handleSendInvite = async (employee?: EmployeeRecord) => {
    if (!employee || invitingId) return;
    setInvitingId(employee.id);
    try {
      const result = await sendInvite(employee.id);
      const targetEmail = employee.accountEmail ?? employee.email;
      if (result.remote && result.emailSent) {
        toastSuccess("Convite enviado", `E-mail enviado para ${targetEmail}.`);
      } else if (result.remote && result.emailQueued) {
        toastSuccess(
          "Convite em fila",
          `O e-mail sera enviado para ${targetEmail}.`,
        );
      } else if (result.remote) {
        toastWarning(
          "Convite registado",
          "A API confirmou o convite, mas o e-mail nao foi entregue.",
        );
      } else {
        toastWarning(
          "Convite registado localmente",
          "Sincronize com a API para enviar o e-mail.",
        );
      }
    } catch (error) {
      toastError(
        "Convite nao enviado",
        error instanceof Error
          ? error.message
          : "Nao foi possivel enviar o convite.",
      );
    } finally {
      setInvitingId(null);
    }
  };

  const handleResetPassword = async (employee?: EmployeeRecord) => {
    if (!employee || resettingId) return;
    const targetEmail = employee.accountEmail ?? employee.email;
    if (!targetEmail?.trim()) {
      toastWarning(
        "E-mail obrigatorio",
        "Este funcionario nao tem e-mail de acesso.",
      );
      return;
    }

    setResettingId(employee.id);
    try {
      await forgotPasswordWithApi(targetEmail);
      resetPassword(employee.id);
      toastSuccess(
        "Recuperacao enviada",
        `E-mail enviado para ${targetEmail}.`,
      );
    } catch (error) {
      toastError(
        "Recuperacao nao enviada",
        error instanceof Error
          ? error.message
          : "Nao foi possivel enviar a recuperacao.",
      );
    } finally {
      setResettingId(null);
    }
  };

  return (
    <div className="page-grid">
      <div className="panel p-6">
        <PageHeader
          title="Funcionarios"
          subtitle="Gerencie colaboradores, cargos, permissoes e acessos."
          actions={
            <>
              <Button
                icon={<KeyRound className="h-4 w-4" />}
                onClick={() => setActiveTab("Funcoes")}
              >
                Funcoes e permissoes
              </Button>
              <Button
                variant="primary"
                icon={<Plus className="h-4 w-4" />}
                onClick={() => {
                  setSelected(undefined);
                  setModal("new");
                }}
              >
                Novo funcionario
              </Button>
            </>
          }
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Funcionarios ativos"
            value={String(activeEmployees)}
            change={`${employees.length} cadastrados`}
            icon={<UsersRound className="h-5 w-5" />}
            tone="green"
          />
          <MetricCard
            title="Folha estimada"
            value={money(payroll)}
            change="Funcionarios ativos"
            icon={<UsersRound className="h-5 w-5" />}
          />
          <MetricCard
            title="Acessos bloqueados"
            value={String(blocked)}
            change="Controle de seguranca"
            icon={<Lock className="h-5 w-5" />}
            tone="red"
          />
          <MetricCard
            title="Funcoes"
            value={String(roles.length)}
            change={`${employeeModules.length} modulos`}
            icon={<ShieldCheck className="h-5 w-5" />}
            tone="purple"
          />
        </div>

        <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

        {activeTab === "Funcionarios" && (
          <div className="space-y-4">
            <ListToolbar
              query={query}
              onQueryChange={setQuery}
              queryPlaceholder="Buscar por nome, e-mail, telefone, funcao..."
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              onClear={() => {
                setQuery("");
                setStatusFilter("Todos os status");
                setRoleFilter("Todas as funcoes");
              }}
            >
              <Select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                {[
                  "Todos os status",
                  "Ativo",
                  "Inativo",
                  "Licenca",
                  "Desligado",
                ].map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </Select>
              <Select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
              >
                {roleOptions.map((role) => (
                  <option key={role}>{role}</option>
                ))}
              </Select>
            </ListToolbar>
            <Table
              columns={[
                "Funcionario",
                "Funcao",
                "Departamento",
                "Turno",
                "Conta",
                "Acesso",
                "Status",
                "Acoes",
              ]}
            >
              {pageData.pageRows.map((employee) => (
                <tr
                  key={employee.id}
                  className="table-row cursor-pointer"
                  onClick={() => setSelected(employee)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar label={initials(employee.name)} />
                      <div>
                        <p>{employee.name}</p>
                        <p className="text-xs text-zinc-400">
                          {employee.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge>{employee.role}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {fieldLabel(employee.department)}
                  </td>
                  <td className="px-4 py-3">{fieldLabel(employee.shift)}</td>
                  <td className="px-4 py-3">
                    <div>
                      <p>{fieldLabel(employee.accountMode)}</p>
                      <p className="text-xs text-zinc-400">
                        {employee.gymScope ?? "Organizacao"}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusDot
                      label={employee.accessStatus ?? "Sem acesso"}
                      tone={statusTone(employee.accessStatus)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <StatusDot
                      label={employee.status}
                      tone={statusTone(employee.status)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div
                      className="flex flex-wrap gap-3"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <button
                        title="Ver detalhes"
                        onClick={() => setSelected(employee)}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        title="Editar"
                        onClick={() => {
                          setSelected(employee);
                          setModal("edit");
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        title="Enviar convite"
                        disabled={invitingId === employee.id}
                        onClick={() => void handleSendInvite(employee)}
                      >
                        <Mail className="h-4 w-4" />
                      </button>
                      <button
                        title="Redefinir senha"
                        disabled={resettingId === employee.id}
                        onClick={() => void handleResetPassword(employee)}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                      <button
                        title={
                          employee.accessStatus === "Bloqueado"
                            ? "Liberar acesso"
                            : "Bloquear acesso"
                        }
                        onClick={() => blockOrUnblock(employee)}
                      >
                        {employee.accessStatus === "Bloqueado" ? (
                          <Unlock className="h-4 w-4" />
                        ) : (
                          <Lock className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        className="text-red-300"
                        title="Desativar"
                        onClick={() => {
                          setSelected(employee);
                          setModal("deactivate");
                        }}
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
            <ListPagination
              page={pageData.page}
              totalPages={pageData.totalPages}
              totalItems={filtered.length}
              start={pageData.start}
              end={pageData.end}
              label="funcionarios"
              onPageChange={setPage}
            />
            {!filtered.length && (
              <p className="rounded-lg border border-white/10 p-6 text-center text-sm text-zinc-400">
                Nenhum funcionario encontrado.
              </p>
            )}
          </div>
        )}

        {activeTab === "Funcoes" && (
          <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
            <div className="space-y-3">
              {roles.map((role) => (
                <Card key={role.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{role.name}</h3>
                      <p className="mt-1 text-sm text-zinc-400">
                        {role.description}
                      </p>
                    </div>
                    <Badge>{`${role.employees} pessoas`}</Badge>
                  </div>
                  <StatusDot
                    label={role.status}
                    tone={role.status === "Ativo" ? "lime" : "gray"}
                  />
                </Card>
              ))}
              <Button className="w-full" onClick={() => setModal("roles")}>
                Abrir modal de funcoes
              </Button>
            </div>
            <Card className="p-5">
              <h2 className="font-semibold">Matriz de permissoes</h2>
              <div className="mt-4 overflow-auto">
                <Table columns={["Modulo", ...roles.map((role) => role.name)]}>
                  {employeeModules.map((module) => (
                    <tr key={module} className="table-row">
                      <td className="px-4 py-3 font-medium">{module}</td>
                      {roles.map((role) => (
                        <td key={role.id} className="px-4 py-3">
                          <FormCheckbox
                            label=""
                            aria-label={`${role.name} ${module}`}
                            checked={role.modules.includes(module)}
                            onChange={() =>
                              toggleRolePermission(role.id, module)
                            }
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </Table>
              </div>
            </Card>
          </div>
        )}

        {activeTab === "Escalas" && (
          <Table
            columns={[
              "Funcionario",
              "Departamento",
              "Turno",
              "Supervisor",
              "Contrato",
              "Status",
            ]}
          >
            {employees.map((employee) => (
              <tr key={employee.id} className="table-row">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar label={initials(employee.name)} />
                    {employee.name}
                  </div>
                </td>
                <td className="px-4 py-3">{fieldLabel(employee.department)}</td>
                <td className="px-4 py-3">{fieldLabel(employee.shift)}</td>
                <td className="px-4 py-3">{fieldLabel(employee.supervisor)}</td>
                <td className="px-4 py-3">
                  {fieldLabel(employee.contractType)}
                </td>
                <td className="px-4 py-3">
                  <StatusDot
                    label={employee.status}
                    tone={statusTone(employee.status)}
                  />
                </td>
              </tr>
            ))}
          </Table>
        )}

        {activeTab === "Historico" && (
          <Table columns={["Data", "Funcionario", "Modulo", "Acao", "Detalhe"]}>
            {activities.slice(0, 80).map((activity) => (
              <tr key={activity.id} className="table-row">
                <td className="px-4 py-3">{activity.dateTime}</td>
                <td className="px-4 py-3">{activity.employeeName}</td>
                <td className="px-4 py-3">
                  <Badge>{activity.module}</Badge>
                </td>
                <td className="px-4 py-3">{activity.action}</td>
                <td className="px-4 py-3 text-zinc-400">
                  {activity.detail ?? "-"}
                </td>
              </tr>
            ))}
          </Table>
        )}

        {activeTab === "Relatorios" && (
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="p-5">
              <h3 className="font-semibold">Departamento maior</h3>
              <p className="mt-4 text-2xl font-bold">
                {employees[0]?.department ?? "Sem dados"}
              </p>
              <p className="mt-2 text-sm text-zinc-400">
                baseado nos funcionarios cadastrados
              </p>
            </Card>
            <Card className="p-5">
              <h3 className="font-semibold">Media salarial</h3>
              <p className="mt-4 text-2xl font-bold">
                {money(activeEmployees ? payroll / activeEmployees : 0)}
              </p>
              <p className="mt-2 text-sm text-zinc-400">funcionarios ativos</p>
            </Card>
            <Card className="p-5">
              <h3 className="font-semibold">Atividades registradas</h3>
              <p className="mt-4 text-2xl font-bold">{activities.length}</p>
              <p className="mt-2 text-sm text-zinc-400">acoes de acesso e RH</p>
            </Card>
            <Card className="p-5 lg:col-span-3">
              <h3 className="mb-4 font-semibold">Funcionarios por funcao</h3>
              <div className="space-y-3">
                {roles.map((role) => {
                  const width = employees.length
                    ? Math.max(8, (role.employees / employees.length) * 100)
                    : 0;
                  return (
                    <div
                      key={role.id}
                      className="grid grid-cols-[190px_1fr_70px] items-center gap-3 text-sm"
                    >
                      <span>{role.name}</span>
                      <span className="h-2 rounded-full bg-white/10">
                        <span
                          className="block h-2 rounded-full bg-noogym-lime"
                          style={{ width: `${width}%` }}
                        />
                      </span>
                      <span className="text-right">{role.employees}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}
      </div>

      <aside className="space-y-3">
        <Card className="p-5">
          <div className="flex items-center gap-4">
            <Avatar
              label={initials(active?.name)}
              className="h-20 w-20 text-lg"
            />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl font-semibold">{active?.name}</h2>
              <p className="text-zinc-400">{active?.role}</p>
              <p className="text-sm">ID: {active?.id}</p>
            </div>
            <Badge>{active?.status}</Badge>
          </div>
          {active ? (
            <div className="mt-5 space-y-4 text-sm">
              {[
                ["E-mail", active.email],
                ["Telefone", active.phone],
                ["Departamento", fieldLabel(active.department)],
                ["Turno", fieldLabel(active.shift)],
                ["Conta", fieldLabel(active.accountMode)],
                ["Email de acesso", fieldLabel(active.accountEmail)],
                ["Escopo", fieldLabel(active.gymScope)],
                ["Admissao", dateLabel(active.hireDate)],
                ["Salario", active.salary],
                ["Acesso", fieldLabel(active.accessStatus)],
                ["Ultimo acesso", fieldLabel(active.lastAccess)],
              ].map(([label, value]) => (
                <p key={label} className="flex justify-between gap-3">
                  <span className="text-zinc-400">{label}</span>
                  <span className="text-right">{value}</span>
                </p>
              ))}
            </div>
          ) : null}
          <div className="mt-5 grid gap-2">
            <Button onClick={() => setModal("edit")} disabled={!active}>
              Editar funcionario
            </Button>
            <Button
              onClick={() => void handleSendInvite(active)}
              disabled={!active || invitingId === active?.id}
            >
              Enviar convite
            </Button>
            <Button onClick={() => blockOrUnblock(active)} disabled={!active}>
              {active?.accessStatus === "Bloqueado"
                ? "Liberar acesso"
                : "Bloquear acesso"}
            </Button>
            <Button
              variant="danger"
              onClick={() => setModal("deactivate")}
              disabled={!active}
            >
              Desativar funcionario
            </Button>
          </div>
        </Card>
      </aside>

      <EmployeeBuilderModal
        open={modal === "new"}
        onClose={() => setModal(null)}
      />
      <EmployeeBuilderModal
        open={modal === "edit"}
        employee={active}
        onClose={() => setModal(null)}
      />
      <RolesModal open={modal === "roles"} onClose={() => setModal(null)} />
      <ConfirmModal
        open={modal === "deactivate"}
        title="Desativar funcionario"
        message="O funcionario perdera acesso ao sistema, mas o cadastro permanecera no historico."
        confirmLabel="Desativar funcionario"
        danger
        onClose={() => setModal(null)}
        onConfirm={() => {
          if (active) setEmployeeStatus(active.id, "Inativo");
          toastSuccess("Funcionario desativado com sucesso");
          setModal(null);
        }}
      />
    </div>
  );
}
