import { CreditCard, Eye, MessageSquare, Pencil, Power, RotateCcw } from "lucide-react";
import { ActionButton } from "../ui/ActionButton";

export function TableActions({
  onView,
  onEdit,
  onMessage,
  onPayment,
  onHistory,
  onDeactivate,
}: {
  onView?: () => void;
  onEdit?: () => void;
  onMessage?: () => void;
  onPayment?: () => void;
  onHistory?: () => void;
  onDeactivate?: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {onView ? <ActionButton title="Ver detalhes" icon={<Eye className="h-4 w-4" />} onClick={onView} /> : null}
      {onEdit ? <ActionButton title="Editar" icon={<Pencil className="h-4 w-4" />} onClick={onEdit} /> : null}
      {onMessage ? <ActionButton title="Enviar mensagem" icon={<MessageSquare className="h-4 w-4" />} onClick={onMessage} /> : null}
      {onPayment ? <ActionButton title="Registrar pagamento" icon={<CreditCard className="h-4 w-4" />} className="hover:text-green-300" onClick={onPayment} /> : null}
      {onHistory ? <ActionButton title="Historico" icon={<RotateCcw className="h-4 w-4" />} onClick={onHistory} /> : null}
      {onDeactivate ? <ActionButton title="Desativar" icon={<Power className="h-4 w-4" />} className="hover:text-red-300" onClick={onDeactivate} /> : null}
    </div>
  );
}
