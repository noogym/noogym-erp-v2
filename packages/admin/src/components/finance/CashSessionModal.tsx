import { useEffect, useState } from "react";
import { Button, FormInput, FormTextarea, Modal } from "@noogym/ui";
import type { CashSessionRecord, CloseCashSessionPayload, OpenCashSessionPayload } from "../../lib/financeApi";

type Mode = "open" | "close";

export function CashSessionModal({
  mode,
  session,
  open,
  onClose,
  onOpenSession,
  onCloseSession
}: {
  mode: Mode;
  session: CashSessionRecord | null;
  open: boolean;
  onClose: () => void;
  onOpenSession: (payload: OpenCashSessionPayload) => Promise<void>;
  onCloseSession: (id: string, payload: CloseCashSessionPayload) => Promise<void>;
}) {
  const [openingAmount, setOpeningAmount] = useState("0");
  const [notes, setNotes] = useState("");
  const [actualCash, setActualCash] = useState("0");
  const [actualCard, setActualCard] = useState("0");
  const [actualTransfer, setActualTransfer] = useState("0");
  const [actualMulticaixa, setActualMulticaixa] = useState("0");
  const [actualPix, setActualPix] = useState("0");
  const [actualOther, setActualOther] = useState("0");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNotes("");
    if (mode === "open") {
      setOpeningAmount("0");
      return;
    }
    setActualCash(String(Math.max(0, Math.round(session?.expected.cash ?? 0))));
    setActualCard(String(Math.max(0, Math.round(session?.expected.card ?? 0))));
    setActualTransfer(String(Math.max(0, Math.round(session?.expected.transfer ?? 0))));
    setActualMulticaixa(String(Math.max(0, Math.round(session?.expected.multicaixa ?? 0))));
    setActualPix(String(Math.max(0, Math.round(session?.expected.pix ?? 0))));
    setActualOther(String(Math.max(0, Math.round(session?.expected.other ?? 0))));
  }, [mode, open, session]);

  const actualTotal = [actualCash, actualCard, actualTransfer, actualMulticaixa, actualPix, actualOther].reduce((total, value) => total + numeric(value), 0);
  const expectedTotal = session?.expected.total ?? 0;
  const difference = actualTotal - expectedTotal;

  const confirm = async () => {
    setSaving(true);
    try {
      if (mode === "open") {
        await onOpenSession({ openingAmount: numeric(openingAmount), notes: notes.trim() || undefined });
      } else if (session) {
        await onCloseSession(session.id, {
          actualCash: numeric(actualCash),
          actualCard: numeric(actualCard),
          actualTransfer: numeric(actualTransfer),
          actualMulticaixa: numeric(actualMulticaixa),
          actualPix: numeric(actualPix),
          actualOther: numeric(actualOther),
          notes: notes.trim() || undefined
        });
      }
      onClose();
    } catch {
      // The page-level handler already shows the user-facing message.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={mode === "open" ? "Abrir caixa" : "Fechar caixa"}
      description={mode === "open" ? "Informe o valor inicial disponível no caixa." : "Confira os valores esperados e informe o valor contado."}
      size="lg"
      onClose={onClose}
      footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={confirm} disabled={saving || (mode === "close" && !session)}>{saving ? "A guardar..." : mode === "open" ? "Abrir caixa" : "Fechar caixa"}</Button></>}
    >
      {mode === "open" ? (
        <div className="grid gap-4">
          <FormInput label="Valor inicial em caixa" type="number" min="0" value={openingAmount} onChange={(event) => setOpeningAmount(event.target.value)} />
          <FormTextarea label="Observacao" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Ex: abertura do turno da manha" />
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <Summary label="Aberto em" value={session?.openedAt ? new Date(session.openedAt).toLocaleString("pt-AO") : "-"} />
              <Summary label="Esperado" value={money(expectedTotal)} tone="lime" />
              <Summary label="Diferenca" value={signedMoney(difference)} tone={difference === 0 ? "muted" : difference > 0 ? "lime" : "red"} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <AmountField label="Dinheiro" expected={session?.expected.cash ?? 0} value={actualCash} onChange={setActualCash} />
            <AmountField label="Cartao" expected={session?.expected.card ?? 0} value={actualCard} onChange={setActualCard} />
            <AmountField label="Transferencia" expected={session?.expected.transfer ?? 0} value={actualTransfer} onChange={setActualTransfer} />
            <AmountField label="Multicaixa" expected={session?.expected.multicaixa ?? 0} value={actualMulticaixa} onChange={setActualMulticaixa} />
            <AmountField label="PIX" expected={session?.expected.pix ?? 0} value={actualPix} onChange={setActualPix} />
            <AmountField label="Outros" expected={session?.expected.other ?? 0} value={actualOther} onChange={setActualOther} />
          </div>
          <FormTextarea label="Observacao do fecho" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Ex: quebra, sobra, justificativa operacional" />
        </div>
      )}
    </Modal>
  );
}

function AmountField({ label, expected, value, onChange }: { label: string; expected: number; value: string; onChange: (value: string) => void }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
      <FormInput label={`${label} contado`} type="number" min="0" value={value} onChange={(event) => onChange(event.target.value)} />
      <p className="mt-2 text-xs text-zinc-400">Esperado: <span className="text-noogym-lime">{money(expected)}</span></p>
    </div>
  );
}

function Summary({ label, value, tone = "muted" }: { label: string; value: string; tone?: "lime" | "red" | "muted" }) {
  const toneClass = tone === "lime" ? "text-noogym-lime" : tone === "red" ? "text-red-400" : "text-zinc-100";
  return (
    <div>
      <p className="text-xs text-zinc-400">{label}</p>
      <p className={`mt-1 font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function numeric(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function money(value: number) {
  return `${Math.round(value).toLocaleString("pt-AO")} Kz`;
}

function signedMoney(value: number) {
  return `${value >= 0 ? "+" : "-"}${money(Math.abs(value))}`;
}
