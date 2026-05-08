import { AlertTriangle } from "lucide-react";
import { Button } from "../ui/Button";
import { Modal } from "./Modal";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  details?: React.ReactNode;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmModal({ open, title, message, confirmLabel, danger, details, onClose, onConfirm }: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      title={title}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      <div className="text-center">
        <span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${danger ? "bg-orange-500/15 text-orange-400" : "bg-noogym-lime/15 text-noogym-lime"}`}>
          <AlertTriangle className="h-9 w-9" />
        </span>
        <p className="mx-auto mt-5 max-w-md text-zinc-100">{message}</p>
        {details ? <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-left">{details}</div> : null}
      </div>
    </Modal>
  );
}
