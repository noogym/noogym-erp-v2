import { useState } from "react";
import { ArrowLeft, BarChart3, CheckCircle2, Clock, Lock, Mail, ShieldCheck } from "lucide-react";
import { AuthInput } from "../../components/auth/AuthInput";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { forgotPasswordWithApi } from "../../lib/api";
import { useAppStore } from "../../store/appStore";

interface ForgotPasswordProps {
  onNavigateToLogin: () => void;
}

export default function ForgotPassword({ onNavigateToLogin }: ForgotPasswordProps) {
  const onlineOnly = useAppStore((state) => state.onlineOnly);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim()) {
      setError("Informe o e-mail cadastrado.");
      setEmailSent(false);
      return;
    }

    setIsLoading(true);
    try {
      if (onlineOnly) await forgotPasswordWithApi(email);
      setError("");
      setEmailSent(true);
    } catch (apiError) {
      setEmailSent(false);
      setError(apiError instanceof Error ? apiError.message : "Nao foi possivel enviar as instrucoes.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      headline={
        <>
          Recupere o acesso
          <br />
          <span className="text-noogym-lime">com seguranca.</span>
        </>
      }
      description="Enviaremos as instrucoes para redefinir sua senha e proteger sua conta Noogym."
      features={[
        {
          icon: <Mail className="h-9 w-9" />,
          title: "Verificacao por e-mail",
          description: "Use o e-mail vinculado ao administrador da academia."
        },
        {
          icon: <ShieldCheck className="h-9 w-9" />,
          title: "Conta protegida",
          description: "A redefinicao mantem seus dados e permissoes seguros."
        },
        {
          icon: <Clock className="h-9 w-9" />,
          title: "Processo rapido",
          description: "Receba orientacoes e volte ao sistema em poucos minutos."
        },
        {
          icon: <BarChart3 className="h-9 w-9" />,
          title: "Operacao sem perda",
          description: "Seu dashboard e dados locais continuam preservados."
        }
      ]}
      footer={
        <div className="space-y-4">
          <p>© 2026 Noogym. Todos os direitos reservados.</p>
          <p className="font-semibold text-noogym-lime">www.noogym.com</p>
        </div>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <button
          type="button"
          className="no-drag mb-8 inline-flex items-center gap-2 text-sm font-medium text-zinc-300 transition hover:text-noogym-lime 2xl:mb-12"
          onClick={onNavigateToLogin}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para login
        </button>

        <div className="mb-7 2xl:mb-12">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-lg border border-noogym-lime/45 bg-noogym-lime/10 text-noogym-lime shadow-glow">
            <Lock className="h-7 w-7" />
          </div>
          <h2 className="text-3xl font-black tracking-normal text-white 2xl:text-4xl">Esqueci minha senha</h2>
          <p className="mt-3 text-base leading-7 text-zinc-400 2xl:mt-4 2xl:text-xl 2xl:leading-8">
            Informe seu e-mail para receber as instrucoes de recuperacao da conta.
          </p>
        </div>

        {emailSent ? (
          <div className="mb-6 rounded-lg border border-noogym-lime/40 bg-noogym-lime/10 p-4 text-sm leading-6 text-zinc-100">
            <div className="mb-2 flex items-center gap-2 font-semibold text-noogym-lime">
              <CheckCircle2 className="h-5 w-5" />
              Instrucoes enviadas
            </div>
            Verifique a caixa de entrada de <span className="font-semibold text-white">{email}</span>. Se o e-mail estiver cadastrado,
            voce recebera o link de redefinicao em instantes.
          </div>
        ) : null}

        <AuthInput
          label="E-mail"
          icon={Mail}
          type="email"
          value={email}
          error={error}
          placeholder="seu@email.com"
          autoComplete="email"
          onChange={(event) => {
            setEmail(event.target.value);
            if (error) setError("");
          }}
        />

        <button
          type="submit"
          disabled={isLoading}
          className="no-drag mt-7 h-12 w-full rounded-lg bg-noogym-lime text-base font-bold text-black shadow-glow transition hover:bg-noogym-lime2 disabled:cursor-not-allowed disabled:opacity-70 sm:h-14 sm:text-lg 2xl:mt-10 2xl:h-[72px] 2xl:text-xl"
        >
          {isLoading ? "A enviar..." : "Enviar instrucoes"}
        </button>

        <p className="mt-7 text-center text-base text-zinc-400 2xl:mt-10 2xl:text-lg">
          Lembrou sua senha?{" "}
          <button type="button" className="no-drag font-medium text-noogym-lime transition hover:text-white" onClick={onNavigateToLogin}>
            Fazer login
          </button>
        </p>
      </form>
    </AuthLayout>
  );
}
